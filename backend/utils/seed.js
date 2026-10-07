// Run with: npm run seed   (WARNING: wipes users, courses, quizzes and results)
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const Quiz = require('../models/Quiz');
const Result = require('../models/Result');

const lesson = (title, topic, content) => ({ title, topic, content });

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([User.deleteMany(), Course.deleteMany(), Quiz.deleteMany(), Result.deleteMany()]);

  await User.create({ name: 'Admin', email: 'admin@neurolearn.com', password: 'Admin@123', role: 'admin' });
  const teacher = await User.create({ name: 'Prof. Sharma', email: 'teacher@neurolearn.com', password: 'Teacher@123', role: 'teacher' });
  const student = await User.create({ name: 'Manish', email: 'student@neurolearn.com', password: 'Student@123', role: 'student' });

  const dsa = await Course.create({
    title: 'Data Structures & Algorithms',
    description: 'Core data structures and algorithms every developer needs: arrays, recursion, sorting and trees.',
    category: 'Computer Science',
    difficulty: 'intermediate',
    topics: ['Arrays', 'Recursion', 'Sorting', 'Trees'],
    createdBy: teacher._id,
    lessons: [
      lesson('Introduction to Arrays', 'Arrays', 'An array stores elements in contiguous memory, so any element can be read by index in O(1) time. Inserting or deleting in the middle needs shifting and costs O(n). The two-pointer technique solves many problems on sorted arrays in linear time.'),
      lesson('Recursion Basics', 'Recursion', 'A recursive function solves a problem by calling itself on a smaller input. It needs a base case to stop. Naive Fibonacci recomputes the same values and takes exponential time; memoization stores results to make it linear.'),
      lesson('Sorting Algorithms', 'Sorting', 'Bubble sort swaps adjacent elements and runs in O(n²). Merge sort divides the array, sorts halves and merges them in O(n log n) and is stable. Quick sort partitions around a pivot, averages O(n log n) and is not stable.'),
      lesson('Binary Trees & BSTs', 'Trees', 'A binary tree node has at most two children. In a binary search tree the left subtree holds smaller keys and the right subtree larger keys, so an inorder traversal returns sorted keys. Self-balancing trees like AVL keep height O(log n).'),
    ],
  });

  const dbms = await Course.create({
    title: 'Database Management Systems',
    description: 'Relational databases, SQL joins and normalization explained with practical examples.',
    category: 'Computer Science',
    difficulty: 'beginner',
    topics: ['SQL Joins', 'Normalization'],
    createdBy: teacher._id,
    lessons: [
      lesson('SQL Joins', 'SQL Joins', 'INNER JOIN returns rows that match in both tables. LEFT JOIN keeps every row from the left table and fills NULL when there is no match. CROSS JOIN returns the Cartesian product of both tables.'),
      lesson('Normal Forms', 'Normalization', 'Normalization reduces redundancy and anomalies. 1NF requires atomic values, 2NF removes partial dependencies and 3NF removes transitive dependencies on the primary key.'),
    ],
  });

  student.enrollments.push({ course: dsa._id }, { course: dbms._id });
  await student.save();
  dsa.enrolledCount = 1; dbms.enrolledCount = 1;
  await Promise.all([dsa.save(), dbms.save()]);

  console.log('Seed complete. Demo logins:');
  console.log('  admin@neurolearn.com   / Admin@123');
  console.log('  teacher@neurolearn.com / Teacher@123');
  console.log('  student@neurolearn.com / Student@123');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
