import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import MyCourses from './pages/MyCourses';
import Quizzes from './pages/Quizzes';
import Quiz from './pages/Quiz';
import Result from './pages/Result';
import Performance from './pages/Performance';
import Profile from './pages/Profile';
import Manage from './pages/Manage';
import CourseForm from './pages/CourseForm';
import Tutor from './pages/Tutor';
import StudyPlan from './pages/StudyPlan';
import Flashcards from './pages/Flashcards';
import Students from './pages/Students';
import { useAuth } from './context/AuthContext';

const P = ({ children, roles }) => <ProtectedRoute roles={roles}>{children}</ProtectedRoute>;

export default function App() {
  const { user } = useAuth();
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/dashboard" element={<P><Dashboard /></P>} />
        <Route path="/courses" element={<P><Courses /></P>} />
        <Route path="/courses/:id" element={<P><CourseDetail /></P>} />
        <Route path="/my-courses" element={<P><MyCourses /></P>} />
        <Route path="/quizzes" element={<P><Quizzes /></P>} />
        <Route path="/quiz/:id" element={<P><Quiz /></P>} />
        <Route path="/results/:id" element={<P><Result /></P>} />
        <Route path="/performance" element={<P><Performance /></P>} />
        <Route path="/profile" element={<P><Profile /></P>} />
        <Route path="/tutor" element={<P><Tutor /></P>} />
        <Route path="/study-plan" element={<P><StudyPlan /></P>} />
        <Route path="/flashcards" element={<P><Flashcards /></P>} />
        <Route path="/students" element={<P roles={['teacher', 'admin']}><Students /></P>} />

        <Route path="/manage" element={<P roles={['teacher', 'admin']}><Manage /></P>} />
        <Route path="/manage/course/new" element={<P roles={['teacher', 'admin']}><CourseForm /></P>} />
        <Route path="/manage/course/:id" element={<P roles={['teacher', 'admin']}><CourseForm /></P>} />

        <Route path="*" element={<div className="page text-center"><h1 className="text-4xl font-bold">404</h1><p className="mt-2 text-slate-500">Page not found</p></div>} />
      </Routes>
    </>
  );
}