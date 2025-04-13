// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Loader2 } from "lucide-react"; // Use lucide spinner

// Import Pages
import LoginPage from './pages/LoginPage';
import CourseListPage from './pages/CourseListPage';
import CourseDetailPage from './pages/CourseDetailPage';
import NotFoundPage from './pages/NotFoundPage';

// Import Layout/Common Components
import Header from './components/Layout/Header';
import { Toaster } from "@/components/ui/sonner";

// Component to protect routes
const ProtectedRoute: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        // Full page loading indicator
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />; // Outlet renders the matched child route component
};


function App() {
    // isLoading check moved inside ProtectedRoute for initial load

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            {/* Main content takes remaining height */}
            <main className="flex-grow">
                <Routes>
                    {/* Public Route */}
                    <Route path="/login" element={<LoginPage />} />

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
            {/* Add Toaster globally */}
            <Toaster />
            {/* Optional Footer can go here */}
            {/* <footer className="py-4 border-t text-center text-xs text-muted-foreground">
                 © {new Date().getFullYear()} CourseApp
            </footer> */}
        </div>
    );
}

export default App;
