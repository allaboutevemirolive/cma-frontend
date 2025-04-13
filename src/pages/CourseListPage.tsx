// src/pages/CourseListPage.tsx
import React, { useState, useEffect, useCallback } from 'react';

// API and Types
import { listCourses, deleteCourse } from '../services/api';
import { Course, PaginatedResponse } from '../types';

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

const ITEMS_PER_PAGE = 9;

const CourseListPage: React.FC = () => {
    const { user, isLoading: isAuthLoading } = useAuth();
    const [coursesResponse, setCoursesResponse] = useState<PaginatedResponse<Course> | null>(null);
    const [isLoadingCourses, setIsLoadingCourses] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [page, setPage] = useState<number>(1);
    const pageSize = ITEMS_PER_PAGE;

    // --- Callbacks (fetchCourses, handleSearchChange, etc. remain the same) ---
    const fetchCourses = useCallback(async (currentPage: number, search: string, size: number) => {
        console.log(`Fetching courses: page=${currentPage}, search='${search}', size=${size}`);
        setIsLoadingCourses(true);
        setError(null);
        try {
            const params = {
                page: currentPage,
                search: search || undefined,
                page_size: size,
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
    }, []);

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            fetchCourses(page, searchTerm, pageSize);
        }, 300);
        return () => clearTimeout(debounceTimer);
    }, [fetchCourses, page, searchTerm, pageSize]);

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setPage(1);
    };

    const handleCreateSuccess = () => {
        setIsCreateModalOpen(false);
        setSearchTerm('');
        setPage(1);
        fetchCourses(1, '', pageSize);
    };

    const handleDeleteCourse = async (courseId: number) => {
        if (window.confirm(`Are you sure you want to delete this course? This action cannot be undone.`)) {
            try {
                await deleteCourse(courseId);
                alert('Course deleted successfully.');
                if (coursesResponse?.results.length === 1 && page > 1) {
                    setPage(page - 1);
                } else {
                    fetchCourses(page, searchTerm, pageSize);
                }
            } catch (err: any) {
                const errorMsg = err.response?.data?.detail || err.message || 'Unknown error';
                alert(`Failed to delete course: ${errorMsg}`);
                console.error("Delete course error:", err.response || err);
            }
        }
    }

    const handlePageChange = (newPage: number) => {
        const totalPages = coursesResponse ? Math.ceil(coursesResponse.count / pageSize) : 1;
        if (newPage > 0 && newPage <= totalPages) {
            setPage(newPage);
        }
    }

    // --- Calculated states (remain the same) ---
    const canCreateCourse = !isAuthLoading && !!user;
    const totalPages = coursesResponse ? Math.ceil(coursesResponse.count / pageSize) : 0;
    const hasCourses = coursesResponse && coursesResponse.results.length > 0;
    const showPagination = hasCourses && totalPages > 1;
    const isInitiallyLoading = isLoadingCourses || isAuthLoading;
    const NoResultsIcon = searchTerm ? SearchX : Inbox;
    const noResultsMessage = searchTerm
        ? `No courses found matching "${searchTerm}". Try a different search.`
        : 'There are currently no courses to display. Why not create one?';


    return (
        <div className={styles.pageContainer}>
            <div className={styles.controls}>
                <h1 className={styles.title}>Courses</h1>
                <div className={styles.actionsContainer}>
                    {/* Apply the new wrapper class to the Input */}
                    <div className={styles.searchControl}>
                        <Input
                            type="search"
                            placeholder="Search by title..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            aria-label="Search courses by title"
                            // Remove margin-bottom style from Input component's internal group
                            className={styles.searchInput} // Keep if needed for width/flex overrides
                        />
                    </div>
                    <Button
                        variant="primary"
                        onClick={() => setIsCreateModalOpen(true)}
                        disabled={!canCreateCourse || isAuthLoading}
                        title={!canCreateCourse ? "Login to create courses" : "Create a new course"}
                    >
                        <PlusCircle size={18} style={{ marginRight: '0.5em' }} />
                        <span>Create Course</span>
                    </Button>
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
            {error && !isLoadingCourses && (
                <div className={styles.errorMessage} role="alert">
                    <AlertCircle size={20} aria-hidden="true" />
                    <span>{error}</span>
                </div>
            )}

            {/* Content Area: Grid or No Results */}
            {!isInitiallyLoading && !error && coursesResponse && (
                <>
                    {!hasCourses ? (
                        <div className={styles.noResultsContainer}>
                            <NoResultsIcon className={styles.noResultsIcon} aria-hidden="true" />
                            <p className={styles.noResultsText}>{noResultsMessage}</p>
                            {!searchTerm && canCreateCourse && (
                                 <Button
                                    style={{marginTop: '1rem'}}
                                    variant="primary"
                                    onClick={() => setIsCreateModalOpen(true)}
                                    disabled={!canCreateCourse || isAuthLoading}
                                    title="Create a new course"
                                >
                                    <PlusCircle size={18} style={{ marginRight: '0.5em' }} />
                                    Create First Course
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className={styles.courseGrid}>
                            {coursesResponse.results.map((course) => (
                                <CourseCard
                                    key={course.id}
                                    course={course}
                                    onDelete={handleDeleteCourse}
                                />
                            ))}
                        </div>
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
                        Page {page} of {totalPages}
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
            {canCreateCourse && (
                <Modal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    title="Create New Course"
                >
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
