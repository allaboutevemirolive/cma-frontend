// src/pages/CourseListPage.tsx
import React, { useState, useEffect, useCallback } from 'react';

// API and Types
import { listCourses, deleteCourse } from '../services/api';
import { Course, PaginatedResponse } from '../types'; // Make sure User includes profile

// Custom Hooks
import { useAuth } from '../hooks/useAuth';

// Reusable UI Components
import CourseCard from '../components/Course/CourseCard';
import Button from '../components/Common/Button/Button';
import Spinner from '../components/Common/Spinner/Spinner';
import Modal from '../components/Common/Modal/Modal';
import CourseForm from '../components/Course/CourseForm';
import Input from '../components/Common/Input/Input';

// Icons
import { PlusCircle, AlertCircle, Inbox, SearchX } from 'lucide-react';

// Page specific styles
import styles from './CourseListPage.module.css';

const ITEMS_PER_PAGE = 9; // Number of courses per page

const CourseListPage: React.FC = () => {
    // --- State Variables ---
    const { user, isLoading: isAuthLoading } = useAuth(); // Get user and auth loading status
    const [coursesResponse, setCoursesResponse] = useState<PaginatedResponse<Course> | null>(null);
    const [isLoadingCourses, setIsLoadingCourses] = useState<boolean>(true); // Loading specifically for courses
    const [error, setError] = useState<string | null>(null); // API errors
    const [searchTerm, setSearchTerm] = useState<string>(''); // Search input value
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false); // Create modal visibility
    const [page, setPage] = useState<number>(1); // Current page number
    const pageSize = ITEMS_PER_PAGE;

    // --- Data Fetching ---
    const fetchCourses = useCallback(async (currentPage: number, search: string, size: number) => {
        console.log(`Fetching courses: page=${currentPage}, search='${search}', size=${size}`);
        setIsLoadingCourses(true); // Start loading courses
        setError(null); // Clear previous errors
        try {
            const params = {
                page: currentPage,
                search: search || undefined, // Send search term only if it exists
                page_size: size,
            };
            const data = await listCourses(params);
            setCoursesResponse(data); // Store the fetched data
        } catch (err: any) {
            // Extract user-friendly error message from API response or use generic message
            const errorMessage = err.response?.data?.detail || err.message || 'Failed to fetch courses.';
            setError(errorMessage);
            console.error("Fetch courses error:", err.response || err);
        } finally {
            setIsLoadingCourses(false); // Stop loading courses
        }
    }, []); // No external dependencies needed for useCallback here

    // Effect to fetch courses when page, search term, or page size changes
    useEffect(() => {
        // Debounce search input to avoid excessive API calls while typing
        const debounceTimer = setTimeout(() => {
            // Fetch only if authentication check is complete (to avoid potential race conditions)
            if (!isAuthLoading) {
                fetchCourses(page, searchTerm, pageSize);
            }
        }, 300); // 300ms debounce delay

        // Cleanup function to clear the timeout if dependencies change before delay ends
        return () => clearTimeout(debounceTimer);
    }, [fetchCourses, page, searchTerm, pageSize, isAuthLoading]); // Add isAuthLoading dependency

    // --- Event Handlers ---
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value); // Update search term
        setPage(1); // Reset to first page on new search
    };

    // Callback on successful course creation
    const handleCreateSuccess = (newCourse: Course) => {
        setIsCreateModalOpen(false); // Close the modal
        setSearchTerm('');           // Clear search
        setPage(1);                  // Go back to page 1
        fetchCourses(1, '', pageSize); // Refetch the first page to show the new course
        alert(`Course "${newCourse.title}" created successfully!`);
    };

    // Callback for deleting a course (passed to CourseCard)
    const handleDeleteCourse = async (courseId: number) => {
        // Confirmation dialog
        if (window.confirm(`Are you sure you want to delete this course? This action cannot be undone.`)) {
            try {
                setIsLoadingCourses(true); // Indicate loading during delete
                await deleteCourse(courseId);
                alert('Course deleted successfully.');
                // Refetch courses: If it was the last item on a page > 1, go to previous page
                if (coursesResponse?.results.length === 1 && page > 1) {
                    setPage(page - 1); // Trigger refetch via useEffect on page change
                } else {
                    fetchCourses(page, searchTerm, pageSize); // Refetch current page
                }
            } catch (err: any) {
                const errorMsg = err.response?.data?.detail || err.message || 'Unknown error';
                alert(`Failed to delete course: ${errorMsg}`);
                console.error("Delete course error:", err.response || err);
                setIsLoadingCourses(false); // Stop loading on error
            }
        }
    }

    // Handler for changing pagination page
    const handlePageChange = (newPage: number) => {
        const totalPages = coursesResponse ? Math.ceil(coursesResponse.count / pageSize) : 1;
        // Ensure new page is within valid bounds
        if (newPage > 0 && newPage <= totalPages) {
            setPage(newPage);
        }
    }

    // --- Derived State and Conditions for Rendering ---
    const isInstructor = user?.profile?.role === 'instructor'; // Check if user is an instructor
    const canCreateCourse = !isAuthLoading && isInstructor; // Can create only if auth check done & role is instructor

    const totalPages = coursesResponse ? Math.ceil(coursesResponse.count / pageSize) : 0;
    const hasCourses = coursesResponse && coursesResponse.results.length > 0;
    const showPagination = !isLoadingCourses && hasCourses && totalPages > 1; // Show pagination only if not loading, has courses, and more than one page

    // Show initial loading spinner if either auth or course data is loading for the first time
    const isInitiallyLoading = (isLoadingCourses || isAuthLoading) && !coursesResponse;

    // Determine icon and message for "no results" state
    const NoResultsIcon = searchTerm ? SearchX : Inbox; // Different icon if searching vs. empty list
    const noResultsMessage = searchTerm
        ? `No courses found matching "${searchTerm}". Try a different search term.`
        : 'There are currently no courses to display. Why not create one?';

    // --- JSX Render ---
    return (
        <div className={styles.pageContainer}>
            {/* Page Header and Controls */}
            <div className={styles.controls}>
                <h1 className={styles.title}>Courses</h1>
                <div className={styles.actionsContainer}>
                    {/* Search Input */}
                    <div className={styles.searchControl}>
                        <Input
                            type="search"
                            placeholder="Search by title..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            aria-label="Search courses by title"
                        // No label needed here visually, placeholder and aria-label suffice
                        />
                    </div>
                    {/* Create Course Button (Conditional) */}
                    {canCreateCourse && (
                        <Button
                            variant="primary"
                            onClick={() => setIsCreateModalOpen(true)}
                            disabled={isAuthLoading} // Disable only if auth is still loading
                            title="Create a new course"
                        >
                            <PlusCircle size={18} style={{ marginRight: '0.5em' }} />
                            <span>Create Course</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Loading State */}
            {isInitiallyLoading && (
                <div className={styles.loadingContainer}>
                    <Spinner />
                    <span className={styles.loadingText}>Loading courses...</span>
                </div>
            )}

            {/* Error State */}
            {error && !isLoadingCourses && ( // Show error only if not currently loading
                <div className={styles.errorMessage} role="alert">
                    <AlertCircle size={20} aria-hidden="true" />
                    <span>{error}</span>
                </div>
            )}

            {/* Content Area: Grid or No Results */}
            {!isInitiallyLoading && !error && coursesResponse && (
                <>
                    {!hasCourses ? (
                        // No Results View
                        <div className={styles.noResultsContainer}>
                            <NoResultsIcon className={styles.noResultsIcon} aria-hidden="true" />
                            <p className={styles.noResultsText}>{noResultsMessage}</p>
                            {/* Show create button again if list is empty and user can create */}
                            {!searchTerm && canCreateCourse && (
                                <Button
                                    style={{ marginTop: '1rem' }}
                                    variant="primary"
                                    onClick={() => setIsCreateModalOpen(true)}
                                    disabled={isAuthLoading}
                                    title="Create a new course"
                                >
                                    <PlusCircle size={18} style={{ marginRight: '0.5em' }} />
                                    Create First Course
                                </Button>
                            )}
                        </div>
                    ) : (
                        // Course Grid View
                        <div className={styles.courseGrid}>
                            {coursesResponse.results.map((course) => (
                                <CourseCard
                                    key={course.id}
                                    course={course}
                                    // Pass the delete handler to the card
                                    onDelete={handleDeleteCourse}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Pagination Controls */}
            {showPagination && coursesResponse && (
                <div className={styles.pagination}>
                    <Button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={!coursesResponse.previous || isLoadingCourses} // Disable if no previous page or loading
                        variant="secondary" size="small"
                        aria-label="Go to previous page"
                    >
                        Previous
                    </Button>
                    <span className={styles.pageInfo} aria-live="polite">
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={!coursesResponse.next || isLoadingCourses} // Disable if no next page or loading
                        variant="secondary" size="small"
                        aria-label="Go to next page"
                    >
                        Next
                    </Button>
                </div>
            )}

            {/* Create Course Modal (Conditional) */}
            {/* Ensure modal only renders if user *can* create */}
            {canCreateCourse && (
                <Modal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    title="Create New Course"
                >
                    {/* Pass the logged-in user to the form for setting instructor_id */}
                    <CourseForm
                        user={user}
                        onSuccess={handleCreateSuccess}
                        onCancel={() => setIsCreateModalOpen(false)}
                    />
                </Modal>
            )}
        </div>
    );
};

export default CourseListPage;
