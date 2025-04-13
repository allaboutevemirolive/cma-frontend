// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { UserProfile } from './types'; // Import the UserProfile type

// --- Pages ---
import LoginPage from './pages/LoginPage';
import CourseListPage from './pages/CourseListPage';
import CourseDetailPage from './pages/CourseDetailPage';
import NotFoundPage from './pages/NotFoundPage';
import MyEnrollmentsPage from './pages/MyEnrollmentsPage'; // Import the page
import QuizPage from './pages/QuizPage'; // Import the page
import SubmissionResultPage from './pages/SubmissionResultPage'; // Import the page

// --- Placeholder Pages (Create these files later if needed) ---
// import InstructorDashboard from './pages/InstructorDashboard';
// import AdminDashboard from './pages/AdminDashboard';
// import CreateCoursePage from './pages/CreateCoursePage'; // Example if using a dedicated page
// import ManageQuizzesPage from './pages/ManageQuizzesPage'; // Example
// import QuizSubmissionsListPage from './pages/QuizSubmissionsListPage'; // Example
// import UserManagementPage from './pages/UserManagementPage'; // Example
// import SettingsPage from './pages/SettingsPage'; // Example
// import ForbiddenPage from './pages/ForbiddenPage'; // Example

// --- Layout & Common Components ---
import Header from './components/Layout/Header';
import Spinner from './components/Common/Spinner/Spinner'; // Used in Protected Routes

// --- Protected Route Components ---

/**
 * Protects routes that require authentication.
 * Redirects to login if not authenticated, otherwise renders the child route.
 */
const ProtectedRoute: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation(); // Get current location to redirect back

    // Show loading spinner while authentication status is being determined
    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <Spinner />
            </div>
        );
    }

    // If not authenticated, redirect to the login page, passing the intended destination
    if (!isAuthenticated) {
        console.log("ProtectedRoute: Not authenticated, redirecting to login.");
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If authenticated, render the nested routes defined within this ProtectedRoute
    return <Outlet />;
};

/**
 * Protects routes based on user roles.
 * Requires authentication and checks if the user's role is in the allowed list.
 */
const RoleProtectedRoute: React.FC<{ allowedRoles: Array<UserProfile['role']> }> = ({ allowedRoles }) => {
    const { isAuthenticated, isLoading, user } = useAuth();
    const location = useLocation();

    // Show loading spinner while checking authentication or user data
    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <Spinner />
            </div>
        );
    }

    // If not authenticated, redirect to login (handled by parent ProtectedRoute usually, but good fallback)
    if (!isAuthenticated) {
        console.log("RoleProtectedRoute: Not authenticated, redirecting to login.");
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check if the user's role is allowed
    const userRole = user?.profile?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
        // User is authenticated but doesn't have the required role
        console.warn(`Role access denied: User role "${userRole}" not in allowed roles "${allowedRoles.join(', ')}" for path "${location.pathname}"`);
        // Redirect to a safe page (e.g., course list or a dedicated 'Forbidden' page)
        return <Navigate to="/courses" replace />; // Consider creating a ForbiddenPage component
        // return <Navigate to="/forbidden" replace />; // Example using a dedicated page
    }

    // If authenticated and role is allowed, render the nested routes
    return <Outlet />;
};


// --- Main Application Component ---
function App() {
    // We don't need to call useAuth() here unless App directly needs user info
    // Header and Protected Routes handle authentication checks

    return (
        <>
            {/* Header is always displayed, outside the main routing content */}
            <Header />

            {/* Main content area where routed pages will be rendered */}
            <main style={{ padding: '1rem' }}> {/* Basic padding for content */}
                <Routes>
                    {/* --- Public Routes --- */}
                    <Route path="/login" element={<LoginPage />} />


                    {/* --- Protected Routes (Require Authentication) --- */}
                    {/* All routes nested within this element will require the user to be logged in */}
                    <Route element={<ProtectedRoute />}>

                        {/* Redirect root "/" to "/courses" for logged-in users */}
                        <Route path="/" element={<Navigate to="/courses" replace />} />

                        {/* --- General Authenticated Routes (Accessible by all logged-in users) --- */}
                        <Route path="/courses" element={<CourseListPage />} />
                        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
                        <Route path="/my-enrollments" element={<MyEnrollmentsPage />} />
                        <Route path="/quizzes/:quizId/take" element={<QuizPage />} />
                        <Route path="/submissions/:submissionId" element={<SubmissionResultPage />} />


                        {/* --- Instructor/Admin Only Routes --- */}
                        {/* Routes nested here require authentication AND 'instructor' or 'admin' role */}
                        <Route element={<RoleProtectedRoute allowedRoles={['instructor', 'admin']} />}>
                            {/* Example: Instructor Dashboard */}
                            {/* <Route path="/instructor/dashboard" element={<InstructorDashboard />} /> */}

                            {/* Example: Page to manage quizzes for a specific course */}
                            {/* <Route path="/courses/:courseId/manage-quizzes" element={<ManageQuizzesPage />} /> */}

                            {/* Example: Route to create a new course (if using a dedicated page) */}
                            {/* <Route path="/courses/create" element={<CreateCoursePage />} /> */}

                            {/* Example: Route for instructors/admins to view all submissions for a quiz */}
                            {/* <Route path="/quizzes/:quizId/submissions" element={<QuizSubmissionsListPage />} /> */}
                        </Route>


                        {/* --- Admin Only Routes --- */}
                        {/* Routes nested here require authentication AND 'admin' role */}
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
                    {/* This matches any path not explicitly defined above */}
                    <Route path="*" element={<NotFoundPage />} />

                    {/* Optional: Add a dedicated Forbidden page route */}
                    {/* <Route path="/forbidden" element={<ForbiddenPage />} /> */}

                </Routes>
            </main>
        </>
    );
}

export default App;
