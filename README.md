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
## AI Setup

NeuroLearn supports multiple AI providers for dynamic quiz generation. You can switch between providers using environment variables in `backend/.env`.

### Supported AI Providers

`AI_PROVIDER=mock` (default) works without an API key using a built-in offline question bank covering Arrays, Recursion, Sorting, Trees, SQL Joins, and Normalization.

For AI-powered question generation on any topic, configure one of the following providers:

- **Gemini:** `AI_PROVIDER=gemini`, `GEMINI_API_KEY=...`
  - Get your API key: https://aistudio.google.com/

- **OpenAI:** `AI_PROVIDER=openai`, `OPENAI_API_KEY=...`
  - Get your API key: https://platform.openai.com/api-keys

- **OpenRouter:** `AI_PROVIDER=openrouter`, `OPENROUTER_API_KEY=...`
  - Get your API key: https://openrouter.ai/keys
  - Supports multiple AI models through a single API.

### Environment Configuration

Add the selected provider's configuration to `backend/.env`.

**OpenRouter Example:**
```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=your_model_name
```

**Gemini Example:**
```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=your_model_name
```

**OpenAI Example:**
```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=your_model_name
```

**Offline Mode:**
```env
AI_PROVIDER=mock
```

### AI Validation & Fallback

- AI-generated questions are parsed and validated before saving.
- Each question must contain exactly four answer options.
- The correct answer index must be valid.
- Duplicate options are rejected.
- If AI generation fails or returns invalid output, NeuroLearn automatically falls back to the built-in offline question bank.

**Note:** Model names are configurable through the respective environment variables. Update them if a model becomes unavailable or is retired. Never commit API keys or `.env` files to GitHub.

## API

## API
| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `PUT /api/auth/me` |
| Courses | `GET/POST /api/courses`, `GET/PUT/DELETE /api/courses/:id`, `GET /api/courses/my`, `POST/DELETE /api/courses/:id/enroll`, `POST/DELETE /api/courses/:id/lessons/:lessonId/complete` |
| Quizzes | `POST /api/quizzes/generate`, `GET /api/quizzes`, `GET /api/quizzes/:id`, `POST /api/quizzes/:id/submit`, `DELETE /api/quizzes/:id` |
| Results | `GET /api/results`, `GET /api/results/:id`, `GET /api/results/stats`, `GET /api/results/weak-topics`, `GET /api/results/leaderboard` |
| Memory Coach | `GET/POST /api/flashcards`, `GET /api/flashcards?due=true`, `POST /api/flashcards/generate`, `PATCH/DELETE /api/flashcards/:id`, `POST /api/flashcards/:id/reviews`, `GET /api/flashcards/stats` |
| Admin | `GET /api/users`, `GET /api/users/overview`, `PUT /api/users/:id/role`, `DELETE /api/users/:id` |

Send `Authorization: Bearer <token>` on all routes except register/login.

## Deploy
- Database: MongoDB Atlas → put  URI in `MONGO_URI`
- Backend (Render/Railway): root `backend`, build `npm install`, start `npm start`; set env vars and `CLIENT_URL=https://your-frontend-url`
- Frontend (Vercel/Netlify): root `frontend`, build `npm run build`, output `dist`; set `VITE_API_URL=https://your-backend-url/api`; add an SPA rewrite of all paths to `/index.html`
