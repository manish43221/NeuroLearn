const Course = require('../models/Course');
const Quiz = require('../models/Quiz');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const toArray = (v) =>
  Array.isArray(v) ? v.map((s) => String(s).trim()).filter(Boolean) : String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

const findEnrollment = (user, courseId) => user.enrollments.find((e) => String(e.course) === String(courseId));

const progressOf = (course, enrollment) => {
  const total = course.lessons?.length || 0;
  if (!total || !enrollment) return { completedCount: 0, totalLessons: total, progress: 0 };
  const ids = new Set(course.lessons.map((l) => String(l._id)));
  const done = enrollment.completedLessons.filter((id) => ids.has(String(id))).length;
  return { completedCount: done, totalLessons: total, progress: Math.round((done / total) * 100) };
};

const canModify = (user, course) => user.role === 'admin' || String(course.createdBy) === String(user._id);

// GET /api/courses?search=&category=&difficulty=&mine=true
exports.getCourses = asyncHandler(async (req, res) => {
  const { search, category, difficulty, mine } = req.query;
  const filter = {};
  if (search) {
    const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: rx }, { description: rx }, { topics: rx }];
  }
  if (category) filter.category = category;
  if (difficulty) filter.difficulty = difficulty;
  if (mine === 'true' && req.user.role !== 'admin') filter.createdBy = req.user._id;

  const courses = await Course.find(filter).select('-lessons.content').populate('createdBy', 'name').sort('-createdAt').lean();
  const enrolled = new Set(req.user.enrollments.map((e) => String(e.course)));
  res.json(
    courses.map((c) => ({ ...c, lessonCount: c.lessons.length, lessons: undefined, enrolled: enrolled.has(String(c._id)) }))
  );
});

// GET /api/courses/categories
exports.getCategories = asyncHandler(async (req, res) => {
  res.json(await Course.distinct('category'));
});

// GET /api/courses/my  -> enrolled courses with progress
exports.getMyCourses = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({ path: 'enrollments.course', select: '-lessons.content', populate: { path: 'createdBy', select: 'name' } });
  const list = user.enrollments
    .filter((e) => e.course)
    .map((e) => ({ course: e.course, enrolledAt: e.enrolledAt, ...progressOf(e.course, e) }));
  res.json(list);
});

// GET /api/courses/:id
exports.getCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id).populate('createdBy', 'name');
  if (!course) throw new ApiError(404, 'Course not found');
  const enrollment = findEnrollment(req.user, course._id);
  res.json({
    course,
    enrollment: enrollment
      ? { enrolled: true, completedLessons: enrollment.completedLessons, ...progressOf(course, enrollment) }
      : { enrolled: false, completedLessons: [], progress: 0 },
  });
});

// POST /api/courses   (teacher/admin)
exports.createCourse = asyncHandler(async (req, res) => {
  const { title, description, category, difficulty, topics, lessons } = req.body;
  const course = await Course.create({
    title, description, category, difficulty,
    topics: toArray(topics),
    lessons: Array.isArray(lessons) ? lessons : [],
    createdBy: req.user._id,
  });
  res.status(201).json(course);
});

// PUT /api/courses/:id   (owner/admin)
exports.updateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found');
  if (!canModify(req.user, course)) throw new ApiError(403, 'You can only edit your own courses');

  const { title, description, category, difficulty, topics, lessons } = req.body;
  if (title !== undefined) course.title = title;
  if (description !== undefined) course.description = description;
  if (category !== undefined) course.category = category;
  if (difficulty !== undefined) course.difficulty = difficulty;
  if (topics !== undefined) course.topics = toArray(topics);
  if (Array.isArray(lessons)) course.lessons = lessons; // lessons that keep their _id keep their progress
  await course.save();
  res.json(course);
});

// DELETE /api/courses/:id   (owner/admin)
exports.deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found');
  if (!canModify(req.user, course)) throw new ApiError(403, 'You can only delete your own courses');
  await Promise.all([
    course.deleteOne(),
    Quiz.deleteMany({ course: course._id }),
    User.updateMany({}, { $pull: { enrollments: { course: course._id } } }),
  ]);
  res.json({ message: 'Course deleted' });
});

// POST /api/courses/:id/enroll
exports.enroll = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found');
  if (findEnrollment(req.user, course._id)) throw new ApiError(400, 'You are already enrolled');
  req.user.enrollments.push({ course: course._id });
  await req.user.save();
  course.enrolledCount += 1;
  await course.save();
  res.status(201).json({ message: 'Enrolled successfully' });
});

// DELETE /api/courses/:id/enroll
exports.unenroll = asyncHandler(async (req, res) => {
  const enr = findEnrollment(req.user, req.params.id);
  if (!enr) throw new ApiError(400, 'You are not enrolled');
  req.user.enrollments = req.user.enrollments.filter((e) => String(e.course) !== String(req.params.id));
  await req.user.save();
  await Course.findByIdAndUpdate(req.params.id, { $inc: { enrolledCount: -1 } });
  res.json({ message: 'Unenrolled' });
});

// POST/DELETE /api/courses/:id/lessons/:lessonId/complete
exports.setLessonComplete = (done) =>
  asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);
    if (!course) throw new ApiError(404, 'Course not found');
    const lesson = course.lessons.id(req.params.lessonId);
    if (!lesson) throw new ApiError(404, 'Lesson not found');
    const enr = findEnrollment(req.user, course._id);
    if (!enr) throw new ApiError(400, 'Enrol in the course first');

    const has = enr.completedLessons.some((id) => String(id) === String(lesson._id));
    if (done && !has) enr.completedLessons.push(lesson._id);
    if (!done && has) enr.completedLessons = enr.completedLessons.filter((id) => String(id) !== String(lesson._id));
    await req.user.save();
    res.json({ completedLessons: enr.completedLessons, ...progressOf(course, enr) });
  });
