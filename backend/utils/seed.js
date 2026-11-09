
const path = require('path');

// Always load the .env file from the backend folder
require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
});

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

const lesson = (title, topic, content) => ({
  title,
  topic,
  content,
});

const demoCourses = (teachers) => [
  {
    title: 'Data Structures & Algorithms',
    description: 'Build a strong foundation in arrays, recursion, sorting and trees with concise lessons and practice.',
    category: 'Computer Science',
    difficulty: 'intermediate',
    topics: ['Arrays', 'Recursion', 'Sorting', 'Trees'],
    createdBy: teachers[0]._id,
    lessons: [
      lesson('Introduction to Arrays', 'Arrays', 'Arrays store elements in contiguous memory. Index lookup is O(1), while inserting at the beginning takes O(n).'),
      lesson('Recursion Basics', 'Recursion', 'A recursive function solves a smaller version of a problem and needs a base case to stop.'),
      lesson('Sorting Algorithms', 'Sorting', 'Merge sort runs in O(n log n). Quick sort averages O(n log n).'),
      lesson('Binary Trees & BSTs', 'Trees', 'A binary tree node has at most two children. In a BST, inorder traversal visits values in ascending order.'),
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
      lesson('SQL Joins', 'SQL Joins', 'INNER JOIN returns matching rows. LEFT JOIN preserves every row from its left table.'),
      lesson('Database Normalization', 'Normalization', 'Normalization reduces duplicated data and update anomalies.'),
    ],
  },
  {
    title: 'Programming Logic for Beginners',
    description: 'Practise problem decomposition, arrays and recursive thinking.',
    category: 'Programming',
    difficulty: 'beginner',
    topics: ['Arrays', 'Recursion'],
    createdBy: teachers[1]._id,
    lessons: [
      lesson('Working with Lists', 'Arrays', 'Use arrays to keep ordered values and loops to process them.'),
      lesson('Thinking Recursively', 'Recursion', 'Start with a base case, then reduce the input on each recursive call.'),
    ],
  },
  {
    title: 'Sorting & Tree Algorithms',
    description: 'Explore sorting methods and how trees organise information.',
    category: 'Computer Science',
    difficulty: 'advanced',
    topics: ['Sorting', 'Trees'],
    createdBy: teachers[1]._id,
    lessons: [
      lesson('Comparing Sorts', 'Sorting', 'Choose sorting algorithms based on runtime, memory and stability.'),
      lesson('Searching Binary Trees', 'Trees', 'A balanced BST can find values in O(log n) time.'),
    ],
  },
];

async function ensureDemoUser(account) {
  let user = await User.findOne({ email: account.email });

  if (!user) {
    user = new User({ email: account.email });
  }

  user.name = account.name;
  user.role = account.role;
  user.password = account.password;

  // User model hashes the password in its pre-save middleware.
  await user.save();

  return user;
}

async function ensureCourse(courseData) {
  const existing = await Course.findOne({
    title: courseData.title,
  });

  if (existing) return existing;

  return Course.create(courseData);
}

async function ensureEnrollment(student, course) {
  const alreadyEnrolled = student.enrollments.some(
    (enrollment) => String(enrollment.course) === String(course._id)
  );

  if (alreadyEnrolled) return;

  student.enrollments.push({
    course: course._id,
  });

  await student.save();
}

async function ensureDemoQuiz(course, teacher, topic) {
  const title = `Demo practice: ${topic}`;

  const existing = await Quiz.findOne({
    course: course._id,
    title,
  });

  if (existing) return existing;

  const questions = questionBank
    .filter((question) => question.topic === topic)
    .slice(0, 3);

  if (!questions.length) {
    console.log(`No questions found for topic: ${topic}`);
    return null;
  }

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
  if (!quiz) return;

  const existing = await Result.exists({
    user: student._id,
    quiz: quiz._id,
  });

  if (existing) return;

  let correct = 0;

  const answers = quiz.questions.map((question, questionIndex) => {
    const missOne =
      studentIndex !== 1 &&
      questionIndex === studentIndex % quiz.questions.length;

    const selected = missOne
      ? (question.correctAnswer + 1) % question.options.length
      : question.correctAnswer;

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

  if (total === 0) return;

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
    topicBreakdown: [
      {
        topic: quiz.topic,
        correct,
        total,
      },
    ],
    answers,
  });
}

async function seedDatabase() {
  if (!process.env.MONGO_URI) {
    throw new Error(
      'MONGO_URI is missing. Add it to backend/.env'
    );
  }

  console.log('Connecting to MongoDB...');

  // Explicitly use the existing database name.
  // This prevents the neuroLearn/neurolearn case mismatch.
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: 'neurolearn',
  });

  console.log('Connected to database:', mongoose.connection.name);

  const users = [];

  for (const account of demoAccounts) {
    users.push(await ensureDemoUser(account));
  }

  const teachers = users.filter((user) => user.role === 'teacher');
  const students = users.filter((user) => user.role === 'student');

  const courses = [];

  for (const courseData of demoCourses(teachers)) {
    courses.push(await ensureCourse(courseData));
  }

  for (const student of students) {
    for (const course of courses) {
      await ensureEnrollment(student, course);
    }
  }

  for (const course of courses) {
    const enrolledCount = await User.countDocuments({
      'enrollments.course': course._id,
    });

    if (course.enrolledCount !== enrolledCount) {
      course.enrolledCount = enrolledCount;
      await course.save();
    }
  }

  const quizSpecs = [
    {
      course: courses[0],
      teacher: teachers[0],
      topic: 'Arrays',
    },
    {
      course: courses[1],
      teacher: teachers[0],
      topic: 'SQL Joins',
    },
  ];

  for (const { course, teacher, topic } of quizSpecs) {
    const quiz = await ensureDemoQuiz(course, teacher, topic);

    for (const [index, student] of students.entries()) {
      await ensureDemoResult(student, quiz, index);
    }
  }

  console.log('\nDemo data setup completed successfully!');
  console.log('Existing non-demo records were preserved.');

  console.log('\nDemo login credentials:');

  for (const account of demoAccounts) {
    console.log(
      `${account.role.padEnd(8)} ${account.email} / ${account.password}`
    );
  }
}

seedDatabase()
  .catch((error) => {
    console.error('Demo data setup failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
