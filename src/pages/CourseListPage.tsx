// src/pages/CourseListPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { listCourses, deleteCourse } from '../services/api';
import { Course, PaginatedResponse } from '../types';
import CourseCard from '../components/Course/CourseCard';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card"; // <-- Import Card
import CourseForm from '../components/Course/CourseForm';
import { useAuth } from '../hooks/useAuth';
import { toast } from "sonner"; // <-- Import toast from sonner
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, PlusCircle, ListX, ChevronsLeft, ChevronsRight, Search } from 'lucide-react'; // Added Search icon
import { useDebounce } from '@/hooks/useDebounce';

const ITEMS_PER_PAGE = 9; // Define how many courses per page

const CourseListPage: React.FC = () => {
    const { user, isLoading: isAuthLoading } = useAuth();
    const [coursesResponse, setCoursesResponse] = useState<PaginatedResponse<Course> | null>(null);
    const [isLoadingCourses, setIsLoadingCourses] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [page, setPage] = useState<number>(1);
    const debouncedSearchTerm = useDebounce(searchTerm, 500); // Debounce search input

    const fetchCourses = useCallback(async (currentPage: number, search: string) => {
        // Don't start loading courses if auth isn't loaded yet
        if (isAuthLoading) {
            setIsLoadingCourses(true); // Keep showing loading if auth isn't ready
            return;
        }
        setIsLoadingCourses(true);
        setError(null);
        try {
            // Adjust based on your API pagination (page size might be fixed or a param)
            const params = {
                page: currentPage,
                page_size: ITEMS_PER_PAGE, // Add if your API supports page_size
                search: search || undefined,
            };
            const data = await listCourses(params);
            setCoursesResponse(data);
        } catch (err: any) {
            const message = err.message || 'Failed to fetch courses.';
            setError(message);
            toast.error("Error Fetching Courses", { description: message });
            console.error("Fetch courses error:", err);
        } finally {
            setIsLoadingCourses(false);
        }
    }, [isAuthLoading]); // Removed toast from dependency array

    // Effect to fetch courses when page or debounced search term changes
    useEffect(() => {
        fetchCourses(page, debouncedSearchTerm);
    }, [fetchCourses, page, debouncedSearchTerm]);

    // Handle input change for search
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setPage(1); // Reset to first page on new search
    };

    // Callback for successful course creation
    const handleCreateSuccess = () => { // Removed unused 'newCourse' parameter
        setIsCreateModalOpen(false);
        fetchCourses(1, ''); // Refetch first page, clear search
        setSearchTerm('');
        setPage(1);
    };

    // Handle course deletion
    const handleDeleteCourse = async (courseId: number) => {
        if (window.confirm(`Are you sure you want to delete course ${courseId}? This cannot be undone.`)) {
            try {
                await deleteCourse(courseId);
                toast.success("Course deleted.");
                // Refetch current page or adjust logic if last item deleted
                fetchCourses(page, debouncedSearchTerm);
                 // If it was the last item on a page > 1, go back one page
                 if (coursesResponse?.results.length === 1 && page > 1) {
                     setPage(page - 1);
                 }
            } catch (err: any) {
                 const message = err.response?.data?.detail || err.message || 'Failed to delete course.';
                toast.error("Deletion Error", { description: message });
            }
        }
    };

    // Calculate total pages based on API response
    const totalPages = coursesResponse ? Math.ceil(coursesResponse.count / ITEMS_PER_PAGE) : 1;

    // Handle pagination clicks
    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= totalPages) {
            setPage(newPage);
            // Scroll to top might be nice here
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Combined loading state
    const isLoading = isLoadingCourses || isAuthLoading;
    const canCreateCourse = !isAuthLoading && !!user?.id;

    return (
        <div className="container mx-auto py-8 px-4">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    {/* Search Input */}
                    <div className="relative w-full md:w-64">
                         <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                         <Input
                            type="search"
                            placeholder="Search courses..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="pl-8 w-full" // Add padding for icon
                        />
                    </div>
                    {/* Create Course Button/Dialog */}
                    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                        <DialogTrigger asChild>
                            <Button disabled={!canCreateCourse} title={!canCreateCourse ? "Login to create courses" : "Create a new course"}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Create Course
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Create New Course</DialogTitle>
                            </DialogHeader>
                            {user?.id ? (
                                <CourseForm
                                    userId={user.id} // Pass user ID for creation
                                    onSuccess={handleCreateSuccess}
                                    onCancel={() => setIsCreateModalOpen(false)}
                                />
                            ) : (
                                // This case should technically not happen due to the disabled button, but good as fallback
                                <p className="text-destructive text-center py-4">User information not available.</p>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Error Display */}
            {error && !isLoading && (
                <Alert variant="destructive" className="mb-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error Fetching Courses</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                    {/* Optional: Add a retry button */}
                    {/* <Button variant="outline" size="sm" onClick={() => fetchCourses(page, debouncedSearchTerm)}>Retry</Button> */}
                </Alert>
            )}

            {/* Loading Skeletons */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                        <Card key={index} className="overflow-hidden">
                            <Skeleton className="aspect-video w-full" />
                            <div className="p-4 space-y-3"> {/* Adjusted spacing */}
                                <Skeleton className="h-5 w-3/4" /> {/* Title */}
                                <Skeleton className="h-4 w-1/2" /> {/* Instructor */}
                                <Skeleton className="h-4 w-1/4" /> {/* Price */}
                                <Skeleton className="h-4 w-1/3" /> {/* Status */}
                            </div>
                             <div className="p-4 pt-0 flex justify-end gap-2">
                                 <Skeleton className="h-9 w-20 rounded-md" /> {/* Button */}
                                 <Skeleton className="h-9 w-24 rounded-md" /> {/* Button */}
                            </div>
                        </Card>
                    ))}
                </div>
            ) : /* Course Grid or No Results Message */
            coursesResponse && coursesResponse.results.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {coursesResponse.results.map((course) => (
                            <CourseCard key={course.id} course={course} onDelete={handleDeleteCourse} />
                        ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center space-x-2 mt-8">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handlePageChange(page - 1)}
                                disabled={page === 1}
                                aria-label="Previous page"
                            >
                                <ChevronsLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium tabular-nums">
                                Page {page} of {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handlePageChange(page + 1)}
                                disabled={page === totalPages}
                                aria-label="Next page"
                            >
                                <ChevronsRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </>
            ) : (
                /* No Results Message (only if no error occurred) */
                 !error && (
                    <div className="text-center py-16 text-muted-foreground border border-dashed rounded-lg">
                         <ListX className="mx-auto h-12 w-12 mb-4 text-muted-foreground/50" />
                        <p className="font-medium">No Courses Found</p>
                        <p className="text-sm">
                            {debouncedSearchTerm
                                ? `No courses match your search "${debouncedSearchTerm}". Try a different search term.`
                                : "There are currently no courses available. Try creating one!"}
                         </p>
                    </div>
                 )
            )}
        </div>
    );
};

export default CourseListPage;
