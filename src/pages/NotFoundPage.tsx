// src/pages/NotFoundPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Common/Button/Button';

const NotFoundPage: React.FC = () => {
    return (
        <div style={{
            textAlign: 'center',
            padding: '4rem 1rem',
            minHeight: '70vh', // Ensure it takes significant height
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'var(--text-color-secondary)', // Use theme color
            flexGrow: 1 // Make it fill remaining space in #root
        }}>
            <h1 style={{
                fontSize: 'clamp(4em, 15vw, 8em)', // Responsive font size
                margin: '0',
                fontWeight: 'bold',
                color: 'var(--border-color)' // Use a subtle theme color
            }}>
                404
            </h1>
            <h2 style={{
                margin: '0.5rem 0 1rem 0',
                fontWeight: '500',
                color: 'var(--text-color-primary)' // Use theme color
            }}>
                Page Not Found
            </h2>
            <p style={{ marginBottom: '2rem', maxWidth: '400px' }}>
                Sorry, the page you are looking for does not exist or may have been moved.
            </p>
            <Link to="/courses">
                <Button variant="primary">Go Back to Courses</Button>
            </Link>
        </div>
    );
};

export default NotFoundPage;
