// src/components/Course/CourseCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Course } from '../../types';
import Button from '../Common/Button/Button';
import styles from './CourseCard.module.css';

interface CourseCardProps {
    course: Course;
    onDelete: (id: number) => void; // Add onDelete prop
}

const CourseCard: React.FC<CourseCardProps> = ({ course, onDelete }) => {
    const placeholderImage = '/vite.svg'; // Or a dedicated placeholder image URL

    // Function to safely handle potential API base URL prefix for images
    const getImageUrl = (imagePath?: string | null) => {
        if (!imagePath) {
            return placeholderImage;
        }
        // If imagePath is already a full URL, use it directly
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
            return imagePath;
        }
        // Otherwise, prepend the base URL (adjust if your API serves files differently)
        // This assumes VITE_API_BASE_URL is like 'http://localhost:8000/api'
        // and image paths are relative to the domain root, e.g., '/media/courses/image.png'
        const baseUrl = import.meta.env.VITE_API_BASE_URL.replace('/api', ''); // Get domain root
        return `${baseUrl}${imagePath}`;
    };


    return (
        <div className={styles.card}>
            <img
                src={getImageUrl(course.image)}
                alt={`${course.title} thumbnail`}
                className={styles.image}
                // Add error handling for images if needed
                onError={(e) => (e.currentTarget.src = placeholderImage)}
            />
            <div className={styles.content}>
                <h3 className={styles.title}>{course.title}</h3>
                <p className={styles.instructor}>
                    Instructor: {course.instructor?.username || 'N/A'}
                </p>
                <p className={styles.price}>Price: ${parseFloat(course.price).toFixed(2)}</p>
                <p className={styles.status}>Status: <span className={`${styles.statusBadge} ${styles[course.status]}`}>{course.status}</span></p>
                <div className={styles.actions}>
                    <Link to={`/courses/${course.id}`}>
                        <Button variant="secondary" size="small">View Details</Button>
                    </Link>
                    {/* Add Delete Button - Consider role-based access */}
                    <Button
                        variant="danger" // You'll need to add a 'danger' variant to Button.module.css
                        size="small"
                        onClick={() => onDelete(course.id)}
                        style={{ backgroundColor: '#dc3545', color: 'white' }} // Quick danger styling
                    >
                        Delete
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CourseCard;
