// Adds demo data without deleting or replacing existing users, courses, quizzes, or results.
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const Quiz = require('../models/Quiz');
const Result = require('../models/Result');
const questionBank = require('../services/questionBank');

const demoAccounts = [
  { name: 'Demo Admin', email: 'admin@neurolearn.com', password: 'Admin@123', role: 'admin' },
  { name: 'Prof. Sharma', email: 'teacher@neurolearn.com', password: 'Teacher@123', role: 'teacher' },
  { name: 'Prof. Khan', email: 'teacher2@neurolearn.com', password: 'Teacher2@123', role: 'teacher' },
  { name: 'Aanya Sharma', email: 'student@neurolearn.com', password: 'Student@123', role: 'student' },
  { name: 'Rohan Verma', email: 'student2@neurolearn.com', password: 'Student2@123', role: 'student' },
  { name: 'Meera Patel', email: 'student3@neurolearn.com', password: 'Student3@123', role: 'student' },
];

const lesson = (title, topic, content) => ({ title, topic, content });

const demoCourses = (teachers) => [
  {
    title: 'Data Structures & Algorithms',
    description: 'Build a strong foundation in arrays, recursion, sorting and trees with concise lessons and practice.',
    category: 'Computer Science',
    difficulty: 'intermediate',
    topics: ['Arrays', 'Recursion', 'Sorting', 'Trees'],
    createdBy: teachers[0]._id,
    lessons: [
      lesson('Introduction to Arrays', 'Arrays', 'Arrays store elements in contiguous memory. Index lookup is O(1), while inserting at the beginning takes O(n) because later elements must shift.'),
      lesson('Recursion Basics', 'Recursion', 'A recursive function solves a smaller version of a problem and needs a base case to stop. Memoization avoids recalculating answers such as Fibonacci numbers.'),
      lesson('Sorting Algorithms', 'Sorting', 'Bubble sort is O(n²). Merge sort is stable and runs in O(n log n); quick sort averages O(n log n) but is not stable.'),
      lesson('Binary Trees & BSTs', 'Trees', 'A binary tree node has at most two children. In a binary search tree, inorder traversal visits values in ascending order.'),
    ],
  },
  {
    title: 'Database Management Systems',
    description: 'Learn relational data, practical SQL joins, and database normalization.',
    category: 'Computer Science',
    difficulty: 'beginner',
    topics: ['SQL Joins', 'Normalization'],
    createdBy: teachers[0]._id,
    lessons: [
      lesson('SQL Joins', 'SQL Joins', 'INNER JOIN returns matching rows. LEFT JOIN preserves every row from its left table and uses NULL where no right-side match exists.'),
      lesson('Database Normalization', 'Normalization', 'Normalization reduces duplicated data and update anomalies. 1NF requires atomic values, 2NF removes partial dependencies, and 3NF removes transitive dependencies.'),
    ],
  },
  {
    title: 'Programming Logic for Beginners',
    description: 'Practise problem decomposition, arrays and recursive thinking through beginner-friendly lessons.',
    category: 'Programming',
    difficulty: 'beginner',
    topics: ['Arrays', 'Recursion'],
    createdBy: teachers[1]._id,
    lessons: [
      lesson('Working with Lists', 'Arrays', 'Use an array to keep ordered values. A loop can process each value once, while a two-pointer approach is useful for sorted input.'),
      lesson('Thinking Recursively', 'Recursion', 'Start with a small base case, then reduce the input on each call. Check that every recursive step moves closer to the base case.'),
    ],
  },
  {
    title: 'Sorting & Tree Algorithms',
    description: 'Explore how common sorting methods work and how trees organise information efficiently.',
    category: 'Computer Science',
    difficulty: 'advanced',
    topics: ['Sorting', 'Trees'],
    createdBy: teachers[1]._id,
    lessons: [
      lesson('Comparing Sorts', 'Sorting', 'Choose a sorting algorithm based on its runtime, memory needs, and whether it must preserve the order of equal values.'),
      lesson('Searching Binary Trees', 'Trees', 'A balanced binary search tree can find a value in O(log n) time by choosing the left or right subtree at each step.'),
    ],
  },
];

