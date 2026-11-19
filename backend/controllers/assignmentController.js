const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Course = require('../models/Course');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const {
  canManageAssignment,
  submissionStatus,
  validateAssignmentInput,
  validateSubmissionFile,
} = require('../utils/assignment');

const isEnrolled = (user, courseId) =>
  (user.enrollments || []).some((enrollment) => String(enrollment.course) === String(courseId));

const serializeSubmission = (submission, dueAt, includeStudent = false) => {
  if (!submission) return null;
  return {
    _id: submission._id,
    student: includeStudent ? submission.student : undefined,
    file: {
      name: submission.file.originalName,
      mimeType: submission.file.mimeType,
      size: submission.file.size,
    },
    submittedAt: submission.submittedAt,
    status: submissionStatus(submission, dueAt),
    marks: submission.marks,
    feedback: submission.feedback,
    evaluatedAt: submission.evaluatedAt,
  };
};

const serializeAssignment = (assignment) => ({
  _id: assignment._id,
  course: assignment.course,
  teacher: assignment.teacher,
  title: assignment.title,
  description: assignment.description,
  instructions: assignment.instructions,
  references: assignment.references,
  dueAt: assignment.dueAt,
  maxMarks: assignment.maxMarks,
  allowLateSubmissions: assignment.allowLateSubmissions,
  allowResubmissions: assignment.allowResubmissions,
  createdAt: assignment.createdAt,
  updatedAt: assignment.updatedAt,
});

const requireManager = (user, assignment) => {
  if (!canManageAssignment(user, assignment)) throw new ApiError(403, 'You can only manage assignments for your courses');
};

const findAccessibleAssignment = async (user, assignmentId) => {
  const assignment = await Assignment.findById(assignmentId).populate('course', 'title createdBy');
  if (!assignment) throw new ApiError(404, 'Assignment not found');
  if (!assignment.course) throw new ApiError(404, 'Course not found');
  if (user.role === 'student' && !isEnrolled(user, assignment.course._id)) {
    throw new ApiError(403, 'Enrol in this course to view its assignments');
  }
  if (user.role !== 'student') requireManager(user, assignment);
  return assignment;
};

const findCourseForTeacher = async (user, courseId) => {
  if (!courseId) throw new ApiError(400, 'Course is required');
  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, 'Course not found');
  if (user.role !== 'admin' && String(course.createdBy) !== String(user._id)) {
    throw new ApiError(403, 'You can only assign work to your own courses');
  }
  return course;
};

// GET /api/assignments
exports.listAssignments = asyncHandler(async (req, res) => {
  if (req.user.role === 'student') {
    const courseIds = (req.user.enrollments || []).map((enrollment) => enrollment.course);
    const assignments = await Assignment.find({ course: { $in: courseIds } })
      .populate('course', 'title')
      .sort({ dueAt: 1, createdAt: -1 })
      .lean();
    const submissions = await AssignmentSubmission.find({
      student: req.user._id,
      assignment: { $in: assignments.map((assignment) => assignment._id) },
    }).lean();
    const byAssignment = new Map(submissions.map((submission) => [String(submission.assignment), submission]));
    return res.json(
      assignments.map((assignment) => ({
        ...serializeAssignment(assignment),
        submission: serializeSubmission(byAssignment.get(String(assignment._id)), assignment.dueAt),
        status: submissionStatus(byAssignment.get(String(assignment._id)), assignment.dueAt),
      }))
    );
  }

  const filter = req.user.role === 'admin' ? {} : { teacher: req.user._id };
  const assignments = await Assignment.find(filter)
    .populate('course', 'title')
    .sort({ dueAt: 1, createdAt: -1 })
    .lean();
  const counts = await Promise.all(
    assignments.map((assignment) => AssignmentSubmission.countDocuments({ assignment: assignment._id }))
  );
  res.json(
    assignments.map((assignment, index) => ({
      ...serializeAssignment(assignment),
      submissionCount: counts[index],
    }))
  );
});

// GET /api/assignments/:id
exports.getAssignment = asyncHandler(async (req, res) => {
  const assignment = await findAccessibleAssignment(req.user, req.params.id);
  const result = serializeAssignment(assignment);
  if (req.user.role === 'student') {
    const submission = await AssignmentSubmission.findOne({
      assignment: assignment._id,
      student: req.user._id,
    }).lean();
    result.submission = serializeSubmission(submission, assignment.dueAt);
    result.status = submissionStatus(submission, assignment.dueAt);
  }
  res.json(result);
});

// POST /api/assignments
exports.createAssignment = asyncHandler(async (req, res) => {
  const course = await findCourseForTeacher(req.user, req.body.courseId);
  const input = validateAssignmentInput(req.body);
  const assignment = await Assignment.create({
    ...input,
    course: course._id,
    teacher: req.user._id,
  });
  await assignment.populate('course', 'title');
  res.status(201).json(serializeAssignment(assignment));
});

