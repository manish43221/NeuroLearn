# NeuroLearn

NeuroLearn is a full-stack, role-based personalized learning platform built for students, teachers, and administrators. It combines course enrollment and lesson tracking with adaptive quizzes, topic-level performance analytics, confidence ratings, AI-assisted tutoring, study plans, flashcards, and assignment submission and evaluation.

The platform helps learners turn course material into practice, identify weak topics from saved quiz results, and choose follow-up study activities based on that evidence. Teachers can publish and manage courses and assignments, review submissions, and monitor student progress. Administrators can manage users and approve teacher registrations.

## Key Features

### Learning and Course Management
- Browse courses with search, category, and difficulty filters.
- View course categories, course details, topics, and lessons.
- Enroll in or unenroll from courses.
- Track completed lessons and course progress.
- Create, edit, and delete courses as a teacher or administrator.
- Allow course owners and administrators to manage course content.

### AI-Powered Quizzes
- Generate four-option multiple-choice quizzes for a course topic or all course topics.
- Use easy, medium, hard, or automatically selected difficulty.
- Select a weakest topic, a named topic, or mixed topics.
- Generate quizzes from OpenRouter, Gemini, or OpenAI.
- Use an offline question bank when the provider is unavailable or configured as `mock`.
- Prevent users from seeing correct answers before quiz submission.
- Save quiz attempts and explain each answer after submission.

### Performance and Adaptive Learning
- Record quiz score, correct answer count, time taken, topic breakdown, and answer history.
- View overall statistics, score history, weak topics, and leaderboard rankings.
- Display confidence insights from low, medium, and high confidence selections.
- Recommend weak topics and adaptive quiz difficulty from existing results.
- Provide a NeuroMap of topic accuracy and an adaptive-practice view.

### AI Tutor and Study Planning
- Ask a course-aware AI tutor questions with the most recent conversation history.
- Include weak topics and course lesson material in the tutor context.
- Generate a 3- to 14-day study plan based on weak topics and available study time.
- Generate proposed flashcards from AI or offline course content.
- Fall back to course lessons or the offline question bank when AI is unavailable.

### Flashcards and Spaced Practice
- Create custom flashcards or generate flashcards for a course topic.
- Review due cards with `known`, `difficult`, or `forgotten` ratings.
- Track review count, interval, next review date, and last rating.
- View all flashcards and flashcard statistics.

### Assignments
- Create assignments for a teacher's own courses.
- Store due dates, maximum marks, instructions, references, late-submission settings, and resubmission settings.
- Allow students to submit one file for an enrolled course.
- Accept PDF, DOCX, ZIP, and TXT files up to 10 MB.
- Review, grade, and provide feedback on submissions.
- Download files through authenticated routes with ownership checks.

### Accounts and Administration
- Register as a student or submit a teacher application.
- Require administrator approval before pending teacher applications become accounts.
- Log in with a JWT.
- Update profile name and password.
- Use student, teacher, and administrator role permissions.
- View administrator statistics and users.
- Change user roles and delete users.
- Approve or reject teacher applications.

### Interface
- Responsive React interface styled with Tailwind CSS.
- Light and dark theme support.
- Protected frontend routes for authenticated users and role-specific pages.
- Dashboard, courses, quiz, result, performance, profile, tutor, study plan, flashcards, assignments, and NeuroLab pages.
- Chart-based performance views using Recharts.
- Toast notifications using `react-hot-toast`.

## Technology Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 | Component-based user interface |
| Vite 5 | Development server and production build |
| React Router DOM 6 | Client-side routing |
| Axios | REST API requests and JWT attachment |
| Tailwind CSS 3 | Utility-first styling |
| Recharts | Statistics and performance charts |
| React Markdown / Remark GFM | Rendered Markdown-style content |
| React Hot Toast | User notifications |

### Backend
| Technology | Purpose |
|---|---|
| Node.js 18+ | JavaScript runtime |
| Express 4 | REST API server |
| MongoDB and Mongoose 8 | Database and document schemas |
| JSON Web Token | Stateless authentication |
| bcryptjs | Password hashing |
| Express Validator | Request validation |
| Express Rate Limit | API and AI request throttling |
| Helmet | Security-related HTTP headers |
| Morgan | Development request logging |
| CORS | Controlled cross-origin access |
| Multer | In-memory assignment file uploads |

