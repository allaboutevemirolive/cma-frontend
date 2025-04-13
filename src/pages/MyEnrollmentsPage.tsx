// src/pages/MyEnrollmentsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

// API and Types
import { listEnrollments, deleteEnrollment } from '../services/api';
import { Enrollment, PaginatedResponse } from '../types'; // Use Enrollment type

// Custom Hooks (optional, but good for consistency)
// import { useAuth } from '../hooks/useAuth';

// Reusable UI Components
import Spinner from '../components/Common/Spinner/Spinner';
import Button from '../components/Common/Button/Button';

// Icons
import { AlertCircle, Inbox, CalendarDays, Activity, User as UserIcon, Trash2, ExternalLink } from 'lucide-react';

// Page specific styles
import styles from './MyEnrollmentsPage.module.css';

const ITEMS_PER_PAGE = 10; // Adjust as needed

const MyEnrollmentsPage: React.FC = () => {
    // const { user, isLoading: isAuthLoading } = useAuth(); // Get user if needed for other logic
    const [enrollmentsResponse, setEnrollmentsResponse] = useState<PaginatedResponse<Enrollment> | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isDeleting, setIsDeleting] = useState<number | null>(null); // Track which enrollment is being deleted
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<number>(1);
    const pageSize = ITEMS_PER_PAGE;

    // --- Fetching Logic ---
    const fetchEnrollments = useCallback(async (currentPage: number, size: number) => {
        console.log(`Fetching enrollments: page=${currentPage}, size=${size}`);
        setIsLoading(true); // Indicate loading start
        setError(null); // Clear previous errors
        try {
            // No need to pass student_id, backend filters automatically for the requesting user
            const params = {
                page: currentPage,
                page_size: size,
            };
            const data = await listEnrollments(params);
            setEnrollmentsResponse(data);
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || err.message || 'Failed to fetch your enrollments.';
            setError(errorMessage);
            console.error("Fetch enrollments error:", err.response || err);
            setEnrollmentsResponse(null); // Clear data on error
        } finally {
            setIsLoading(false); // Indicate loading finish
        }
    }, []); // No external dependencies needed for fetch logic itself

    // --- Initial Fetch ---
    useEffect(() => {
        fetchEnrollments(page, pageSize);
    }, [fetchEnrollments, page, pageSize]); // Re-fetch if page changes

    // --- Unenroll Logic ---
    const handleUnenroll = async (enrollmentId: number, courseTitle: string) => {
        if (window.confirm(`Are you sure you want to unenroll from "${courseTitle}"?`)) {
            setIsDeleting(enrollmentId); // Set loading state for this specific enrollment
            setError(null); // Clear previous errors
            try {
                await deleteEnrollment(enrollmentId);
                alert(`Successfully unenrolled from "${courseTitle}".`);
                // Refresh the list after unenrollment
                setEnrollmentsResponse(prev => {
                    if (!prev) return null;
                    const newResults = prev.results.filter(e => e.id !== enrollmentId);
                    const newCount = prev.count - 1;
                    // Adjust pagination if the last item on a page was deleted
                    if (newResults.length === 0 && page > 1) {
                        setPage(prevPage => prevPage - 1); // Go to previous page
                        return null; // Let the page change trigger refetch
                    }
                    return { ...prev, results: newResults, count: newCount };
                });

                // Or simply refetch:
                // fetchEnrollments(page, pageSize);

            } catch (err: any) {
                const errorMsg = err.response?.data?.detail || err.message || 'Unknown error';
                setError(`Failed to unenroll: ${errorMsg}`);
                console.error("Unenroll error:", err.response || err);
            } finally {
                setIsDeleting(null); // Clear loading state for this enrollment
            }
        }
    };

    // --- Helper Functions ---
    const getImageUrl = (imagePath?: string | null): string => {
        const placeholderImage = '/vite.svg'; // Path to your placeholder image
        if (!imagePath) return placeholderImage;
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
        const domainBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/?$/, '');
        const formattedImagePath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
        if (domainBaseUrl && domainBaseUrl !== '/') {
            return `${domainBaseUrl}${formattedImagePath}`;
        } else {
            return formattedImagePath;
        }
    };

    const formatDate = (dateString: string | null | undefined): string => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
        } catch (e) {
            return 'Invalid Date';
        }
    }

    // --- Render Logic ---

    const renderContent = () => {
        // Initial Loading State
        if (isLoading && !enrollmentsResponse) {
            return (
                <div className={styles.stateContainer}>
                    <Spinner />
                    <span className={styles.loadingText}>Loading your enrollments...</span>
                </div>
            );
        }

        // Error State
        if (error) {
            return (
                <div className={`${styles.stateContainer} ${styles.errorMessage}`} role="alert">
                    <AlertCircle size={20} aria-hidden="true" />
                    <span>{error}</span>
                    <Button onClick={() => fetchEnrollments(page, pageSize)} variant="secondary" size="small" style={{ marginLeft: '1rem' }}>Retry</Button>
                </div>
            );
        }

        // No Enrollments State
        if (!enrollmentsResponse || enrollmentsResponse.results.length === 0) {
            return (
                <div className={styles.stateContainer}>
                    <Inbox className={styles.noResultsIcon} aria-hidden="true" />
                    <p className={styles.noResultsText}>
                        You haven't enrolled in any courses yet.
                    </p>
                    <Link to="/courses">
                        <Button variant="primary">Browse Courses</Button>
                    </Link>
                </div>
            );
        }

        // --- Display Enrollments Grid ---
        return (
            <div className={styles.enrollmentGrid}>
                {enrollmentsResponse.results.map((enrollment) => (
                    <div key={enrollment.id} className={styles.enrollmentCard}>
                        {/* Link course image and title to the course detail page */}
                        <Link to={`/courses/${enrollment.course.id}`} className={styles.imageContainer}>
                            <img
                                src={getImageUrl(enrollment.course.image)}
                                alt={`${enrollment.course.title} thumbnail`}
                                className={styles.image}
                                onError={(e) => { (e.target as HTMLImageElement).src = '/vite.svg'; }}
                                loading="lazy"
                            />
                        </Link>

                        <div className={styles.content}>
                            <Link to={`/courses/${enrollment.course.id}`} className={styles.courseTitleLink}>
                                <h3 className={styles.courseTitle}>{enrollment.course.title}</h3>
                            </Link>

                            <div className={styles.enrollmentMeta}>
                                <p className={styles.metaItem}>
                                    <UserIcon size={14} aria-hidden="true" />
                                    <span className={styles.metaLabel}>Instructor:</span>
                                    {enrollment.course.instructor?.username || 'N/A'}
                                </p>
                                <p className={styles.metaItem}>
                                    <CalendarDays size={14} aria-hidden="true" />
                                    <span className={styles.metaLabel}>Enrolled:</span>
                                    {formatDate(enrollment.enrollment_date)}
                                </p>
                                <p className={styles.metaItem}>
                                    <Activity size={14} aria-hidden="true" />
                                    <span className={styles.metaLabel}>Status:</span>
                                    <span className={`${styles.statusBadge} ${styles[enrollment.status]}`}>
                                        {enrollment.status_display}
                                    </span>
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className={styles.actions}>
                                <Link to={`/courses/${enrollment.course.id}`}>
                                    <Button variant="secondary" size="small" title="Go to Course">
                                        <ExternalLink size={14} style={{ marginRight: '0.3em' }} /> View Course
                                    </Button>
                                </Link>
                                {/* Only allow unenroll if status is 'active' */}
                                {enrollment.status === 'active' && (
                                    <Button
                                        variant="danger"
                                        size="small"
                                        onClick={() => handleUnenroll(enrollment.id, enrollment.course.title)}
                                        isLoading={isDeleting === enrollment.id} // Show spinner on the specific button
                                        disabled={isDeleting !== null} // Disable all delete buttons while one is processing
                                        title="Unenroll from this course"
                                    >
                                        <Trash2 size={14} style={{ marginRight: '0.3em' }} /> Unenroll
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // --- Pagination Logic --- (Simplified, add if needed based on API response)
    // const totalPages = enrollmentsResponse ? Math.ceil(enrollmentsResponse.count / pageSize) : 0;
    // const showPagination = enrollmentsResponse && totalPages > 1;

    return (
        <div className={styles.pageContainer}>
            <h1 className={styles.title}>My Enrollments</h1>

            {renderContent()}

            {/* TODO: Add Pagination Component if needed */}
            {/* {showPagination && (
                 <div className={styles.pagination}> ... </div>
             )} */}

        </div>
    );
};

export default MyEnrollmentsPage;
