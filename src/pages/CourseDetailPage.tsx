// src/pages/CourseDetailPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

// API and Types
import { getCourseDetails, deleteCourse } from '../services/api';
import { Course } from '../types'; // Ensure User type is imported

// Custom Hooks
import { useAuth } from '../hooks/useAuth';

// Reusable UI Components
import Spinner from '../components/Common/Spinner/Spinner';
import Button from '../components/Common/Button/Button';
import Modal from '../components/Common/Modal/Modal';
import CourseForm from '../components/Course/CourseForm'; // The form for editing

// Icons (from lucide-react)
import { ArrowLeft, User as UserIcon, Calendar, Tag, DollarSign, Edit, Trash2, AlertCircle } from 'lucide-react';

// Page specific styles
import styles from './CourseDetailPage.module.css';

const CourseDetailPage: React.FC = () => {
    // Get courseId from URL parameters
    const { courseId } = useParams<{ courseId: string }>();
    // Hook for programmatic navigation
    const navigate = useNavigate();
    // Authentication context: get current user and auth loading status
    const { user, isLoading: isAuthLoading } = useAuth();

    // State for course data, loading status, errors, and modal visibility
    const [course, setCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

    // Determine if the currently logged-in user is the instructor of this course
    // This check runs only after authentication status is confirmed and course data is loaded
    const isInstructor = !isAuthLoading && course?.instructor?.id === user?.id;

    // Memoized function to fetch course details
    const fetchCourse = useCallback(async () => {
        // Ensure courseId is valid before fetching
        if (!courseId || isNaN(Number(courseId))) {
            setError('Invalid Course ID provided.');
            setIsLoading(false);
            setCourse(null); // Ensure course is null on error
            return;
        }
        console.log(`Fetching details for course ID: ${courseId}`);
        setIsLoading(true);
        setError(null); // Clear previous errors
        try {
            const data = await getCourseDetails(courseId);
            setCourse(data);
        } catch (err: any) {
            console.error("Fetch course detail error:", err.response || err);
            // Handle specific error types (e.g., 404 Not Found)
            if (err.response && err.response.status === 404) {
                setError('Course not found.');
            } else {
                // Generic error message
                setError(err.response?.data?.detail || err.message || 'Failed to fetch course details.');
            }
            setCourse(null); // Clear course data on error
        } finally {
            setIsLoading(false); // Stop loading indicator
        }
    }, [courseId]); // Dependency array: re-run fetchCourse if courseId changes

    // Effect hook to run fetchCourse when the component mounts or courseId changes
    useEffect(() => {
        fetchCourse();
    }, [fetchCourse]); // fetchCourse is memoized, so this runs correctly

    // Callback function when the course is successfully updated via the modal
    const handleEditSuccess = (updatedCourse: Course) => {
        setCourse(updatedCourse); // Update the local state with the fresh data
        setIsEditModalOpen(false); // Close the edit modal
        alert('Course updated successfully!'); // Provide user feedback
    };

    // Function to handle the delete action
    const handleDelete = async () => {
        // Safety checks: ensure courseId exists and the user is the instructor
        if (!courseId || !isInstructor || !course) return;

        // Confirmation dialog before proceeding
        if (window.confirm(`Are you sure you want to delete the course "${course.title}"? This action cannot be undone.`)) {
            setIsLoading(true); // Show loading state during deletion
            try {
                await deleteCourse(courseId);
                alert('Course deleted successfully.');
                navigate('/courses'); // Redirect user to the course list page
            } catch (err: any) {
                const errorMsg = err.response?.data?.detail || err.message || 'Unknown error';
                setError(`Failed to delete course: ${errorMsg}`); // Show error on the page
                console.error("Delete course error:", err.response || err);
                setIsLoading(false); // Stop loading on error
            }
            // No need to explicitly stop loading on success because of navigation
        }
    };

    // Helper function to construct the image URL
    const getImageUrl = (imagePath?: string | null): string => {
        const placeholderImage = '/vite.svg'; // Path to your placeholder image
        if (!imagePath) return placeholderImage;
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
        const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/?$/, '');
        return `${baseUrl}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`;
    };

    // Helper function to format dates
    const formatDate = (dateString: string | null | undefined): string => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit' // Optionally add time
            });
        } catch (e) {
            console.error("Date formatting error:", e);
            return 'Invalid Date';
        }
    }

    // --- Render Logic ---

    // Show spinner if either course data or auth status is loading
    if (isLoading || isAuthLoading) {
        return (
            <div className={styles.center}>
                <Spinner />
                <span style={{ marginLeft: '1em', color: 'var(--text-color-secondary)' }}>Loading course details...</span>
            </div>
        );
    }

    // Show error message if fetching failed
    if (error) {
        return (
            <div className={styles.errorContainer}>
                 <div className={styles.errorMessage} role="alert">
                     <AlertCircle size={20} style={{ marginRight: '0.5em', verticalAlign: 'bottom' }}/>
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

    // Show message if course data is unexpectedly null after loading/error checks
    if (!course) {
        return <p className={styles.center}>Course data could not be loaded.</p>;
    }

    // --- Main Course Detail Render ---
    return (
        <div className={styles.detailContainer}>
            {/* Back navigation link */}
            <Link to="/courses" className={styles.backLink}>
                <ArrowLeft size={18} aria-hidden="true" /> Back to All Courses
            </Link>

            {/* Header section: Title and Action Buttons */}
            <div className={styles.header}>
                <h1 className={styles.title}>{course.title}</h1>
                {/* Conditionally render Edit/Delete buttons only for the instructor */}
                {isInstructor && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                        <Button
                            variant="secondary"
                            size="small"
                            onClick={() => setIsEditModalOpen(true)}
                            title="Edit this course"
                            aria-label="Edit this course"
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
                            isLoading={isLoading} // Show loading state on button during delete attempt
                        >
                            <Trash2 size={16} />
                             <span style={{ marginLeft: '0.4em' }}>Delete</span>
                        </Button>
                    </div>
                )}
            </div>

            {/* Course Image */}
             {/* Use a figure element for semantic meaning */}
             <figure style={{ margin: '0 0 2rem 0' }}>
                <img
                    src={getImageUrl(course.image)}
                    alt={`Image for ${course.title}`} // More descriptive alt text
                    className={styles.courseImage}
                    onError={(e) => { (e.target as HTMLImageElement).src = '/vite.svg'; }} // Fallback
                />
                 {/* Optional: Add figcaption if relevant */}
                 {/* <figcaption>Promotional image for the course.</figcaption> */}
            </figure>

            {/* Main content section: Description and Meta Info */}
            <div className={styles.content}>
                <p className={styles.description}>{course.description}</p>

                {/* Meta Information Grid */}
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
                        <span className={`${styles.statusBadge} ${styles[course.status]}`}>{course.status}</span>
                    </div>
                    <div className={styles.metaItem}>
                        <Calendar size={16} aria-hidden="true" />
                        <strong>Created:</strong> {formatDate(course.created_at)}
                    </div>
                    <div className={styles.metaItem}>
                        <Calendar size={16} aria-hidden="true" />
                        <strong>Updated:</strong> {formatDate(course.updated_at)}
                    </div>
                    {/* Add more relevant meta items here if needed */}
                </div>
            </div>

            {/* Edit Course Modal - Rendered conditionally */}
            {isInstructor && (
                <Modal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    title={`Edit Course: ${course.title}`} // Dynamic title
                >
                    <CourseForm
                        initialValues={course} // Pass current course data to prefill the form
                        user={user}            // Pass the instructor user object
                        onSuccess={handleEditSuccess}
                        onCancel={() => setIsEditModalOpen(false)}
                    />
                </Modal>
            )}
        </div>
    );
};

export default CourseDetailPage;
