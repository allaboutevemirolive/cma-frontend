// src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; // Custom hook for authentication context
import LoginForm from '../components/Auth/LoginForm'; // The actual form component
import styles from './LoginPage.module.css'; // CSS Module for page-specific layout
import Spinner from '../components/Common/Spinner/Spinner'; // Optional: For loading state

const LoginPage: React.FC = () => {
    // Get authentication functions and state from context
    const { login, isLoading, isAuthenticated, isLoading: isAuthLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // State to hold login error messages
    const [error, setError] = useState<string | null>(null);

    // Determine the target path to redirect to after successful login
    // Reads the 'from' state passed during redirection (e.g., from ProtectedRoute)
    // Defaults to '/courses' if no specific 'from' path exists
    const from = (location.state as { from?: Location })?.from?.pathname || '/courses';

    // If the user is already authenticated and auth check is complete, redirect them away from login
    useEffect(() => {
        if (!isAuthLoading && isAuthenticated) {
            console.log("User already authenticated, redirecting from login page to:", from);
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, isAuthLoading, navigate, from]);


    // Handler for the LoginForm submission
    const handleLoginSubmit = async (credentials: { username: string; password: string }) => {
        setError(null); // Clear any previous errors before attempting login

        try {
            await login(credentials); // Call the login function from AuthContext
            // No navigation here, the useEffect above will handle redirection once isAuthenticated updates
            // navigate(from, { replace: true }); // Redirect after successful login
        } catch (err: any) {
            // --- Enhanced Error Handling ---
            let errorMessage = 'Login failed. Please check your credentials.'; // Default error

            // Check if the error has a response from the API
            if (err.response && err.response.data) {
                const apiError = err.response.data;
                console.error("API Login Error Response:", apiError);

                // Check for common DRF error formats
                if (typeof apiError.detail === 'string') {
                    errorMessage = apiError.detail; // e.g., "No active account found with the given credentials"
                } else if (typeof apiError.non_field_errors === 'string') {
                    errorMessage = apiError.non_field_errors;
                } else if (Array.isArray(apiError.non_field_errors) && apiError.non_field_errors.length > 0) {
                    errorMessage = apiError.non_field_errors.join(' '); // Join array errors
                } else if (typeof apiError.username === 'string') { // Check specific fields
                    errorMessage = `Username: ${apiError.username}`;
                } else if (typeof apiError.password === 'string') {
                    errorMessage = `Password: ${apiError.password}`;
                }
                // Add more specific field checks if your API returns them (e.g., apiError.email)

            } else if (err.message) {
                // Fallback to generic error message if no detailed API response
                errorMessage = err.message;
            }

            setError(errorMessage); // Set the error state to display the message
            console.error("Login failed on page:", err); // Log the full error for debugging
        }
        // isLoading state is handled by the useAuth hook internally during the login process
    };

    // Show a spinner while the initial authentication check is running
    if (isAuthLoading) {
        return (
             <div className={styles.pageContainer} style={{ alignItems: 'center', justifyContent: 'center' }}>
                 <Spinner />
             </div>
        );
    }

    // If user becomes authenticated AFTER initial load but before redirect effect runs
    if (isAuthenticated) {
        // This can happen if login finishes very quickly. Redirect immediately.
        return <Navigate to={from} replace />;
    }


    return (
        // Use the outer container for page layout (centering, padding)
        <div className={styles.pageContainer}>
            {/* Inner container for the login box styling */}
            <div className={styles.loginContainer}>
                <h1 className={styles.title}>Login</h1>

                {/* Display error message if login fails */}
                {error && (
                    <p className={styles.errorMessage} role="alert" aria-live="polite">
                        {error}
                    </p>
                )}

                {/* Render the actual login form component */}
                <LoginForm
                    onSubmit={handleLoginSubmit}
                    // Pass the isLoading state from useAuth to disable form elements during login attempt
                    isLoading={isLoading}
                />

                {/* Optional: Add a link to a registration page */}
                {/*
                <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9em' }}>
                    Don't have an account? <Link to="/register">Sign Up</Link>
                </p>
                */}
            </div>
        </div>
    );
};

export default LoginPage;
