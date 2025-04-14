// src/pages/RegistrationPage.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import RegistrationForm from '../components/Auth/RegistrationForm';
import { registerUser } from '../services/api'; // Import the API function
import { RegistrationPayload } from '../types';
import styles from './RegistrationPage.module.css'; // Create this CSS file

const RegistrationPage: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRegisterSubmit = async (payload: RegistrationPayload) => {
        setError(null);
        setIsLoading(true);
        try {
            // Don't need password2 for API call itself if backend uses password validation
            const { password2, ...apiPayload } = payload;
            await registerUser(apiPayload);
            alert('Registration successful! Please log in.');
            navigate('/login'); // Redirect to login page after successful registration
        } catch (err: any) {
            let errorMessage = 'Registration failed. Please try again.';
            if (err.response && err.response.data) {
                const apiErrors = err.response.data;
                console.error("API Registration Error:", apiErrors);
                // More detailed error handling
                if (typeof apiErrors === 'object') {
                    if (apiErrors.detail) {
                        errorMessage = apiErrors.detail;
                    } else if (apiErrors.non_field_errors) {
                        errorMessage = Array.isArray(apiErrors.non_field_errors) ? apiErrors.non_field_errors.join(' ') : apiErrors.non_field_errors;
                    } else {
                        // Combine field-specific errors
                        const fieldErrors = Object.entries(apiErrors)
                            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                            .join('; ');
                        if (fieldErrors) errorMessage = fieldErrors;
                    }
                } else if (typeof apiErrors === 'string') {
                    errorMessage = apiErrors;
                }
            } else if (err.message) {
                errorMessage = err.message;
            }
            setError(errorMessage);
            console.error("Registration failed on page:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.registerContainer}>
                <h1 className={styles.title}>Register</h1>
                {error && (
                    <p className={styles.errorMessage} role="alert" aria-live="polite">
                        {error}
                    </p>
                )}
                <RegistrationForm onSubmit={handleRegisterSubmit} isLoading={isLoading} />
                <p className={styles.loginLink}>
                    Already have an account? <Link to="/login">Login here</Link>
                </p>
            </div>
        </div>
    );
};

export default RegistrationPage;
