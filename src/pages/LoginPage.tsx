// src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoginForm from '../components/Auth/LoginForm';
import styles from './LoginPage.module.css';
import Spinner from '../components/Common/Spinner/Spinner';

const LoginPage: React.FC = () => {

    const { login, isLoading, isAuthenticated, isLoading: isAuthLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [error, setError] = useState<string | null>(null);

    const from = (location.state as { from?: Location })?.from?.pathname || '/courses';

    useEffect(() => {
        if (!isAuthLoading && isAuthenticated) {
            console.log("User already authenticated, redirecting from login page to:", from);
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, isAuthLoading, navigate, from]);

    const handleLoginSubmit = async (credentials: { username: string; password: string }) => {
        setError(null);

        try {
            await login(credentials);

        } catch (err: any) {

            let errorMessage = 'Login failed. Please check your credentials.';

            if (err.response && err.response.data) {
                const apiError = err.response.data;
                console.error("API Login Error Response:", apiError);

                if (typeof apiError.detail === 'string') {
                    errorMessage = apiError.detail;
                } else if (typeof apiError.non_field_errors === 'string') {
                    errorMessage = apiError.non_field_errors;
                } else if (Array.isArray(apiError.non_field_errors) && apiError.non_field_errors.length > 0) {
                    errorMessage = apiError.non_field_errors.join(' ');
                } else if (typeof apiError.username === 'string') {
                    errorMessage = `Username: ${apiError.username}`;
                } else if (typeof apiError.password === 'string') {
                    errorMessage = `Password: ${apiError.password}`;
                }

            } else if (err.message) {

                errorMessage = err.message;
            }

            setError(errorMessage);
            console.error("Login failed on page:", err);
        }

    };

    if (isAuthLoading) {
        return (
            <div className={styles.pageContainer} style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Spinner />
            </div>
        );
    }

    if (isAuthenticated) {

        return <Navigate to={from} replace />;
    }

    return (

        <div className={styles.pageContainer}>
            {}
            <div className={styles.loginContainer}>
                <h1 className={styles.title}>Login</h1>

                {error && (
                    <p className={styles.errorMessage} role="alert" aria-live="polite">
                        {error}
                    </p>
                )}

                <LoginForm
                    onSubmit={handleLoginSubmit}

                    isLoading={isLoading}
                />

            </div>
        </div>
    );
};

export default LoginPage;
