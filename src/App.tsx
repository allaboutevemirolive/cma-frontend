// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// Import Pages
import LoginPage from './pages/LoginPage';
import CourseListPage from './pages/CourseListPage';
import CourseDetailPage from './pages/CourseDetailPage';
import NotFoundPage from './pages/NotFoundPage'; // Optional

// Import Layout/Common Components if needed
import Header from './components/Layout/Header'; // Example Header
import Spinner from './components/Common/Spinner/Spinner'; // Example Loading Spinner

// Component to protect routes
const ProtectedRoute: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        // Show a loading indicator while checking auth state
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spinner /></div>;
    }

    if (!isAuthenticated) {
        // Redirect to login page if not authenticated
        // Pass the current location to redirect back after login (optional)
        return <Navigate to="/login" replace />;
    }

    // Render the child route component if authenticated
    return <Outlet />; // Outlet renders the matched child route component
};


function App() {
    
    // Optional: Prevent rendering routes until auth state is confirmed
    // if (isLoading) {
    //   return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spinner /></div>;
    // }

    return (
        <>
            <Header /> {/* Example Header component */}
            <main style={{ padding: '1rem' }}> {/* Add some basic layout padding */}
                <Routes>
                    {/* Public Route */}
                    <Route path="/login" element={<LoginPage />} />

                    {/* Protected Routes */}
                    <Route element={<ProtectedRoute />}>
                        <Route path="/" element={<Navigate to="/courses" replace />} /> {/* Redirect root to courses */}
                        <Route path="/courses" element={<CourseListPage />} />
                        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
                        {/* Add other protected routes here (e.g., /courses/create if using a page) */}
                    </Route>

                    {/* Catch-all 404 Not Found Route */}
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </main>
        </>
    );
}

export default App;
