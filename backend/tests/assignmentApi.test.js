const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const mongoUri = process.env.TEST_MONGO_URI;
const testSecret = 'assignment-api-test-secret';
process.env.JWT_SECRET = testSecret;

if (!mongoUri) {
  test('assignment API integration (set TEST_MONGO_URI to an isolated *_test database)', { skip: true }, () => {});
} else {
  const databaseName = new URL(mongoUri).pathname.replace(/^\/+/, '').split('/')[0];
  if (!databaseName.endsWith('_test')) {
    throw new Error('TEST_MONGO_URI must use an isolated database whose name ends in _test');
  }

  const User = require('../models/User');
  const Course = require('../models/Course');
  const Assignment = require('../models/Assignment');
  const AssignmentSubmission = require('../models/AssignmentSubmission');
  const assignmentRoutes = require('../routes/assignmentRoutes');
  const { errorHandler } = require('../middleware/error');

  test('assignment API lifecycle, file access, deadlines, evaluation, and permissions', async (t) => {
    let mainAssignmentId;
    await mongoose.connect(mongoUri);
    const app = express();
    app.use(express.json());
    app.use('/api/assignments', assignmentRoutes);
    app.use(errorHandler);
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/assignments`;
    t.after(async () => {
      await new Promise((resolve) => server.close(resolve));
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    });

    const teacher = await User.create({ name: 'Teacher', email: 'teacher@test.invalid', password: 'password1', role: 'teacher' });
    const otherTeacher = await User.create({ name: 'Other Teacher', email: 'other@test.invalid', password: 'password1', role: 'teacher' });
    const student = await User.create({ name: 'Student', email: 'student@test.invalid', password: 'password1', role: 'student' });
    const outsider = await User.create({ name: 'Outsider', email: 'outsider@test.invalid', password: 'password1', role: 'student' });
    const course = await Course.create({ title: 'Course', description: 'Test course', createdBy: teacher._id });
    const sameTeacherCourse = await Course.create({ title: 'Second Course', description: 'Second course', createdBy: teacher._id });
    const otherCourse = await Course.create({ title: 'Other Course', description: 'Other course', createdBy: otherTeacher._id });
    student.enrollments.push({ course: course._id });
    await student.save();

    const tokenFor = (user) => jwt.sign({ id: String(user._id) }, testSecret);
    const call = async (path, { user, method = 'GET', body } = {}) => {
      const headers = {};
      if (user) headers.Authorization = `Bearer ${tokenFor(user)}`;
      const isForm = body && typeof FormData !== 'undefined' && body instanceof FormData;
      if (body && !isForm) headers['Content-Type'] = 'application/json';
      return fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
      });
    };
    const json = (response) => response.json();
    const upload = (user, assignmentId, name = 'work.pdf', content = '%PDF-1.4\nassignment', type = 'application/pdf') => {
      const form = new FormData();
      form.append('file', new Blob([content], { type }), name);
      return call(`/${assignmentId}/submissions`, { user, method: 'POST', body: form });
    };
    const createAssignment = (user, values = {}) =>
      call('', {
        user,
        method: 'POST',
        body: {
          courseId: String(course._id),
          title: 'Project',
          description: 'Complete the project',
          instructions: 'Upload your final work.',
          references: [{ label: 'Guide', url: 'https://example.test/guide' }],
          dueAt: new Date(Date.now() + 60 * 60_000).toISOString(),
          maxMarks: 20,
          ...values,
        },
      });

    await t.test('creates and edits assignments with owned courses', async () => {
      assert.equal((await call('')).status, 401);
      assert.equal((await createAssignment(student)).status, 403);
      assert.equal((await createAssignment(otherTeacher, { courseId: String(course._id) })).status, 403);

      const created = await createAssignment(teacher);
      assert.equal(created.status, 201);
      const assignment = await json(created);
      mainAssignmentId = assignment._id;
      assert.equal(assignment.course._id, String(course._id));
      assert.equal(assignment.maxMarks, 20);
      assert.equal(assignment.references[0].url, 'https://example.test/guide');

      const updated = await call(`/${assignment._id}`, {
        user: teacher,
        method: 'PUT',
        body: { title: 'Updated project', maxMarks: 25, allowLateSubmissions: true },
      });
      assert.equal(updated.status, 200);
      assert.equal((await json(updated)).title, 'Updated project');
      assert.equal((await call(`/${assignment._id}`, { user: otherTeacher, method: 'PUT', body: { title: 'Not yours' } })).status, 403);
      assert.equal((await call(`/${assignment._id}`, { user: outsider })).status, 403);

      const listed = await call('', { user: student });
      assert.equal((await json(listed))[0].status, 'pending');
      return assignment;
    });

    await t.test('validates uploads, controls access, supports resubmission, and evaluates marks', async () => {
      const assignment = await Assignment.findOne({ teacher: teacher._id });
      assert.ok(assignment);
      assert.equal((await upload(outsider, assignment._id)).status, 403);
      assert.equal((await upload(student, assignment._id, 'payload.exe', 'not executable', 'application/octet-stream')).status, 400);
      assert.equal((await upload(student, assignment._id, 'broken.pdf', 'not a pdf')).status, 400);

      const tooLarge = await upload(student, assignment._id, 'large.pdf', Buffer.alloc(10 * 1024 * 1024 + 1), 'application/pdf');
      assert.equal(tooLarge.status, 413);

      const submitted = await upload(student, assignment._id);
      assert.equal(submitted.status, 201);
      const firstSubmission = await json(submitted);
      assert.equal(firstSubmission.status, 'submitted');
      assert.equal((await call(`/${assignment._id}/submissions/me/file`, { user: outsider })).status, 404);
      assert.equal((await call(`/${assignment._id}/submissions/${firstSubmission._id}/file`, { user: student })).status, 403);

      const teacherList = await call(`/${assignment._id}/submissions`, { user: teacher });
      assert.equal(teacherList.status, 200);
      const submissions = await json(teacherList);
      assert.equal(submissions.length, 1);
      assert.equal(submissions[0].file.name, 'work.pdf');
      assert.equal(Object.prototype.hasOwnProperty.call(submissions[0].file, 'data'), false);

      const download = await call(`/${assignment._id}/submissions/${firstSubmission._id}/file`, { user: teacher });
      assert.equal(download.status, 200);
      assert.equal(await download.text(), '%PDF-1.4\nassignment');
      assert.match(download.headers.get('content-disposition'), /filename\*=UTF-8''work.pdf/);

      const overMarks = await call(`/${assignment._id}/submissions/${firstSubmission._id}/evaluate`, {
        user: teacher,
        method: 'PATCH',
        body: { marks: 26, feedback: 'Too many' },
      });
      assert.equal(overMarks.status, 400);
      const forbiddenEvaluation = await call(`/${assignment._id}/submissions/${firstSubmission._id}/evaluate`, {
        user: otherTeacher,
        method: 'PATCH',
        body: { marks: 18 },
      });
      assert.equal(forbiddenEvaluation.status, 403);

      const evaluated = await call(`/${assignment._id}/submissions/${firstSubmission._id}/evaluate`, {
        user: teacher,
        method: 'PATCH',
        body: { marks: 18, feedback: 'Well done' },
      });
      assert.equal(evaluated.status, 200);
      assert.equal((await json(evaluated)).status, 'evaluated');
      const lowerMaximum = await call(`/${assignment._id}`, {
        user: teacher,
        method: 'PUT',
        body: { maxMarks: 17 },
      });
      assert.equal(lowerMaximum.status, 400);

      const studentView = await call(`/${assignment._id}`, { user: student });
      const studentAssignment = await json(studentView);
      assert.equal(studentAssignment.submission.marks, 18);
      assert.equal(studentAssignment.submission.feedback, 'Well done');

      const resubmission = await upload(student, assignment._id, 'final.pdf');
      assert.equal(resubmission.status, 200);
      assert.equal((await json(resubmission)).status, 'submitted');
      const saved = await AssignmentSubmission.findOne({ assignment: assignment._id, student: student._id });
      assert.equal(saved.marks, null);
      assert.equal(saved.feedback, '');
      assert.equal((await Assignment.findById(assignment._id)).maxMarks, 25);
    });

    await t.test('enforces deadlines and resubmission settings', async () => {
      const lateAssignmentResponse = await createAssignment(teacher, {
        title: 'Late work',
        dueAt: new Date(Date.now() - 60_000).toISOString(),
        allowLateSubmissions: true,
      });
      const lateAssignment = await json(lateAssignmentResponse);
      const lateSubmission = await upload(student, lateAssignment._id);
      assert.equal(lateSubmission.status, 201);
      assert.equal((await json(lateSubmission)).status, 'late');

      const closedResponse = await createAssignment(teacher, {
        title: 'Closed work',
        dueAt: new Date(Date.now() - 60_000).toISOString(),
      });
      const closedAssignment = await json(closedResponse);
      assert.equal((await upload(student, closedAssignment._id)).status, 400);

      const singleResponse = await createAssignment(teacher, { title: 'Single attempt', allowResubmissions: false });
      const singleAssignment = await json(singleResponse);
      assert.equal((await upload(student, singleAssignment._id)).status, 201);
      assert.equal((await upload(student, singleAssignment._id, 'second.pdf')).status, 409);

      const blockedCourseChange = await call(`/${lateAssignment._id}`, {
        user: teacher,
        method: 'PUT',
        body: { courseId: String(otherCourse._id) },
      });
      assert.equal(blockedCourseChange.status, 403);
      const submittedAssignment = await Assignment.findOne({ title: 'Late work', teacher: teacher._id });
      const blockedAfterSubmission = await call(`/${submittedAssignment._id}`, {
        user: teacher,
        method: 'PUT',
        body: { courseId: String(sameTeacherCourse._id) },
      });
      assert.equal(blockedAfterSubmission.status, 409);
    });

    await t.test('deletes assignments and private submissions for the owner only', async () => {
      const assignment = await Assignment.findById(mainAssignmentId);
      const otherAssignment = await createAssignment(teacher, { title: 'Delete target' });
      const target = await json(otherAssignment);
      assert.equal((await upload(student, target._id)).status, 201);
      assert.equal((await call(`/${target._id}`, { user: otherTeacher, method: 'DELETE' })).status, 403);
      assert.equal((await call(`/${target._id}`, { user: teacher, method: 'DELETE' })).status, 200);
      assert.equal(await Assignment.findById(target._id), null);
      assert.equal(await AssignmentSubmission.findOne({ assignment: target._id }), null);

      const file = await call(`/${assignment._id}/submissions/me/file`, { user: student });
      assert.equal(file.status, 200);
      const privateList = await call(`/${assignment._id}/submissions`, { user: outsider });
      assert.equal(privateList.status, 403);
    });
  });
}
