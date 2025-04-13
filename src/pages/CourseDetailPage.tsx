// src/pages/CourseDetailPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCourseDetails } from '../services/api';
import { Course } from '../types';
import Spinner from '../components/Common/Spinner/Spinner';
import Button from '../components/Common/Button/Button';
import Modal from '../components/Common/Modal/Modal';
import CourseForm from '../components/Course/CourseForm';
import styles from './CourseDetailPage.module.css';

const CourseDetailPage: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const [course, setCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

    const fetchCourse = useCallback(async () => {
        if (!courseId) {
            setError('Course ID is missing.');
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const data = await getCourseDetails(courseId);
            setCourse(data);
        } catch (err: any) {
            if (err.response && err.response.status === 404) {
                setError('Course not found.');
            } else {
                setError(err.message || 'Failed to fetch course details.');
            }
            console.error("Fetch course detail error:", err);
        } finally {
            setIsLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        fetchCourse();
    }, [fetchCourse]); // Fetch when component mounts or courseId changes

    const handleEditSuccess = (updatedCourse: Course) => {
        setCourse(updatedCourse); // Update local state with edited data
        setIsEditModalOpen(false);
    };

    const placeholderImage = '/vite.svg';
    const getImageUrl = (imagePath?: string | null) => {
        if (!imagePath) return placeholderImage;
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
        const baseUrl = import.meta.env.VITE_API_BASE_URL.replace('/api', '');
        return `${baseUrl}${imagePath}`;
    };


    if (isLoading) {
        return <div className={styles.center}><Spinner /></div>;
    }

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <p className={styles.errorMessage}>{error}</p>
                <Link to="/courses"><Button variant="secondary">Back to Courses</Button></Link>
            </div>
        );
    }

    if (!course) {
        return <p className={styles.center}>Course data is not available.</p>; // Should ideally be handled by error state
    }

    // Format date for better readability
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    return (
        <div className={styles.detailContainer}>
            <Link to="/courses" className={styles.backLink}>← Back to Courses</Link>

            <div className={styles.header}>
                <h1 className={styles.title}>{course.title}</h1>
                <Button variant="primary" onClick={() => setIsEditModalOpen(true)}>
                    Edit Course
                </Button>
            </div>


            {course.image && (
                <img
                    src={getImageUrl(course.image)}
                    alt={course.title}
                    className={styles.courseImage}
                    onError={(e) => (e.currentTarget.src = placeholderImage)}
                />
            )}

            <div className={styles.content}>
                <p className={styles.description}>{course.description}</p>
                <div className={styles.metaGrid}>
                    <div className={styles.metaItem}>
                        <strong>Instructor:</strong> {course.instructor?.username || 'N/A'}
                    </div>
                    <div className={styles.metaItem}>
                        <strong>Price:</strong> ${parseFloat(course.price).toFixed(2)}
                    </div>
                    <div className={styles.metaItem}>
                        <strong>Status:</strong> <span className={`${styles.statusBadge} ${styles[course.status]}`}>{course.status}</span>
                    </div>
                    <div className={styles.metaItem}>
                        <strong>Created:</strong> {formatDate(course.created_at)}
                    </div>
                    <div className={styles.metaItem}>
                        <strong>Last Updated:</strong> {formatDate(course.updated_at)}
                    </div>
                </div>
                {/* Add more details if needed */}
            </div>

            {/* Edit Course Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Course">
                <CourseForm
                    initialValues={course} // Pass current course data to the form
                    onSuccess={handleEditSuccess}
                    onCancel={() => setIsEditModalOpen(false)}
                />
            </Modal>
        </div>
    );
};

export default CourseDetailPage;