// PUT /api/assignments/:id
exports.updateAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) throw new ApiError(404, 'Assignment not found');
  requireManager(req.user, assignment);

  const input = validateAssignmentInput(req.body, true);
  let course = null;
  if (req.body.courseId !== undefined) {
    course = await findCourseForTeacher(req.user, req.body.courseId);
    if (String(course._id) !== String(assignment.course)) {
      const hasSubmissions = await AssignmentSubmission.exists({ assignment: assignment._id });
      if (hasSubmissions) throw new ApiError(409, 'The course cannot be changed after students have submitted');
    }
  }

  if (input.maxMarks !== undefined) {
    const highestMarks = await AssignmentSubmission.findOne({ assignment: assignment._id, marks: { $ne: null } })
      .sort({ marks: -1 })
      .select('marks')
      .lean();
    if (highestMarks && input.maxMarks < highestMarks.marks) {
      throw new ApiError(400, 'Maximum marks cannot be lower than marks already awarded');
    }
  }

  Object.assign(assignment, input);
  if (course) assignment.course = course._id;
  await assignment.save();
  await assignment.populate('course', 'title');
  res.json(serializeAssignment(assignment));
});

// DELETE /api/assignments/:id
exports.deleteAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) throw new ApiError(404, 'Assignment not found');
  requireManager(req.user, assignment);
  await Promise.all([
    assignment.deleteOne(),
    AssignmentSubmission.deleteMany({ assignment: assignment._id }),
  ]);
  res.json({ message: 'Assignment and submissions deleted' });
});

// GET /api/assignments/:id/submissions
exports.listSubmissions = asyncHandler(async (req, res) => {
  const assignment = await findAccessibleAssignment(req.user, req.params.id);
  const submissions = await AssignmentSubmission.find({ assignment: assignment._id })
    .populate('student', 'name email')
    .sort({ submittedAt: -1 })
    .lean();
  res.json(submissions.map((submission) => serializeSubmission(submission, assignment.dueAt, true)));
});

// POST /api/assignments/:id/submissions
exports.submitAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) throw new ApiError(404, 'Assignment not found');
  if (!isEnrolled(req.user, assignment.course)) throw new ApiError(403, 'Enrol in this course to submit this assignment');

  const submittedAt = new Date();
  const isLate = submittedAt > assignment.dueAt;
  if (isLate && !assignment.allowLateSubmissions) throw new ApiError(400, 'The submission deadline has passed');

  const existing = await AssignmentSubmission.findOne({ assignment: assignment._id, student: req.user._id });
  if (existing && !assignment.allowResubmissions) throw new ApiError(409, 'Resubmissions are not allowed for this assignment');

  const file = validateSubmissionFile(req.file);
  const submission = existing || new AssignmentSubmission({ assignment: assignment._id, student: req.user._id });
  submission.file = file;
  submission.submittedAt = submittedAt;
  submission.marks = null;
  submission.feedback = '';
  submission.evaluatedAt = null;
  submission.evaluatedBy = null;
  await submission.save();
  res.status(existing ? 200 : 201).json(serializeSubmission(submission, assignment.dueAt));
});

// PATCH /api/assignments/:id/submissions/:submissionId/evaluate
exports.evaluateSubmission = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) throw new ApiError(404, 'Assignment not found');
  requireManager(req.user, assignment);

  if (req.body.marks === undefined || req.body.marks === null || req.body.marks === '') {
    throw new ApiError(400, 'Marks are required');
  }
  const marks = Number(req.body.marks);
  if (!Number.isFinite(marks) || marks < 0 || marks > assignment.maxMarks) {
    throw new ApiError(400, `Marks must be between 0 and ${assignment.maxMarks}`);
  }
  if (req.body.feedback !== undefined && (typeof req.body.feedback !== 'string' || req.body.feedback.length > 5000)) {
    throw new ApiError(400, 'Feedback must be 5000 characters or fewer');
  }

  const submission = await AssignmentSubmission.findOne({
    _id: req.params.submissionId,
    assignment: assignment._id,
  }).populate('student', 'name email');
  if (!submission) throw new ApiError(404, 'Submission not found');
  submission.marks = marks;
  submission.feedback = (req.body.feedback || '').trim();
  submission.evaluatedAt = new Date();
  submission.evaluatedBy = req.user._id;
  await submission.save();
  res.json(serializeSubmission(submission, assignment.dueAt, true));
});

const sendSubmissionFile = (res, submission) => {
  const encodedName = encodeURIComponent(submission.file.originalName).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
  res.set({
    'Content-Type': submission.file.mimeType,
    'Content-Length': submission.file.size,
    'Content-Disposition': `attachment; filename*=UTF-8''${encodedName}`,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
  });
  res.send(submission.file.data);
};

// GET /api/assignments/:id/submissions/me/file
exports.downloadOwnSubmission = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) throw new ApiError(404, 'Assignment not found');
  const submission = await AssignmentSubmission.findOne({
    assignment: assignment._id,
    student: req.user._id,
  }).select('+file.data');
  if (!submission) throw new ApiError(404, 'Submission not found');
  sendSubmissionFile(res, submission);
});

// GET /api/assignments/:id/submissions/:submissionId/file
exports.downloadSubmission = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) throw new ApiError(404, 'Assignment not found');
  requireManager(req.user, assignment);
  const submission = await AssignmentSubmission.findOne({
    _id: req.params.submissionId,
    assignment: assignment._id,
  }).select('+file.data');
  if (!submission) throw new ApiError(404, 'Submission not found');
  sendSubmissionFile(res, submission);
});
