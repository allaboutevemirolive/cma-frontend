// src/pages/CourseDetailPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

// API and Types
import { getCourseDetails, deleteCourse, enrollUser } from '../services/api';
import { Course } from '../types'; // User type needs profile and is_staff

// Custom Hooks
import { useAuth } from '../hooks/useAuth';

// Reusable UI Components
import Spinner from '../components/Common/Spinner/Spinner';
import Button from '../components/Common/Button/Button';
import Modal from '../components/Common/Modal/Modal';
import CourseForm from '../components/Course/CourseForm';

// Icons
import {
    ArrowLeft, User as UserIcon, Calendar, Tag, DollarSign, Edit, Trash2,
    AlertCircle, CheckCircle, PlusCircle, Info
} from 'lucide-react';

// Page specific styles
import styles from './CourseDetailPage.module.css';

const CourseDetailPage: React.FC = () => {
    // --- Hooks ---
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const { user, isLoading: isAuthLoading } = useAuth();

    // --- State ---
    const [course, setCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true); // Main page loading (fetch/delete)
    const [error, setError] = useState<string | null>(null); // General page error
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
    const [isEnrolling, setIsEnrolling] = useState<boolean>(false); // Specific loading for enroll button
    const [enrollError, setEnrollError] = useState<string | null>(null); // Specific error for enrollment
    // MVP Limitation: Real enrollment status check requires backend support. Defaulting to false.
    const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState<boolean>(false);

    // --- Derived State & RBAC ---
    const isValidCourseId = courseId && !isNaN(Number(courseId));
    const numericCourseId = isValidCourseId ? Number(courseId) : null;

    const canManageCourse = !isAuthLoading && user && course && (user.id === course.instructor?.id || user.is_staff === true);
    const isStudent = !isAuthLoading && user?.profile?.role === 'student';
    // Can the student potentially enroll? (Must be active course)
    const canEnroll = isStudent && course?.status === 'active' && !isAlreadyEnrolled;
    const enrollmentDisabledReason =
        course?.status !== 'active' ? `Cannot enroll in ${course?.status} courses` :
        isAlreadyEnrolled ? 'You are already enrolled' :
        null; // No reason if enrollable

    // --- Data Fetching ---
    const fetchCourse = useCallback(async () => {
        if (!numericCourseId) {
            setError('Invalid Course ID provided.');
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        setEnrollError(null); // Clear previous errors on refetch
        try {
            const data = await getCourseDetails(numericCourseId);
            setCourse(data);
            // TODO: Replace placeholder with API call to check actual enrollment status
            setIsAlreadyEnrolled(false);
        } catch (err: any) {
            console.error("Fetch course detail error:", err.response || err);
            const errorMsg = err.response?.status === 404
                ? 'Course not found.'
                : err.response?.data?.detail || err.message || 'Failed to fetch course details.';
            setError(errorMsg);
            setCourse(null); // Ensure course is null on error
        } finally {
            setIsLoading(false);
        }
    }, [numericCourseId]);

    useEffect(() => {
        fetchCourse();
    }, [fetchCourse]);

    // --- Action Handlers ---
    const handleEditSuccess = (updatedCourse: Course) => {
        setCourse(updatedCourse);
        setIsEditModalOpen(false);
        // Consider a more subtle notification than alert later (e.g., toast)
        alert('Course updated successfully!');
    };

    const handleDelete = async () => {
        if (!numericCourseId || !canManageCourse || !course) return;
        if (window.confirm(`Are you sure you want to delete the course "${course.title}"? This action cannot be undone.`)) {
            setIsLoading(true); // Use main loading state for delete
            setError(null);
            try {
                await deleteCourse(numericCourseId);
                alert('Course deleted successfully.');
                navigate('/courses');
            } catch (err: any) {
                const errorMsg = err.response?.data?.detail || err.message || 'Failed to delete course.';
                setError(errorMsg); // Show error on the page
                console.error("Delete course error:", err.response || err);
                setIsLoading(false); // Stop loading on error
            }
        }
    };

    const handleEnroll = async () => {
        if (!numericCourseId || !canEnroll || isEnrolling) return;
        setIsEnrolling(true);
        setEnrollError(null);
        try {
            await enrollUser({ course_id: numericCourseId });
            alert("Successfully enrolled!");
            setIsAlreadyEnrolled(true); // Update local state optimistically
            // Optionally refetch data: await fetchCourse();
        } catch (err: any) {
            const errorMsg = err.response?.data?.detail
                || (Array.isArray(err.response?.data?.non_field_errors) && err.response?.data?.non_field_errors[0])
                || err.message
                || 'Failed to enroll.';
            setEnrollError(errorMsg); // Show enrollment-specific error
            console.error("Enrollment error:", err.response || err);
        } finally {
            setIsEnrolling(false);
        }
    };

    // --- Helper Functions ---
    const getImageUrl = (imagePath?: string | null): string => {
        const placeholderImage = '/vite.svg';
        if (!imagePath) return placeholderImage;
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
        const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/?$/, '');
        return `${baseUrl}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`;
    };

    const formatDate = (dateString: string | null | undefined): string => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
            });
        } catch (e) { console.error("Date formatting error:", e); return 'Invalid Date'; }
    }

    const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const target = event.target as HTMLImageElement;
        const placeholderImage = '/vite.svg';
        if (target.src !== placeholderImage) { target.src = placeholderImage; }
    }

    // --- Render Logic ---

    if (isLoading || isAuthLoading) { // Show loading if either auth or course data is loading
        return (
            <div className={styles.center}>
                <Spinner />
                <span style={{ marginLeft: '1em', color: 'var(--text-color-secondary)' }}>Loading...</span>
            </div>
        );
    }

    // Show general error (fetch/delete) or if course is null after loading
    if (error || !course) {
        return (
            <div className={styles.errorContainer}>
                <div className={`${styles.errorMessage} ${styles.messageBox}`} role="alert">
                    <AlertCircle size={20} aria-hidden="true" />
                    <span>{error || 'Course data could not be loaded or course not found.'}</span>
                </div>
                <Link to="/courses">
                    <Button variant="secondary">
                        <ArrowLeft size={16} style={{ marginRight: '0.5em' }} /> Back to Courses
                    </Button>
                </Link>
            </div>
        );
    }

    // --- Main Course Detail Render ---
    return (
        <>
            <div className={styles.detailContainer}>
                <Link to="/courses" className={styles.backLink}>
                    <ArrowLeft size={16} aria-hidden="true" /> Back to Courses
                </Link>

                {/* Header: Title & Action Buttons */}
                <div className={styles.header}>
                    <h1 className={styles.title}>{course.title}</h1>
                    <div className={styles.actionButtonsContainer}>
                        {/* Manage Buttons */}
                        {canManageCourse && (
                            <>
                                <Button
                                    variant="secondary" size="small" onClick={() => setIsEditModalOpen(true)}
                                    title="Edit this course" aria-label="Edit this course" disabled={isLoading}
                                >
                                    <Edit size={16} /> <span>Edit</span>
                                </Button>
                                <Button
                                    variant="danger" size="small" onClick={handleDelete}
                                    title="Delete this course" aria-label="Delete this course" isLoading={isLoading}
                                >
                                    <Trash2 size={16} /> <span>Delete</span>
                                </Button>
                            </>
                        )}
                        {/* Enroll Button */}
                        {isStudent && (
                            <Button
                                variant={isAlreadyEnrolled ? "secondary" : "primary"} size="small" onClick={handleEnroll}
                                disabled={isAlreadyEnrolled || isEnrolling || course.status !== 'active'}
                                isLoading={isEnrolling}
                                title={enrollmentDisabledReason ?? (isAlreadyEnrolled ? 'Already Enrolled' : 'Enroll in this course')}
                                aria-label={isAlreadyEnrolled ? 'Already enrolled' : 'Enroll in this course'}
                            >
                                {isAlreadyEnrolled ? <CheckCircle size={16} /> : <PlusCircle size={16} />}
                                <span style={{ marginLeft: '0.4em' }}>
                                    {isAlreadyEnrolled ? 'Enrolled' : 'Enroll Now'}
                                </span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Enrollment Error/Info Message Area */}
                 {enrollError && (
                    <p className={`${styles.errorMessage} ${styles.messageBox}`} role="alert">
                        <AlertCircle size={16} aria-hidden="true" />
                        <span>{enrollError}</span>
                    </p>
                )}
                 {enrollmentDisabledReason && !isAlreadyEnrolled && !enrollError && (
                     <p className={`${styles.infoMessage} ${styles.messageBox}`} role="status">
                         <Info size={16} aria-hidden="true" />
                         <span>{enrollmentDisabledReason}</span>
                     </p>
                )}

                {/* Course Image */}
                <figure style={{ margin: 0 }}> {/* Use figure semantically */}
                    <img
                        src={getImageUrl(course.image)}
                        alt={`Promotional image for ${course.title}`}
                        className={styles.courseImage}
                        onError={handleImageError}
                        loading="lazy"
                    />
                    {/* Optional: <figcaption>Image caption</figcaption> */}
                </figure>

                {/* Main Content: Description & Meta */}
                <div className={styles.content}>
                    <section aria-label="Course description">
                        <p className={styles.description}>{course.description}</p>
                    </section>

                    <section aria-label="Course details" className={styles.metaGrid}>
                        <div className={styles.metaItem}>
                            <UserIcon size={16} aria-hidden="true" />
                            <strong>Instructor:</strong> <span>{course.instructor?.username || 'N/A'}</span>
                        </div>
                        <div className={styles.metaItem}>
                            <DollarSign size={16} aria-hidden="true" />
                            <strong>Price:</strong> <span className={styles.price}>${parseFloat(course.price).toFixed(2)}</span>
                        </div>
                        <div className={styles.metaItem}>
                            <Tag size={16} aria-hidden="true" />
                            <strong>Status:</strong>
                            <span className={`${styles.statusBadge} ${styles[course.status] || ''}`}>{course.status}</span>
                        </div>
                        <div className={styles.metaItem}>
                            <Calendar size={16} aria-hidden="true" />
                            <strong>Created:</strong> <span>{formatDate(course.created_at)}</span>
                        </div>
                        <div className={styles.metaItem}>
                            <Calendar size={16} aria-hidden="true" />
                            <strong>Updated:</strong> <span>{formatDate(course.updated_at)}</span>
                        </div>
                    </section>
                </div>
            </div>

            {/* Edit Modal (Conditional) */}
            {canManageCourse && (
                <Modal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    title={`Edit Course: ${course.title}`}
                >
                    <CourseForm
                        initialValues={course}
                        user={user} // Pass instructor object if needed by form logic
                        onSuccess={handleEditSuccess}
                        onCancel={() => setIsEditModalOpen(false)}
                    />
                </Modal>
            )}
        </>
    );
};

export default CourseDetailPage;
