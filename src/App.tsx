// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { UserProfile } from './types';

// --- Pages ---
import LoginPage from './pages/LoginPage';
import CourseListPage from './pages/CourseListPage';
import CourseDetailPage from './pages/CourseDetailPage';
import NotFoundPage from './pages/NotFoundPage';
import MyEnrollmentsPage from './pages/MyEnrollmentsPage';
import QuizPage from './pages/QuizPage';
import SubmissionResultPage from './pages/SubmissionResultPage';
import ManageQuizzesPage from './pages/ManageQuizzesPage';
import QuizSubmissionsListPage from './pages/QuizSubmissionsListPage';
import QuizListPage from './pages/QuizListPage'; // Import the Quiz List page


// --- Placeholder Pages (Create these files later if needed) ---
// import InstructorDashboard from './pages/InstructorDashboard';
// import AdminDashboard from './pages/AdminDashboard';
// import CreateCoursePage from './pages/CreateCoursePage';
// import UserManagementPage from './pages/UserManagementPage';
// import SettingsPage from './pages/SettingsPage';
// import ForbiddenPage from './pages/ForbiddenPage';

// --- Layout & Common Components ---
import Header from './components/Layout/Header';
import Spinner from './components/Common/Spinner/Spinner';

// --- Protected Route Components ---

// ProtectedRoute remains the same...
const ProtectedRoute: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <Spinner />
            </div>
        );
    }

    if (!isAuthenticated) {
        console.log("ProtectedRoute: Not authenticated, redirecting to login.");
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return <Outlet />;
};


// RoleProtectedRoute remains the same...
const RoleProtectedRoute: React.FC<{ allowedRoles: Array<UserProfile['role']> }> = ({ allowedRoles }) => {
    const { isAuthenticated, isLoading, user } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <Spinner />
            </div>
        );
    }

    if (!isAuthenticated) {
        console.log("RoleProtectedRoute: Not authenticated, redirecting to login.");
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const userRole = user?.profile?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
        console.warn(`Role access denied: User role "${userRole}" not in allowed roles "${allowedRoles.join(', ')}" for path "${location.pathname}"`);
        return <Navigate to="/courses" replace />;
    }
    return <Outlet />;
};


// --- Main Application Component ---
function App() {
    return (
        <>
            <Header />
            <main style={{ padding: '1rem' }}>
                <Routes>
                    {/* --- Public Routes --- */}
                    <Route path="/login" element={<LoginPage />} />


                    {/* --- Protected Routes (Require Authentication) --- */}
                    <Route element={<ProtectedRoute />}>

                        {/* Redirect root "/" to "/courses" for logged-in users */}
                        <Route path="/" element={<Navigate to="/courses" replace />} />

                        {/* --- General Authenticated Routes (Accessible by all logged-in users) --- */}
                        <Route path="/courses" element={<CourseListPage />} />
                        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
                        {/* My Enrollments is likely student-specific, but keep general for now unless needed */}
                        <Route path="/my-enrollments" element={<MyEnrollmentsPage />} />
                        <Route path="/quizzes/:quizId/take" element={<QuizPage />} />
                        <Route path="/submissions/:submissionId" element={<SubmissionResultPage />} />


                        {/* --- Instructor/Admin Only Routes --- */}
                        <Route element={<RoleProtectedRoute allowedRoles={['instructor', 'admin']} />}>
                            {/* Example: Instructor Dashboard */}
                            {/* <Route path="/instructor/dashboard" element={<InstructorDashboard />} /> */}

                            {/* --- ADDED: Routes for new placeholder pages --- */}
                            {/* General Quizzes Management/List */}
                            <Route path="/quizzes" element={<QuizListPage />} />
                             {/* Specific Quiz Management (maybe within course detail later) */}
                            <Route path="/manage-quizzes" element={<ManageQuizzesPage />} />
                            {/* General Submissions List */}
                            <Route path="/submissions" element={<QuizSubmissionsListPage />} />

                            {/* Example: Page to manage quizzes for a specific course (more specific path) */}
                            {/* <Route path="/courses/:courseId/manage-quizzes" element={<ManageQuizzesPage />} /> */}
                            {/* Example: Route to view all submissions for a specific quiz (more specific path) */}
                            {/* <Route path="/quizzes/:quizId/submissions" element={<QuizSubmissionsListPage />} /> */}

                            {/* Example: Route to create a new course (if using a dedicated page) */}
                            {/* <Route path="/courses/create" element={<CreateCoursePage />} /> */}
                        </Route>


                        {/* --- Admin Only Routes --- */}
                        <Route element={<RoleProtectedRoute allowedRoles={['admin']} />}>
                            {/* Example: Admin Dashboard */}
                            {/* <Route path="/admin/dashboard" element={<AdminDashboard />} /> */}
                            {/* Example: User Management Page */}
                            {/* <Route path="/admin/users" element={<UserManagementPage />} /> */}
                            {/* Example: System Settings Page */}
                            {/* <Route path="/admin/settings" element={<SettingsPage />} /> */}
                        </Route>

                    </Route> {/* End of all Protected Routes */}


                    {/* --- Catch-all 404 Not Found Route --- */}
                    <Route path="*" element={<NotFoundPage />} />

                    {/* Optional: Add a dedicated Forbidden page route */}
                    {/* <Route path="/forbidden" element={<ForbiddenPage />} /> */}

                </Routes>
            </main>
        </>
    );
}

export default App;
