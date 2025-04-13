// src/pages/CourseListPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { listCourses, deleteCourse } from '../services/api';
import { Course, PaginatedResponse } from '../types';
import CourseCard from '../components/Course/CourseCard';
import Button from '../components/Common/Button/Button';
import Spinner from '../components/Common/Spinner/Spinner';
import Modal from '../components/Common/Modal/Modal'; // Assuming Modal component exists
import CourseForm from '../components/Course/CourseForm'; // Assuming CourseForm component exists
import styles from './CourseListPage.module.css';

const CourseListPage: React.FC = () => {
    const [coursesResponse, setCoursesResponse] = useState<PaginatedResponse<Course> | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [page, setPage] = useState<number>(1); // For pagination

    const fetchCourses = useCallback(async (currentPage: number, search: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const params = {
                page: currentPage,
                search: search || undefined,
                // Add other filters/ordering here if needed
                // status: 'active',
                // ordering: '-price',
            };
            const data = await listCourses(params);
            setCoursesResponse(data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch courses.');
            console.error("Fetch courses error:", err);
        } finally {
            setIsLoading(false);
        }
    }, []); // Dependencies: Add any other filter states if they exist

    useEffect(() => {
        // Debounce search or fetch directly on change/submit
        fetchCourses(page, searchTerm);
    }, [fetchCourses, page, searchTerm]); // Re-fetch when page or searchTerm changes

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setPage(1); // Reset to first page on new search
    };

    // Optional: Debounced search handler
    // const debouncedFetch = useCallback(debounce((p, s) => fetchCourses(p, s), 500), [fetchCourses]);
    // useEffect(() => {
    //     debouncedFetch(page, searchTerm);
    // }, [debouncedFetch, page, searchTerm]);


    const handleCreateSuccess = () => {
        setIsCreateModalOpen(false);
        fetchCourses(1, ''); // Refetch courses on page 1 after creation
        setSearchTerm(''); // Clear search
        setPage(1);
    };

    const handleDeleteCourse = async (courseId: number) => {
        if (window.confirm(`Are you sure you want to delete course ${courseId}?`)) {
            try {
                await deleteCourse(courseId);
                // Refetch or remove from state
                fetchCourses(page, searchTerm); // Easiest way is to refetch current page
                alert('Course deleted successfully.');
            } catch (err: any) {
                alert(`Failed to delete course: ${err.message || 'Unknown error'}`);
            }
        }
    }

    const handlePageChange = (newPage: number) => {
        if (newPage > 0) { // Basic validation
            setPage(newPage);
        }
    }

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
                <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
                    Create Course
                </Button>
            </div>

            {isLoading && <div className={styles.center}><Spinner /></div>}
            {error && <p className={styles.errorMessage}>{error}</p>}

            {!isLoading && !error && coursesResponse && (
                <>
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
                            disabled={!coursesResponse.previous}
                        >
                            Previous
                        </Button>
                        <span>Page {page} of {Math.ceil((coursesResponse.count || 0) / (coursesResponse.results.length || 1))}</span>
                        <Button
                            onClick={() => handlePageChange(page + 1)}
                            disabled={!coursesResponse.next}
                        >
                            Next
                        </Button>
                    </div>
                </>
            )}

            {/* Create Course Modal */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
                <h2>Create New Course</h2>
                {/* Pass instructor_id if needed, maybe from logged-in user context */}
                <CourseForm
                    // initialValues can be pre-filled if needed
                    onSuccess={handleCreateSuccess}
                    onCancel={() => setIsCreateModalOpen(false)}
                />
            </Modal>
        </div>
    );
};

export default CourseListPage;