### AI and External Services
- OpenRouter
- Google Gemini
- OpenAI
- Built-in offline question and flashcard fallbacks

The project does not require an AI provider for quiz fallback: mock/offline quiz generation uses `backend/services/questionBank.js`.

## Architecture

```text
Browser
  |
  | React Router / Axios
  v
React frontend (Vite)
  |
  | HTTP with Authorization: Bearer <JWT>
  v
Express REST API
  |
  +--> Mongoose models
  |       |
  |       v
  |     MongoDB database "neuroLearn"
  |
  +--> AI provider or offline fallback
```

The frontend keeps the JWT in `localStorage` as `nl_token`, restores the current user through `/api/auth/me`, and attaches the token to API requests. Backend middleware verifies the JWT and loads the associated user before protected controllers execute.

In development, Vite proxies `/api` to `http://localhost:5000`. In another deployment environment, set `VITE_API_URL` to the deployed backend API URL.

## Project Structure

```text
NeuroLearn/
├── README.md
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── aicontroller.js
│   │   ├── assignmentController.js
│   │   ├── authController.js
│   │   ├── courseController.js
│   │   ├── flashcardController.js
│   │   ├── quizController.js
│   │   ├── resultController.js
│   │   └── userController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── error.js
│   │   ├── sanitize.js
│   │   └── validate.js
│   ├── models/
│   │   ├── Assignment.js
│   │   ├── AssignmentSubmission.js
│   │   ├── Course.js
│   │   ├── Flashcard.js
│   │   ├── FlashcardReview.js
│   │   ├── Quiz.js
│   │   ├── Result.js
│   │   ├── TeacherApplication.js
│   │   └── User.js
│   ├── routes/
│   ├── services/
│   ├── tests/
│   └── utils/
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── components/
        ├── context/
        ├── pages/
        └── services/
```

## Prerequisites

- Node.js 18 or newer
- npm
- MongoDB running locally or a MongoDB Atlas connection string
- Optional: OpenRouter, Gemini, or OpenAI API credentials

Windows PowerShell examples are provided below.

## Installation and Setup

### 1. Clone the repository

```powershell
git clone <repository-url>
cd NeuroLearn
```

Replace `<repository-url>` with the GitHub repository URL.

### 2. Configure the backend

```powershell
cd backend
Copy-Item .env.example .env
```

Open `backend/.env` and set at least `MONGO_URI` and `JWT_SECRET`. Never commit the populated `.env` file.

Local MongoDB example:

```env
MONGO_URI=mongodb://127.0.0.1:27017/neurolearn
JWT_SECRET=<generate-a-long-random-secret>
```

The application forces the database name to `neuroLearn` through Mongoose configuration, regardless of the database name included in the URI.

### 3. Install and start the backend

```powershell
npm install
npm run dev
```

The API starts at `http://localhost:5000` by default. A production-style process is available with:

```powershell
npm start
```

Check the server with:

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health"
```

### 4. Start the frontend

Open a second PowerShell terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

### 5. Build the frontend

```powershell
cd frontend
npm run build
npm run preview
```

The production files are generated in `frontend/dist`.

## Environment Variables

The backend's `.env.example` defines the following configuration.

| Variable | Required | Example or default | Purpose |
|---|---:|---|---|
| `PORT` | No | `5000` | Express server port |
| `NODE_ENV` | No | `development` | Disables Morgan in production |
| `CLIENT_URL` | No | `http://localhost:5173` | Comma-separated CORS origins |
| `MONGO_URI` | Yes | MongoDB connection URI | MongoDB connection |
| `JWT_SECRET` | Yes | `<long-random-secret>` | Signs and verifies JWTs |
| `JWT_EXPIRES_IN` | No | `7d` | Token lifetime; read by `utils/token.js` |
| `TUTOR_PROVIDER` | No | `openrouter` | Tutor provider: `openrouter`, `gemini`, `openai`, or `mock` |
| `TUTOR_MODEL` | No | `openrouter/free` | Model used for OpenRouter tutor requests |
| `QUIZ_PROVIDER` | No | `openrouter` | Quiz provider: `openrouter`, `gemini`, `openai`, or `mock` |
| `QUIZ_MODEL` | No | `openrouter/free` | Model used for OpenRouter quiz requests |
| `OPENROUTER_API_KEY` | Conditional | Empty | Required when OpenRouter is selected |
| `GEMINI_API_KEY` | Conditional | Empty | Required when Gemini is selected |
| `GEMINI_MODEL` | Conditional | Service default | Gemini model name |

