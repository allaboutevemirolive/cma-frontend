// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// Import Pages
import LoginPage from './pages/LoginPage';
import CourseListPage from './pages/CourseListPage';
import CourseDetailPage from './pages/CourseDetailPage';
import NotFoundPage from './pages/NotFoundPage';
import RegistrationPage from './pages/RegistrationPage'; // <-- Import new page

// Import Layout/Common Components if needed
import Header from './components/Layout/Header';
import Spinner from './components/Common/Spinner/Spinner';

// Component to protect routes
const ProtectedRoute: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spinner /></div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />; // Pass current location
    }

    return <Outlet />;
};


function App() {

    return (
        <>
            <Header />
            <main style={{ padding: '1rem' }}>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegistrationPage />} />

                    {/* Protected Routes */}
                    <Route element={<ProtectedRoute />}>
                        <Route path="/" element={<Navigate to="/courses" replace />} />
                        <Route path="/courses" element={<CourseListPage />} />
                        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
                        {/* Add other protected routes here */}
                    </Route>

                    {/* Catch-all 404 Not Found Route */}
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </main>
        </>
    );
}

export default App;