async function ensureDemoUser(account) {
  let user = await User.findOne({ email: account.email });
  if (!user) user = new User({ email: account.email });
  user.name = account.name;
  user.role = account.role;
  user.password = account.password;
  await user.save();
  return user;
}

async function ensureCourse(courseData) {
  const existing = await Course.findOne({ title: courseData.title });
  return existing || Course.create(courseData);
}

async function ensureEnrollment(student, course) {
  if (student.enrollments.some((enrollment) => String(enrollment.course) === String(course._id))) return;
  student.enrollments.push({ course: course._id });
  await student.save();
}

async function ensureDemoQuiz(course, teacher, topic) {
  const title = `Demo practice: ${topic}`;
  const existing = await Quiz.findOne({ course: course._id, title });
  if (existing) return existing;

  const questions = questionBank.filter((question) => question.topic === topic).slice(0, 3);
  if (!questions.length) return null;
  return Quiz.create({
    course: course._id,
    title,
    topic,
    difficulty: 'medium',
    questions,
    source: 'offline',
    createdBy: teacher._id,
  });
}

async function ensureDemoResult(student, quiz, studentIndex) {
  if (!quiz || await Result.exists({ user: student._id, quiz: quiz._id })) return;

  let correct = 0;
  const answers = quiz.questions.map((question, questionIndex) => {
    const missOne = studentIndex !== 1 && questionIndex === studentIndex % quiz.questions.length;
    const selected = missOne ? (question.correctAnswer + 1) % 4 : question.correctAnswer;
    const isCorrect = selected === question.correctAnswer;
    if (isCorrect) correct++;
    return {
      question: question.question,
      options: question.options,
      selected,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      topic: question.topic,
      isCorrect,
    };
  });

  const total = quiz.questions.length;
  await Result.create({
    user: student._id,
    quiz: quiz._id,
    course: quiz.course,
    quizTitle: quiz.title,
    difficulty: quiz.difficulty,
    score: Math.round((correct / total) * 100),
    correct,
    total,
    timeTaken: 180 + studentIndex * 35,
    topicBreakdown: [{ topic: quiz.topic, correct, total }],
    answers,
  });
}

(async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required. Set it in backend/.env.');
  await mongoose.connect(process.env.MONGO_URI);

  const users = [];
  for (const account of demoAccounts) users.push(await ensureDemoUser(account));
  const teachers = users.filter((user) => user.role === 'teacher');
  const students = users.filter((user) => user.role === 'student');

  const courses = [];
  for (const courseData of demoCourses(teachers)) courses.push(await ensureCourse(courseData));

  for (const student of students) {
    for (const course of courses) await ensureEnrollment(student, course);
  }
  for (const course of courses) {
    const enrolledCount = await User.countDocuments({ 'enrollments.course': course._id });
    if (course.enrolledCount !== enrolledCount) {
      course.enrolledCount = enrolledCount;
      await course.save();
    }
  }

  const quizSpecs = [
    { course: courses[0], teacher: teachers[0], topic: 'Arrays' },
    { course: courses[1], teacher: teachers[0], topic: 'SQL Joins' },
  ];
  for (const { course, teacher, topic } of quizSpecs) {
    const quiz = await ensureDemoQuiz(course, teacher, topic);
    for (const [index, student] of students.entries()) await ensureDemoResult(student, quiz, index);
  }

  console.log('Demo data is ready. Existing non-demo records were kept.');
  console.log(`Created or refreshed ${users.length} demo accounts, ${courses.length} sample courses, and sample quiz history.`);
  console.log('Demo accounts (email / password):');
  for (const user of users) {
    const account = demoAccounts.find((item) => item.email === user.email);
    console.log(`  ${user.role.padEnd(7)} ${account.email} / ${account.password}`);
  }
  await mongoose.disconnect();
})().catch(async (error) => {
  console.error('Demo data setup failed:', error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