The implementation also reads these optional provider variables:

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | OpenAI authentication |
| `OPENAI_MODEL` | OpenAI model; defaults to `gpt-4o-mini` |
| `OPENROUTER_JSON_MODE` | Set to `true` to request OpenRouter JSON response mode |
| `OPENROUTER_SITE_URL` | Optional OpenRouter referral URL |
| `OPENROUTER_APP_NAME` | Optional OpenRouter application title |
| `TUTOR_API_KEY` | Legacy fallback key for OpenRouter tutor requests |

Example provider configuration:

```env
# OpenRouter
QUIZ_PROVIDER=openrouter
TUTOR_PROVIDER=openrouter
QUIZ_MODEL=openrouter/free
TUTOR_MODEL=openrouter/free
OPENROUTER_API_KEY=<your-openrouter-key>

# Gemini backup
GEMINI_API_KEY=<your-gemini-key>
GEMINI_MODEL=<model-name>

# OpenAI
OPENAI_API_KEY=<your-openai-key>
OPENAI_MODEL=gpt-4o-mini

# No external AI provider
QUIZ_PROVIDER=mock
TUTOR_PROVIDER=mock
```

For the frontend, the only environment variable read by source code is:

| Variable | Required | Purpose |
|---|---:|---|
| `VITE_API_URL` | No | API base URL; defaults to `/api` and works with Vite proxy |

Example `frontend/.env` for a deployed backend:

```env
VITE_API_URL=https://your-backend.example.com/api
```

## Database Configuration

NeuroLearn uses MongoDB through Mongoose. `backend/config/db.js` connects to `MONGO_URI` and forces the database name `neuroLearn`.

Main collections and models:

| Model | Purpose |
|---|---|
| `User` | Accounts, roles, password hashes, and course enrollments |
| `TeacherApplication` | Pending/processing/rejected/approved teacher registrations |
| `Course` | Course metadata, topics, lessons, creator, and enrollment count |
| `Quiz` | Generated quiz questions, answer choices, explanations, and source |
| `Result` | Quiz attempts, scores, answer snapshots, confidence, and topic breakdown |
| `Flashcard` | User flashcards and spaced-review state |
| `FlashcardReview` | Individual flashcard review history |
| `Assignment` | Course assignments and submission settings |
| `AssignmentSubmission` | Student file submissions and evaluation data |

MongoDB Atlas, Docker, or a local MongoDB service can be used. Do not change the forced database name unless `config/db.js` is intentionally changed.

## Authentication and Authorization

Authentication uses a signed JWT:

1. `POST /api/auth/register` or `/login` validates the request.
2. The backend returns a JWT and a safe user object.
3. The frontend stores the token as `nl_token`.
4. Axios sends it as `Authorization: Bearer <token>`.
5. `protect` middleware verifies the token and loads the current user.
6. `authorize(...)` middleware restricts role-specific controllers.

Roles:

- `student`: enroll in courses, take quizzes, submit assignments, and use learner features.
- `teacher`: manage courses and assignments as an owner and evaluate submissions.
- `admin`: manage all configured administrative resources and user roles.

An administrator must approve a registration requesting the teacher role. Teacher application login attempts are rejected until approval. Public course browsing is not implemented; protected course routes require authentication.

## API Documentation

Unless stated otherwise, send:

```http
Authorization: Bearer <jwt>
Content-Type: application/json
```

The server adds a general 600-request-per-15-minute limiter to `/api`, an authentication limiter to `/api/auth`, and additional AI, quiz-generation, and submission limiters.

### Health

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Public server health and current timestamp |

