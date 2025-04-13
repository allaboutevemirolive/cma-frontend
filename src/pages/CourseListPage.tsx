// src/pages/CourseListPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { listCourses, deleteCourse } from '../services/api';
import { Course, PaginatedResponse } from '../types';
import CourseCard from '../components/Course/CourseCard';
import Button from '../components/Common/Button/Button';
import Spinner from '../components/Common/Spinner/Spinner';
import Modal from '../components/Common/Modal/Modal';
import CourseForm from '../components/Course/CourseForm';
import styles from './CourseListPage.module.css';
import { useAuth } from '../hooks/useAuth'; // Import useAuth

const CourseListPage: React.FC = () => {
    const { user, isLoading: isAuthLoading } = useAuth(); // Get user and auth loading state
    const [coursesResponse, setCoursesResponse] = useState<PaginatedResponse<Course> | null>(null);
    const [isLoadingCourses, setIsLoadingCourses] = useState<boolean>(true); // Renamed state
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [page, setPage] = useState<number>(1);

    const fetchCourses = useCallback(async (currentPage: number, search: string) => {
        setIsLoadingCourses(true); // Use the renamed state
        setError(null);
        try {
            const params = {
                page: currentPage,
                search: search || undefined,
            };
            const data = await listCourses(params);
            setCoursesResponse(data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch courses.');
            console.error("Fetch courses error:", err);
        } finally {
            setIsLoadingCourses(false); // Use the renamed state
        }
    }, []);

    useEffect(() => {
        fetchCourses(page, searchTerm);
    }, [fetchCourses, page, searchTerm]);

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setPage(1);
    };

    const handleCreateSuccess = () => {
        setIsCreateModalOpen(false);
        fetchCourses(1, '');
        setSearchTerm('');
        setPage(1);
    };

    const handleDeleteCourse = async (courseId: number) => {
        if (window.confirm(`Are you sure you want to delete course ${courseId}?`)) {
            try {
                await deleteCourse(courseId);
                fetchCourses(page, searchTerm);
                alert('Course deleted successfully.');
            } catch (err: any) {
                alert(`Failed to delete course: ${err.message || 'Unknown error'}`);
            }
        }
    }

    const handlePageChange = (newPage: number) => {
        if (newPage > 0) {
            setPage(newPage);
        }
    }

    // Determine if the create button should be enabled
    // Needs authentication context loaded AND user object available
    const canCreateCourse = !isAuthLoading && !!user?.id;

    return (
        <div className={styles.courseListContainer}>
            <div className={styles.controls}>
                <h1 className={styles.title}>Courses</h1>
                <input
                    type="search"
                    placeholder="Search courses..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className={styles.searchInput}
                />
                <Button
                    variant="primary"
                    onClick={() => setIsCreateModalOpen(true)}
                    disabled={!canCreateCourse} // Disable if user ID isn't ready
                    title={!canCreateCourse ? "Loading user info..." : "Create a new course"} // Tooltip hint
                >
                    Create Course
                </Button>
            </div>

            {(isLoadingCourses || isAuthLoading) && <div className={styles.center}><Spinner /></div>} {/* Show spinner if courses or auth is loading */}
            {error && <p className={styles.errorMessage}>{error}</p>}

            {!isLoadingCourses && !error && coursesResponse && (
                <>
                    {/* ... Course Grid and Pagination ... */}
                    {coursesResponse.results.length === 0 ? (
                        <p className={styles.noResults}>No courses found.</p>
                    ) : (
                        <div className={styles.courseGrid}>
                            {coursesResponse.results.map((course) => (
                                <CourseCard key={course.id} course={course} onDelete={handleDeleteCourse} />
                            ))}
                        </div>
                    )}

                    {/* Basic Pagination Example */}
                    <div className={styles.pagination}>
                        <Button
                            onClick={() => handlePageChange(page - 1)}
                            disabled={!coursesResponse.previous || isLoadingCourses}
                        >
                            Previous
                        </Button>
                        <span>Page {page} of {Math.ceil((coursesResponse.count || 0) / (coursesResponse.results?.length || 1))}</span> {/* Added null check for results */}
                        <Button
                            onClick={() => handlePageChange(page + 1)}
                            disabled={!coursesResponse.next || isLoadingCourses}
                        >
                            Next
                        </Button>
                    </div>
                </>
            )}

            {/* Create Course Modal */}
            {/* Only render Modal content if user ID is available to pass */}
            {canCreateCourse && (
                 <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
                    <h2>Create New Course</h2>
                    <CourseForm
                        // Explicitly pass the logged-in user's ID for creation
                        userId={user.id} // We know user.id exists because of canCreateCourse
                        onSuccess={handleCreateSuccess}
                        onCancel={() => setIsCreateModalOpen(false)}
                    />
                </Modal>
            )}
        </div>
    );
};

export default CourseListPage;
