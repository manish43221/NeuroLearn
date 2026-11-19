# 🧠 NeuroLearn — AI-powered Personalized Learning Platform

MERN stack (MongoDB, Express, React, Node) + JWT + AI quiz generation (Gemini / OpenAI / offline bank).

## Folder structure
```
neurolearn/
├── backend/
│   ├── config/db.js
│   ├── controllers/  auth, course, quiz, result, user
│   ├── middleware/   auth (JWT + roles), error, sanitize, validate
│   ├── models/       User, Course, Quiz, Result
│   ├── routes/       auth, course, quiz, result, user
│   ├── services/     aiService.js, questionBank.js
│   ├── utils/        analytics.js, seed.js, token.js, ApiError.js, asyncHandler.js
│   ├── server.js
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/ Navbar, ProtectedRoute, CourseCard, StatCard, ProgressBar, Loader
    │   ├── context/    AuthContext, ThemeContext (dark mode)
    │   ├── pages/      Landing, Login, Register, Dashboard, Courses, CourseDetail,
    │   │               MyCourses, Quizzes, Quiz, Result, Performance, Profile, Manage, CourseForm
    │   ├── services/api.js
    │   ├── App.jsx, main.jsx, index.css
    ├── index.html, vite.config.js, tailwind.config.js, postcss.config.js
    └── package.json
```

## Run locally
Requirements: Node.js 18+ and MongoDB (local) or a MongoDB Atlas URI. The backend uses the case-sensitive database name `neuroLearn`.

```bash
# 1) Backend
cd backend
npm install
cp .env.example .env        # Windows: copy .env.example .env   (then edit MONGO_URI / JWT_SECRET)
npm run seed                # safely add demo users, courses, enrollments + sample quiz history
npm run dev                 # http://localhost:5000

# 2) Frontend (new terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

`npm run seed` can be repeated and keeps existing non-demo data. The login page lists all six demo accounts and can fill their credentials for you.

## AI setup
Quiz generation and tutor features have separate provider settings. Both default to `openrouter`; without a configured key, AI requests fall back to offline/rule-based behavior where available.

Set `QUIZ_PROVIDER` and `TUTOR_PROVIDER` independently in `backend/.env` to `openrouter`, `gemini`, `openai`, or `mock`. Configure the key for the selected provider:
- OpenRouter: `OPENROUTER_API_KEY=...`
- Gemini: `GEMINI_API_KEY=...`
- OpenAI: `OPENAI_API_KEY=...`
- Mock: no key; quiz generation uses the built-in question bank (Arrays, Recursion, Sorting, Trees, SQL Joins, Normalization).

Optional model settings are `QUIZ_MODEL`, `TUTOR_MODEL`, `GEMINI_MODEL`, and `OPENAI_MODEL`. `OPENROUTER_JSON_MODE=true` enables OpenRouter JSON response mode for providers that support it. AI quiz output is validated before saving; generation attempts an offline question-bank fallback if the provider fails, provided enough matching offline questions exist. Tutor and study plan features also have offline/rule-based fallbacks.

## API
| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `PUT /api/auth/me` |
| Courses | `GET /api/courses`, `GET /api/courses/categories`, `GET /api/courses/my`, `GET/POST /api/courses`, `GET/PUT/DELETE /api/courses/:id`, `POST/DELETE /api/courses/:id/enroll`, `POST/DELETE /api/courses/:id/lessons/:lessonId/complete` |
| Assignments | `GET/POST /api/assignments`, `GET/PUT/DELETE /api/assignments/:id`, `GET /api/assignments/:id/submissions`, `POST /api/assignments/:id/submissions`, `GET /api/assignments/:id/submissions/me/file`, `GET /api/assignments/:id/submissions/:submissionId/file`, `PATCH /api/assignments/:id/submissions/:submissionId/evaluate` |
| Quizzes | `POST /api/quizzes/generate`, `GET /api/quizzes`, `GET /api/quizzes/:id`, `POST /api/quizzes/:id/submit`, `DELETE /api/quizzes/:id` |
| Results | `GET /api/results`, `GET /api/results/:id`, `GET /api/results/stats`, `GET /api/results/confidence`, `GET /api/results/weak-topics`, `GET /api/results/leaderboard`, `GET /api/results/students` (teacher/admin) |
| Memory Coach | `GET/POST /api/flashcards`, `GET /api/flashcards?due=true`, `POST /api/flashcards/generate`, `PATCH/DELETE /api/flashcards/:id`, `POST /api/flashcards/:id/reviews`, `GET /api/flashcards/stats` |
| AI | `POST /api/ai/tutor`, `POST /api/ai/study-plan`, `POST /api/ai/flashcards` |
| Admin | `GET /api/users`, `GET /api/users/overview`, `GET /api/users/teacher-applications`, `POST /api/users/teacher-applications/:id/approve`, `POST /api/users/teacher-applications/:id/reject`, `PUT /api/users/:id/role`, `DELETE /api/users/:id` |

Send `Authorization: Bearer <token>` on all API routes except health, register, and login.

Assignments are stored in MongoDB alongside their student submissions. Uploads accept PDF, DOCX, ZIP, and TXT files up to 10 MB; files are served only through authenticated, ownership-checked download routes. Teachers can manage assignments for their own courses, while students can view and submit work only for enrolled courses.

Run the backend integration tests against an isolated MongoDB database whose name ends in `_test`:

```powershell
$env:TEST_MONGO_URI = "mongodb://127.0.0.1:27017/neurolearn_assignments_test"
npm test
```

## Deploy
- Database: MongoDB Atlas → put  URI in `MONGO_URI`
- Backend (Render/Railway): root `backend`, build `npm install`, start `npm start`; set env vars and `CLIENT_URL=https://your-frontend-url`
- Frontend (Vercel/Netlify): root `frontend`, build `npm run build`, output `dist`; set `VITE_API_URL=https://your-backend-url/api`; add an SPA rewrite of all paths to `/index.html`
