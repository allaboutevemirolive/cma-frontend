// src/pages/CourseListPage.tsx
import React, { useState, useEffect, useCallback } from 'react';

// API and Types
import { listCourses, deleteCourse } from '../services/api';
import { Course, PaginatedResponse } from '../types'; // Import User type

// Custom Hooks
import { useAuth } from '../hooks/useAuth';

// Reusable UI Components
import CourseCard from '../components/Course/CourseCard'; // Ensure path is correct
import Button from '../components/Common/Button/Button';
import Spinner from '../components/Common/Spinner/Spinner';
import Modal from '../components/Common/Modal/Modal';
import CourseForm from '../components/Course/CourseForm'; // Ensure path is correct
import Input from '../components/Common/Input/Input'; // Ensure path is correct

// Icons
import { PlusCircle, AlertCircle, Inbox, SearchX } from 'lucide-react';

// Page specific styles
import styles from './CourseListPage.module.css'; // Ensure path is correct

const ITEMS_PER_PAGE = 9;

const CourseListPage: React.FC = () => {
    const { user, isLoading: isAuthLoading } = useAuth();
    const [coursesResponse, setCoursesResponse] = useState<PaginatedResponse<Course> | null>(null);
    const [isLoadingCourses, setIsLoadingCourses] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false); // State for edit modal
    const [courseToEdit, setCourseToEdit] = useState<Course | null>(null); // State for course being edited
    const [page, setPage] = useState<number>(1);
    const pageSize = ITEMS_PER_PAGE;

    const fetchCourses = useCallback(async (currentPage: number, search: string, size: number) => {
        console.log(`Fetching courses: page=${currentPage}, search='${search}', size=${size}`);
        setIsLoadingCourses(true);
        setError(null);
        try {
            // Determine if filtering by instructor is needed
            const params: ListCoursesParams = {
                page: currentPage,
                search: search || undefined,
                page_size: size,
                // Example: Add instructor_id filter if needed for a specific view
                // instructor_id: user?.profile.role === 'instructor' ? user.id : undefined,
            };
            const data = await listCourses(params);
            setCoursesResponse(data);
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || err.message || 'Failed to fetch courses.';
            setError(errorMessage);
            console.error("Fetch courses error:", err.response || err);
        } finally {
            setIsLoadingCourses(false);
        }
    }, []); // Removed user from dependencies here, filter logic can be separate if needed

    useEffect(() => {
        // Debounce search or fetch immediately
        const debounceTimer = setTimeout(() => {
             fetchCourses(page, searchTerm, pageSize);
        }, 300); // 300ms debounce
        return () => clearTimeout(debounceTimer);
    }, [fetchCourses, page, searchTerm, pageSize]); // Re-fetch when page, search term changes


    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setPage(1); // Reset to first page on new search
    };

    const handleCreateSuccess = (newCourse: Course) => {
        setIsCreateModalOpen(false);
        // Optionally, instead of refetching, add the new course to the start of the list
        // This provides faster UI feedback but might not reflect correct pagination/ordering
        // setCoursesResponse(prev => ({
        //     ...prev!,
        //     count: prev!.count + 1,
        //     results: [newCourse, ...prev!.results.slice(0, pageSize -1)]
        // }));
        // Recommended: Refetch to ensure consistency
        fetchCourses(1, '', pageSize); // Refetch page 1 without search
        setPage(1); // Explicitly set page to 1
        setSearchTerm(''); // Clear search term
        alert(`Course "${newCourse.title}" created successfully!`);
    };

    const handleEditSuccess = (updatedCourse: Course) => {
         setIsEditModalOpen(false);
         setCourseToEdit(null);
         // Update the course in the current list for immediate feedback
         setCoursesResponse(prev => {
             if (!prev) return null;
             return {
                 ...prev,
                 results: prev.results.map(c => c.id === updatedCourse.id ? updatedCourse : c)
             };
         });
         alert(`Course "${updatedCourse.title}" updated successfully!`);
         // Optionally refetch if complex sorting/filtering might change position
         // fetchCourses(page, searchTerm, pageSize);
    }

    const handleDeleteCourse = async (courseId: number, courseTitle: string) => {
        // Added courseTitle for better confirmation message
        if (window.confirm(`Are you sure you want to delete the course "${courseTitle}"? This action cannot be undone.`)) {
             setIsLoadingCourses(true); // Indicate loading during delete
            try {
                await deleteCourse(String(courseId)); // Ensure ID is string if API expects that
                alert('Course deleted successfully.');
                // Refetch the current page after deletion
                // Adjust page number if the deleted item was the last one on a page > 1
                 if (coursesResponse?.results.length === 1 && page > 1) {
                     const newPage = page - 1;
                     setPage(newPage); // This will trigger useEffect to fetch
                 } else {
                    fetchCourses(page, searchTerm, pageSize); // Refetch current page
                 }

            } catch (err: any) {
                const errorMsg = err.response?.data?.detail || err.message || 'Unknown error';
                alert(`Failed to delete course: ${errorMsg}`);
                console.error("Delete course error:", err.response || err);
                 setIsLoadingCourses(false); // Stop loading on error
            }
             // Loading stops automatically on successful fetch in useEffect
        }
    };

    // Handler to open the edit modal
    const handleEditCourse = (course: Course) => {
        setCourseToEdit(course);
        setIsEditModalOpen(true);
    };


    const handlePageChange = (newPage: number) => {
        const totalPages = coursesResponse ? Math.ceil(coursesResponse.count / pageSize) : 1;
        if (newPage > 0 && newPage <= totalPages) {
            setPage(newPage); // This will trigger the useEffect to refetch
        }
    };

    // --- Calculated states ---
    // Determine if the user has instructor/admin role
    const canManageCourses = !isAuthLoading && (user?.profile?.role === 'instructor' || user?.profile?.role === 'admin');
    const totalPages = coursesResponse ? Math.ceil(coursesResponse.count / pageSize) : 0;
    const hasCourses = coursesResponse && coursesResponse.results.length > 0;
    const showPagination = hasCourses && totalPages > 1;
    const isInitiallyLoading = (isLoadingCourses && !coursesResponse) || isAuthLoading; // True only on first load or auth check
    const NoResultsIcon = searchTerm ? SearchX : Inbox;
    const noResultsMessage = searchTerm
        ? `No courses found matching "${searchTerm}". Try a different search.`
        : 'There are currently no courses to display.';


    return (
        <div className={styles.pageContainer}>
            <div className={styles.controls}>
                <h1 className={styles.title}>Courses</h1>
                <div className={styles.actionsContainer}>
                    <div className={styles.searchControl}>
                        <Input
                            type="search"
                            placeholder="Search by title, description..." // Update placeholder
                            value={searchTerm}
                            onChange={handleSearchChange}
                            aria-label="Search courses"
                            disabled={isInitiallyLoading} // Disable while loading initial data
                        />
                    </div>
                    {/* Show Create button only for instructors/admins */}
                    {canManageCourses && (
                        <Button
                            variant="primary"
                            onClick={() => setIsCreateModalOpen(true)}
                            disabled={isAuthLoading} // Disable only while auth is loading
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
            {error && !isInitiallyLoading && ( // Show error only after initial load attempt
                <div className={styles.errorMessage} role="alert">
                    <AlertCircle size={20} aria-hidden="true" />
                    <span>{error}</span>
                     {/* Optional: Add a retry button */}
                     <Button onClick={() => fetchCourses(page, searchTerm, pageSize)} variant="secondary" size="small" style={{marginLeft: '1rem'}}>Retry</Button>
                </div>
            )}

            {/* Content Area: Grid or No Results */}
            {!isInitiallyLoading && !error && coursesResponse && (
                <>
                    {!hasCourses ? (
                        <div className={styles.noResultsContainer}>
                            <NoResultsIcon className={styles.noResultsIcon} aria-hidden="true" />
                            <p className={styles.noResultsText}>{noResultsMessage}</p>
                            {/* Encourage creation if no results and user can manage */}
                            {!searchTerm && canManageCourses && (
                                 <Button
                                    style={{marginTop: '1rem'}}
                                    variant="primary"
                                    onClick={() => setIsCreateModalOpen(true)}
                                    disabled={isAuthLoading}
                                >
                                    <PlusCircle size={18} style={{ marginRight: '0.5em' }} />
                                    Create First Course
                                </Button>
                            )}
                        </div>
                    ) : (
                         <>
                            {/* Show loading indicator overlay during subsequent fetches (e.g., pagination, delete) */}
                            {isLoadingCourses && coursesResponse && <div className={styles.loadingContainer}><Spinner /><span className={styles.loadingText}>Updating...</span></div>}
                            <div className={styles.courseGrid} style={{ opacity: isLoadingCourses && coursesResponse ? 0.6 : 1 }}> {/* Fade grid during update */}
                                {coursesResponse.results.map((course) => (
                                    <CourseCard
                                        key={course.id}
                                        course={course}
                                        onDelete={handleDeleteCourse} // Pass handler
                                        onEdit={handleEditCourse}   // Pass handler
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}

            {/* Pagination */}
            {!isInitiallyLoading && showPagination && coursesResponse && (
                <div className={styles.pagination}>
                    <Button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={!coursesResponse.previous || isLoadingCourses}
                        variant="secondary" size="small"
                        aria-label="Go to previous page"
                    >
                        Previous
                    </Button>
                    <span className={styles.pageInfo} aria-live="polite">
                        Page {page} of {totalPages} ({coursesResponse.count} total courses)
                    </span>
                    <Button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={!coursesResponse.next || isLoadingCourses}
                        variant="secondary" size="small"
                        aria-label="Go to next page"
                    >
                        Next
                    </Button>
                </div>
            )}

            {/* Create Course Modal */}
            {canManageCourses && (
                <Modal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    title="Create New Course"
                >
                    <CourseForm
                        user={user} // Pass the logged-in user (required for instructor_id)
                        onSuccess={handleCreateSuccess}
                        onCancel={() => setIsCreateModalOpen(false)}
                    />
                </Modal>
            )}

             {/* Edit Course Modal */}
             {canManageCourses && courseToEdit && (
                 <Modal
                    isOpen={isEditModalOpen}
                    onClose={() => { setIsEditModalOpen(false); setCourseToEdit(null); }}
                    title={`Edit Course: ${courseToEdit.title}`}
                 >
                     <CourseForm
                        initialValues={courseToEdit} // Prefill with selected course data
                        user={user} // Still pass user, though instructor_id comes from initialValues
                        onSuccess={handleEditSuccess}
                        onCancel={() => { setIsEditModalOpen(false); setCourseToEdit(null); }}
                     />
                 </Modal>
             )}

        </div>
    );
};

// Define interface for ListCoursesParams if not globally defined
interface ListCoursesParams {
    search?: string;
    status?: 'active' | 'inactive' | 'draft';
    instructor_id?: number;
    ordering?: string;
    page?: number;
    page_size?: number;
}

export default CourseListPage;
