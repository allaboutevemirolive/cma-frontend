// src/pages/CourseDetailPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

// API and Types
import { getCourseDetails, deleteCourse, enrollUser } from '../services/api'; // Added enrollUser
import { Course } from '../types'; // Ensure User type includes profile and is_staff

// Custom Hooks
import { useAuth } from '../hooks/useAuth';

// Reusable UI Components
import Spinner from '../components/Common/Spinner/Spinner';
import Button from '../components/Common/Button/Button';
import Modal from '../components/Common/Modal/Modal';
import CourseForm from '../components/Course/CourseForm'; // The form for editing

// Icons (from lucide-react)
import {
    ArrowLeft,
    User as UserIcon,
    Calendar,
    Tag,
    DollarSign,
    Edit,
    Trash2,
    AlertCircle,
    CheckCircle,
    PlusCircle,
    Info // Added for enrollment info
} from 'lucide-react';

// Page specific styles
import styles from './CourseDetailPage.module.css';

const CourseDetailPage: React.FC = () => {
    // --- Hooks ---
    const { courseId } = useParams<{ courseId: string }>(); // Get courseId from URL
    const navigate = useNavigate(); // For programmatic navigation
    const { user, isLoading: isAuthLoading } = useAuth(); // Get user info and auth loading status

    // --- State ---
    const [course, setCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true); // Main page loading
    const [error, setError] = useState<string | null>(null); // General page error
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false); // Edit modal visibility
    const [isEnrolling, setIsEnrolling] = useState<boolean>(false); // Loading state for enrollment button
    const [enrollError, setEnrollError] = useState<string | null>(null); // Specific error for enrollment action
    // Placeholder for actual enrollment status check (MVP Limitation)
    const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState<boolean>(false);

    // --- Derived State & RBAC Checks ---
    const isValidCourseId = courseId && !isNaN(Number(courseId));
    const numericCourseId = isValidCourseId ? Number(courseId) : null;

    // Can the current user manage (edit/delete) this course?
    const canManageCourse = !isAuthLoading && user && course &&
        (user.id === course.instructor?.id || user.is_staff === true);

    // Is the current user a student?
    const isStudent = !isAuthLoading && user?.profile?.role === 'student';

    // Can the current student potentially enroll? (Student role, course active, not already enrolled)
    const canEnroll = isStudent && course?.status === 'active' && !isAlreadyEnrolled;

    // --- Data Fetching ---
    const fetchCourse = useCallback(async () => {
        if (!numericCourseId) {
            setError('Invalid Course ID provided.');
            setIsLoading(false);
            setCourse(null);
            return;
        }
        console.log(`Fetching details for course ID: ${numericCourseId}`);
        setIsLoading(true);
        setError(null);
        setEnrollError(null);
        try {
            const data = await getCourseDetails(numericCourseId);
            setCourse(data);

            // --- MVP Enrollment Check Placeholder ---
            // In a real application, you would make an API call here
            // to check if the `user.id` is enrolled in `numericCourseId`.
            // Example: const enrollmentStatus = await checkEnrollmentStatus(numericCourseId);
            // setIsAlreadyEnrolled(enrollmentStatus.isEnrolled);
            setIsAlreadyEnrolled(false); // Defaulting to false for MVP
            // --- End Placeholder ---

        } catch (err: any) {
            console.error("Fetch course detail error:", err.response || err);
            if (err.response?.status === 404) {
                setError('Course not found.');
            } else {
                setError(err.response?.data?.detail || err.message || 'Failed to fetch course details.');
            }
            setCourse(null);
        } finally {
            setIsLoading(false);
        }
    }, [numericCourseId]); // Re-run only if the numericCourseId changes

    useEffect(() => {
        fetchCourse();
    }, [fetchCourse]); // fetchCourse is memoized

    // --- Action Handlers ---
    const handleEditSuccess = (updatedCourse: Course) => {
        setCourse(updatedCourse); // Update local state
        setIsEditModalOpen(false); // Close modal
        alert('Course updated successfully!');
    };

    const handleDelete = async () => {
        if (!numericCourseId || !canManageCourse || !course) return;

        if (window.confirm(`Are you sure you want to delete the course "${course.title}"? This action cannot be undone.`)) {
            setIsLoading(true); // Use main loading state for delete action
            setError(null);
            try {
                await deleteCourse(numericCourseId);
                alert('Course deleted successfully.');
                navigate('/courses'); // Redirect to list page
            } catch (err: any) {
                const errorMsg = err.response?.data?.detail || err.message || 'Failed to delete course.';
                setError(errorMsg);
                console.error("Delete course error:", err.response || err);
                setIsLoading(false); // Stop loading on error
            }
            // No finally setIsLoading(false) needed on success due to navigation
        }
    };

    const handleEnroll = async () => {
        if (!numericCourseId || !canEnroll || isEnrolling) return; // Use canEnroll check

        setIsEnrolling(true);
        setEnrollError(null);
        try {
            await enrollUser({ course_id: numericCourseId });
            alert("Successfully enrolled!");
            setIsAlreadyEnrolled(true); // Optimistically update local state
            // Optionally refetch data if needed: await fetchCourse();
        } catch (err: any) {
            const errorMsg = err.response?.data?.detail
                || (Array.isArray(err.response?.data?.non_field_errors) && err.response?.data?.non_field_errors[0]) // Handle list non_field_errors
                || err.message
                || 'Failed to enroll.';
            setEnrollError(errorMsg);
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
        } catch (e) {
            console.error("Date formatting error:", e);
            return 'Invalid Date';
        }
    }

    const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const target = event.target as HTMLImageElement;
        const placeholderImage = '/vite.svg';
        if (target.src !== placeholderImage) {
            target.src = placeholderImage;
        }
    }

    // --- Render Logic ---

    // Initial loading state (Auth or Course fetch)
    if (isLoading || isAuthLoading) {
        return (
            <div className={styles.center}>
                <Spinner />
                <span style={{ marginLeft: '1em', color: 'var(--text-color-secondary)' }}>Loading course details...</span>
            </div>
        );
    }

    // Error state (fetch/delete error)
    if (error) {
        return (
            <div className={styles.errorContainer}>
                <div className={styles.errorMessage} role="alert">
                    <AlertCircle size={20} style={{ marginRight: '0.5em', verticalAlign: 'bottom' }} />
                    {error}
                </div>
                <Link to="/courses">
                    <Button variant="secondary">
                        <ArrowLeft size={16} style={{ marginRight: '0.5em' }} /> Back to Courses
                    </Button>
                </Link>
            </div>
        );
    }

    // Course not found or invalid ID after loading/error checks
    if (!course) {
        return (
            <div className={styles.errorContainer}>
                <div className={styles.errorMessage} role="alert">
                    <AlertCircle size={20} style={{ marginRight: '0.5em', verticalAlign: 'bottom' }} />
                    {error || 'Course data could not be loaded or course not found.'}
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
        <div className={styles.detailContainer}>
            <Link to="/courses" className={styles.backLink}>
                <ArrowLeft size={18} aria-hidden="true" /> Back to All Courses
            </Link>

            {/* Header: Title and Action Buttons */}
            <div className={styles.header}>
                <h1 className={styles.title}>{course.title}</h1>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                    {/* Edit/Delete Buttons (for Instructor/Admin) */}
                    {canManageCourse && (
                        <>
                            <Button
                                variant="secondary"
                                size="small"
                                onClick={() => setIsEditModalOpen(true)}
                                title="Edit this course"
                                aria-label="Edit this course"
                                disabled={isLoading} // Disable if page is loading (e.g., during delete)
                            >
                                <Edit size={16} />
                                <span style={{ marginLeft: '0.4em' }}>Edit</span>
                            </Button>
                            <Button
                                variant="danger"
                                size="small"
                                onClick={handleDelete}
                                title="Delete this course"
                                aria-label="Delete this course"
                                isLoading={isLoading} // Show loading spinner only on this button during delete
                            >
                                <Trash2 size={16} />
                                <span style={{ marginLeft: '0.4em' }}>Delete</span>
                            </Button>
                        </>
                    )}
                    {/* Enroll Button (for Students) */}
                    {isStudent && (
                        <Button
                            variant={isAlreadyEnrolled ? "secondary" : "primary"}
                            size="small"
                            onClick={handleEnroll}
                            disabled={isAlreadyEnrolled || isEnrolling || course.status !== 'active'}
                            isLoading={isEnrolling} // Show loading state specific to this button
                            title={
                                course.status !== 'active' ? 'Cannot enroll in inactive/draft courses' :
                                    isAlreadyEnrolled ? 'You are already enrolled' :
                                        'Enroll in this course'
                            }
                            aria-label={
                                isAlreadyEnrolled ? 'Already enrolled in this course' : 'Enroll in this course'
                            }
                        >
                            {isAlreadyEnrolled ? (
                                <><CheckCircle size={16} /> <span style={{ marginLeft: '0.4em' }}>Enrolled</span></>
                            ) : (
                                <><PlusCircle size={16} /> <span style={{ marginLeft: '0.4em' }}>Enroll Now</span></>
                            )}
                        </Button>
                    )}
                </div>
            </div>

            {/* Display Enrollment Error */}
            {enrollError && (
                <p className={styles.errorMessage} style={{ marginTop: '1rem', textAlign: 'center' }} role="alert">
                    <AlertCircle size={16} style={{ marginRight: '0.5em', verticalAlign: 'bottom' }} />
                    {enrollError}
                </p>
            )}
            {/* Display Info if Enrollment not possible */}
            {isStudent && course.status !== 'active' && !enrollError && (
                <p className={styles.infoMessage} style={{ marginTop: '1rem', textAlign: 'center' }} role="status">
                    <Info size={16} style={{ marginRight: '0.5em', verticalAlign: 'bottom' }} />
                    Enrollment is not available for courses with status '{course.status}'.
                </p>
            )}


            {/* Course Image */}
            <figure style={{ margin: '0 0 2rem 0' }}>
                <img
                    src={getImageUrl(course.image)}
                    alt={`Promotional image for ${course.title}`}
                    className={styles.courseImage}
                    onError={handleImageError}
                    loading="lazy"
                />
            </figure>

            {/* Course Content: Description and Meta */}
            <div className={styles.content}>
                <p className={styles.description}>{course.description}</p>
                <div className={styles.metaGrid}>
                    <div className={styles.metaItem}>
                        <UserIcon size={16} aria-hidden="true" />
                        <strong>Instructor:</strong> {course.instructor?.username || 'N/A'}
                    </div>
                    <div className={styles.metaItem}>
                        <DollarSign size={16} aria-hidden="true" />
                        <strong>Price:</strong> ${parseFloat(course.price).toFixed(2)}
                    </div>
                    <div className={styles.metaItem}>
                        <Tag size={16} aria-hidden="true" />
                        <strong>Status:</strong>
                        <span className={`${styles.statusBadge} ${styles[course.status] || ''}`}>{course.status}</span>
                    </div>
                    <div className={styles.metaItem}>
                        <Calendar size={16} aria-hidden="true" />
                        <strong>Created:</strong> {formatDate(course.created_at)}
                    </div>
                    <div className={styles.metaItem}>
                        <Calendar size={16} aria-hidden="true" />
                        <strong>Updated:</strong> {formatDate(course.updated_at)}
                    </div>
                </div>
            </div>

            {/* Edit Course Modal (Conditional) */}
            {canManageCourse && (
                <Modal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    title={`Edit Course: ${course.title}`}
                >
                    <CourseForm
                        initialValues={course} // Pass current course data
                        user={user}            // Pass current user (for context if form needs it)
                        onSuccess={handleEditSuccess}
                        onCancel={() => setIsEditModalOpen(false)}
                    />
                </Modal>
            )}
        </div>
    );
};

export default CourseDetailPage;