### Authentication

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register a student or submit a teacher application |
| `POST` | `/api/auth/login` | Public | Login and receive a JWT |
| `GET` | `/api/auth/me` | Authenticated | Return the current user |
| `PUT` | `/api/auth/me` | Authenticated | Update name or password |

### Courses

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/courses` | Authenticated | List courses; supports `search`, `category`, `difficulty`, and `mine=true` |
| `GET` | `/api/courses/categories` | Authenticated | Return distinct course categories |
| `GET` | `/api/courses/my` | Authenticated | Return enrollments and lesson progress |
| `POST` | `/api/courses` | Teacher or admin | Create a course |
| `GET` | `/api/courses/:id` | Authenticated | Get course details and enrollment state |
| `PUT` | `/api/courses/:id` | Owner or admin | Update a course |
| `DELETE` | `/api/courses/:id` | Owner or admin | Delete a course and related course data |
| `POST` | `/api/courses/:id/enroll` | Authenticated | Enroll the current user |
| `DELETE` | `/api/courses/:id/enroll` | Authenticated | Unenroll the current user |
| `POST` | `/api/courses/:id/lessons/:lessonId/complete` | Authenticated | Mark a lesson complete |
| `DELETE` | `/api/courses/:id/lessons/:lessonId/complete` | Authenticated | Mark a lesson incomplete |

### Quizzes

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/quizzes/generate` | Authenticated | Generate and save a quiz |
| `GET` | `/api/quizzes` | Authenticated | List quizzes created by the current user |
| `GET` | `/api/quizzes/:id` | Owner or admin | Get questions without correct-answer fields |
| `POST` | `/api/quizzes/:id/submit` | Owner or admin | Submit answers and create a result |
| `DELETE` | `/api/quizzes/:id` | Owner or admin | Delete a created quiz |

Quiz generation body:

```json
{
  "courseId": "<course-id>",
  "topic": "",
  "difficulty": "auto",
  "count": 5
}
```

`topic` may be empty, `weak`, or a topic belonging to the course. `difficulty` may be `easy`, `medium`, `hard`, or `auto`.

### Results and Analytics

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/results/stats` | Authenticated | Overall statistics and topic accuracy |
| `GET` | `/api/results/confidence` | Authenticated | Confidence-versus-correctness summary |
| `GET` | `/api/results/weak-topics` | Authenticated | Weak topic list |
| `GET` | `/api/results/leaderboard` | Authenticated | Quiz leaderboard |
| `GET` | `/api/results/students` | Teacher or admin | Student performance data |
| `GET` | `/api/results` | Authenticated | Quiz result history |
| `GET` | `/api/results/:id` | Authenticated | A specific result |

### AI Services

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/ai/tutor` | Authenticated | Course-aware tutor response |
| `POST` | `/api/ai/study-plan` | Authenticated | AI or offline study plan |
| `POST` | `/api/ai/flashcards` | Authenticated | AI or offline proposed flashcards |

The tutor checks that a student is enrolled in the selected course.

### Flashcards

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/flashcards/stats` | Authenticated | Flashcard statistics |
| `GET` | `/api/flashcards` | Authenticated | List flashcards; use `due=true` for due cards |
| `POST` | `/api/flashcards/generate` | Authenticated | Generate flashcards |
| `POST` | `/api/flashcards` | Authenticated | Create a custom flashcard |
| `POST` | `/api/flashcards/:id/reviews` | Authenticated | Submit a review rating |
| `PATCH` | `/api/flashcards/:id` | Authenticated | Update an owned flashcard |
| `DELETE` | `/api/flashcards/:id` | Authenticated | Delete an owned flashcard |

### Assignments

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/assignments` | Authenticated | List assignments according to role and enrollment |
| `POST` | `/api/assignments` | Teacher or admin | Create an assignment |
| `GET` | `/api/assignments/:id` | Authenticated | Get assignment details |
| `PUT` | `/api/assignments/:id` | Owner or admin | Update an assignment |
| `DELETE` | `/api/assignments/:id` | Owner or admin | Delete an assignment |
| `GET` | `/api/assignments/:id/submissions` | Teacher or admin | List submissions |
| `GET` | `/api/assignments/:id/submissions/me/file` | Student | Download the current student's own file |
| `GET` | `/api/assignments/:id/submissions/:submissionId/file` | Teacher or admin | Download a submission file |
| `POST` | `/api/assignments/:id/submissions` | Student | Upload a submission |
| `PATCH` | `/api/assignments/:id/submissions/:submissionId/evaluate` | Teacher or admin | Grade a submission |

