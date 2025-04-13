// src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoginForm from '../components/Auth/LoginForm'; // Import the form component
import styles from './LoginPage.module.css'; // Import CSS Module

const LoginPage: React.FC = () => {
    const { login, isLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [error, setError] = useState<string | null>(null);

    // Get the path to redirect to after login, default to '/courses'
    const from = (location.state as { from?: Location })?.from?.pathname || '/courses';

    const handleLoginSubmit = async (credentials: { username: string; password: string }) => {
        setError(null); // Clear previous errors
        try {
            await login(credentials);
            navigate(from, { replace: true }); // Redirect after successful login
        } catch (err: any) {
            // Extract error message (customize based on your API error structure)
            const errorMessage = err.response?.data?.detail || err.message || 'Login failed. Please check your credentials.';
            setError(errorMessage);
            console.error("Login failed on page:", err);
        }
    };

    return (
        <div className={styles.loginContainer}>
            <h1 className={styles.title}>Login</h1>
            {error && <p className={styles.errorMessage}>{error}</p>}
            <LoginForm onSubmit={handleLoginSubmit} isLoading={isLoading} />
            {/* Add link to registration page if applicable */}
        </div>
    );
};

export default LoginPage;
