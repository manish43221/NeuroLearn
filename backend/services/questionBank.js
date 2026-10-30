

const q = (topic, difficulty, question, options, correctAnswer, explanation) => ({
  topic, difficulty, question, options, correctAnswer, explanation,
});



module.exports = [
  q('Arrays', 'easy', 'What is the time complexity of accessing an array element by its index?', ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'], 0, 'Arrays are stored contiguously, so the address of any index is computed directly in constant time.'),
  q('Arrays', 'medium', 'What is the worst-case time complexity of inserting an element at the beginning of an array with n elements?', ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], 2, 'All existing elements must be shifted one position to the right.'),
  q('Arrays', 'hard', 'Which technique finds two numbers summing to a target in a SORTED array in O(n) time and O(1) extra space?', ['Nested loops', 'Hash map', 'Two pointers', 'Binary search for each element'], 2, 'Two pointers start at both ends and move inward depending on whether the sum is too small or too large.'),

  q('Recursion', 'easy', 'Which part is essential in every recursive function to stop infinite recursion?', ['A loop', 'A base case', 'A global variable', 'An array'], 1, 'The base case returns a result without making another recursive call.'),
  q('Recursion', 'medium', 'What is the time complexity of the naive recursive Fibonacci fib(n) = fib(n-1) + fib(n-2)?', ['O(n)', 'O(log n)', 'O(2ⁿ)', 'O(n²)'], 2, 'Each call spawns two more calls, so the number of calls grows exponentially.'),
  q('Recursion', 'hard', 'Which technique reduces naive recursive Fibonacci from exponential to linear time?', ['Memoization', 'Increasing the stack size', 'Removing the base case', 'Using floating point numbers'], 0, 'Memoization stores already computed values so each fib(k) is computed only once.'),

  q('SQL Joins', 'easy', 'Which JOIN returns only rows that have matching values in both tables?', ['LEFT JOIN', 'INNER JOIN', 'FULL OUTER JOIN', 'CROSS JOIN'], 1, 'INNER JOIN keeps only the rows where the join condition matches in both tables.'),
  q('SQL Joins', 'medium', 'Which JOIN returns all rows from the left table and matching rows from the right table, using NULL when there is no match?', ['INNER JOIN', 'RIGHT JOIN', 'LEFT JOIN', 'CROSS JOIN'], 2, 'LEFT JOIN preserves every row of the left table.'),
  q('SQL Joins', 'hard', 'A CROSS JOIN between a table with 4 rows and a table with 5 rows returns how many rows?', ['9', '20', '5', '4'], 1, 'A CROSS JOIN returns the Cartesian product: 4 × 5 = 20 rows.'),

  q('Sorting', 'easy', 'Which sorting algorithm repeatedly swaps adjacent elements that are in the wrong order?', ['Merge sort', 'Quick sort', 'Bubble sort', 'Heap sort'], 2, 'Bubble sort compares neighbouring elements and swaps them until the list is sorted.'),
  q('Sorting', 'medium', 'What is the average-case time complexity of Merge Sort?', ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'], 1, 'Merge sort splits the array log n times and merges n elements at each level.'),
  q('Sorting', 'hard', 'Which of these sorting algorithms is NOT stable in its standard implementation?', ['Merge sort', 'Insertion sort', 'Quick sort', 'Bubble sort'], 2, 'Standard quick sort may change the relative order of equal elements during partitioning.'),

  q('Trees', 'easy', 'In a binary tree, what is the maximum number of children a node can have?', ['1', '2', '3', 'Unlimited'], 1, 'By definition each node in a binary tree has at most two children.'),
  q('Trees', 'medium', 'Which traversal of a Binary Search Tree visits the keys in ascending order?', ['Preorder', 'Postorder', 'Inorder', 'Level order'], 2, 'Inorder visits left subtree, node, then right subtree, which yields sorted order for a BST.'),
  q('Trees', 'hard', 'What is the worst-case search time in a self-balancing BST such as an AVL tree with n nodes?', ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'], 1, 'Balancing keeps the height at O(log n).'),

  q('Normalization', 'easy', 'Database normalization is mainly used to:', ['Increase redundancy', 'Reduce redundancy and update anomalies', 'Speed up every query', 'Encrypt the data'], 1, 'Normalization organizes data to remove duplication and avoid anomalies.'),
  q('Normalization', 'medium', 'A table is in 2NF if it is in 1NF and:', ['Has no transitive dependencies', 'Has no partial dependency on part of a composite key', 'Has no multivalued attributes', 'Has only one column'], 1, '2NF removes partial dependencies of non-key attributes on a part of a composite key.'),
  q('Normalization', 'hard', 'Which normal form removes transitive dependencies of non-prime attributes on the primary key?', ['1NF', '2NF', '3NF', '4NF'], 2, '3NF requires that non-key attributes depend only on the key, not on other non-key attributes.'),
  q('SQL Joins', 'easy', 'Which SQL clause specifies how rows from two tables are matched?', ['ON', 'GROUP BY', 'ORDER BY', 'HAVING'], 0, 'The ON clause defines the condition used to match rows in a join.'),
  q('SQL Joins', 'medium', 'Which join keeps every row from both tables, matching rows where possible?', ['INNER JOIN', 'LEFT JOIN', 'FULL OUTER JOIN', 'CROSS JOIN'], 2, 'A FULL OUTER JOIN preserves unmatched rows from both sides and fills missing values with NULL.'),
  q('SQL Joins', 'easy', 'What does an INNER JOIN do when a row has no matching row in the other table?', ['Keeps the row with NULL values', 'Excludes the row', 'Repeats the row', 'Stops the query'], 1, 'An INNER JOIN only returns rows with a match on both sides.'),
  q('SQL Joins', 'medium', 'Why can a join return multiple rows for one row in the left table?', ['The right table has multiple matching rows', 'The query has an ORDER BY clause', 'The left table has a primary key', 'The query uses DISTINCT'], 0, 'Each matching row on the right produces a joined result row.'),
  q('SQL Joins', 'hard', 'What is a self join?', ['Joining a table to itself', 'Joining every table in a database', 'Joining tables without a condition', 'Joining only tables with identical names'], 0, 'A self join uses the same table more than once, commonly with aliases, to relate its rows.'),
  q('Normalization', 'easy', 'What does first normal form (1NF) require for each table cell?', ['A single atomic value', 'A value copied from another row', 'A formula', 'A list of values'], 0, 'First normal form requires each cell to contain one atomic value rather than a repeating list.'),
  q('Normalization', 'easy', 'Which design violates first normal form?', ['A cell containing several phone numbers', 'A table with a primary key', 'A row with one value per column', 'A table with a foreign key'], 0, 'A cell containing a list of values is not atomic and violates first normal form.'),
  q('Normalization', 'medium', 'What is a functional dependency in a relational table?', ['One attribute value determines another attribute value', 'Every row has the same values', 'A table has no keys', 'Two tables share a name'], 0, 'In a functional dependency, the value of one attribute uniquely determines the value of another.'),
  q('Normalization', 'medium', 'What is a common trade-off of denormalizing a database?', ['More duplicated data in exchange for simpler or faster reads', 'Guaranteed elimination of all duplicates', 'Removal of every primary key', 'Automatic encryption of columns'], 0, 'Denormalization can improve read performance but may introduce duplicated data and update concerns.'),
];
