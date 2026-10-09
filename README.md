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
Requirements: Node.js 18+ and MongoDB (local) or a MongoDB Atlas URI.

```bash
# 1) Backend
cd backend
npm install
cp .env.example .env        # Windows: copy .env.example .env   (then edit MONGO_URI / JWT_SECRET)
npm run seed                # demo users + courses
npm run dev                 # http://localhost:5000

# 2) Frontend (new terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Demo logins (after seed): `student@neurolearn.com / Student@123`, `teacher@neurolearn.com / Teacher@123`, `admin@neurolearn.com / Admin@123`

## AI setup
`AI_PROVIDER=mock` (default) works with no key using a built-in question bank (Arrays, Recursion, Sorting, Trees, SQL Joins, Normalization).
For real AI on any topic set in `backend/.env`:
- Gemini: `AI_PROVIDER=gemini`, `GEMINI_API_KEY=...` (free key: aistudio.google.com)
- OpenAI: `AI_PROVIDER=openai`, `OPENAI_API_KEY=...`
Model names live in `GEMINI_MODEL` / `OPENAI_MODEL`; change them if a model is retired.
All AI output is parsed and validated (4 options, valid answer index, no duplicates) before saving; on failure the app falls back to the offline bank.

## API
| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `PUT /api/auth/me` |
| Courses | `GET/POST /api/courses`, `GET/PUT/DELETE /api/courses/:id`, `GET /api/courses/my`, `POST/DELETE /api/courses/:id/enroll`, `POST/DELETE /api/courses/:id/lessons/:lessonId/complete` |
| Quizzes | `POST /api/quizzes/generate`, `GET /api/quizzes`, `GET /api/quizzes/:id`, `POST /api/quizzes/:id/submit`, `DELETE /api/quizzes/:id` |
| Results | `GET /api/results`, `GET /api/results/:id`, `GET /api/results/stats`, `GET /api/results/weak-topics`, `GET /api/results/leaderboard` |
| Admin | `GET /api/users`, `GET /api/users/overview`, `PUT /api/users/:id/role`, `DELETE /api/users/:id` |

Send `Authorization: Bearer <token>` on all routes except register/login.

## Deploy
- Database: MongoDB Atlas → put  URI in `MONGO_URI`
- Backend (Render/Railway): root `backend`, build `npm install`, start `npm start`; set env vars and `CLIENT_URL=https://your-frontend-url`
- Frontend (Vercel/Netlify): root `frontend`, build `npm run build`, output `dist`; set `VITE_API_URL=https://your-backend-url/api`; add an SPA rewrite of all paths to `/index.html`