Submit assignment files as `multipart/form-data` with a `file` field. Supported MIME/extension validation is implemented for PDF, DOCX, ZIP, and TXT; the file size limit is 10 MB.

### Administration

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/users/overview` | Admin | Administrative overview statistics |
| `GET` | `/api/users/teacher-applications` | Admin | List teacher applications |
| `POST` | `/api/users/teacher-applications/:id/approve` | Admin | Approve a teacher application |
| `POST` | `/api/users/teacher-applications/:id/reject` | Admin | Reject a teacher application |
| `GET` | `/api/users` | Admin | List users |
| `PUT` | `/api/users/:id/role` | Admin | Change a user's role |
| `DELETE` | `/api/users/:id` | Admin | Delete a user |

## Seed Data

The backend includes a repeatable seed script:

```powershell
cd backend
npm run seed
```

The script is intended to create demo users, courses, enrollments, and sample quiz history. It connects to `MONGO_URI` and also forces the `neuroLearn` database name. Re-running the script preserves existing non-demo data and adds or updates demo content.

## Tests

The backend Node test runner is configured with:

```powershell
cd backend
npm test
```

The existing assignment integration test requires a separate MongoDB URI whose database name ends in `_test`.

```powershell
cd backend
$env:TEST_MONGO_URI = "mongodb://127.0.0.1:27017/neurolearn_assignments_test"
npm test
```

Remove the temporary shell variable afterward if desired:

```powershell
Remove-Item Env:TEST_MONGO_URI
```

## Screenshots

Add presentation screenshots to a `screenshots/` folder and update this section. Suggested images:

- Landing page
- Student dashboard
- Course and lesson detail
- Quiz taking and result feedback
- NeuroMap or adaptive learning
- Performance and confidence insights
- AI tutor
- Flashcard review
- Teacher assignment management
- Administrator management dashboard

Example Markdown after adding images:

```markdown
![NeuroLearn Dashboard](screenshots/dashboard.png)
```

## Deployment Notes

### Backend

- Set `MONGO_URI`, `JWT_SECRET`, `NODE_ENV=production`, and `CLIENT_URL`.
- Use the backend folder as the deploy root.
- Install dependencies with `npm install`.
- Start with `npm start`.
- If a proxy is used, `app.set('trust proxy', 1)` is already configured for rate limiting.

### Frontend

- Set `VITE_API_URL` to the deployed backend URL ending in `/api`.
- Build with `npm run build`.
- Publish `frontend/dist`.
- Configure SPA fallback rewrites so React Router routes return `index.html`.

## Future Improvements

- Add automated frontend tests and expand backend integration coverage.
- Add file-level malware scanning and object storage for uploaded assignments.
- Add document or lesson upload and richer course content editing.
- Add password reset and email verification flows.
- Add refresh tokens and stronger JWT/session revocation.
- Add pagination for large course, quiz, result, and user lists.
- Add saved AI-provider usage and cost tracking.
- Add notifications for assignment deadlines and grading.
- Add production audit logging and monitoring.
- Add CI/CD workflows for tests and deployments.

These items are suggested improvements and are not presented as current features.

## Contribution Guidelines

1. Fork the repository and create a feature branch.
2. Keep changes limited to the relevant frontend or backend area.
3. Follow the existing Express controller/route/model structure.
4. Follow existing React component, context, and Axios service patterns.
5. Add or update tests for meaningful behavior changes.
6. Run the relevant frontend build and backend tests before opening a pull request.
7. Do not commit `.env`, API keys, database credentials, or generated `node_modules`/`dist` folders.
8. Describe tested behavior and deployment considerations in the pull request.

## License

No license file is currently present in the project. A license should be added before the repository is distributed publicly under a specific open-source license. Until then, the repository's reuse terms are not defined by a project license.
