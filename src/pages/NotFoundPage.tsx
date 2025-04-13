// src/pages/NotFoundPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Common/Button/Button';

const NotFoundPage: React.FC = () => {
    return (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', minHeight: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <h1 style={{ fontSize: '6em', margin: '0', color: '#aaa' }}>404</h1>
            <h2 style={{ margin: '0 0 1rem 0', color: '#888' }}>Page Not Found</h2>
            <p style={{ marginBottom: '2rem', color: '#666' }}>
                Sorry, the page you are looking for does not exist.
            </p>
            <Link to="/courses">
                <Button variant="primary">Go to Courses</Button>
            </Link>
        </div>
    );
};

export default NotFoundPage;
