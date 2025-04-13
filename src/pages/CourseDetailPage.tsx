// src/pages/CourseDetailPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getCourseDetails } from '../services/api';
import { Course } from '../types';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CourseForm from '../components/Course/CourseForm';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge, BadgeProps } from "@/components/ui/badge"; // Import badgeVariants AND BadgeProps
import { toast } from "sonner";
import { formatDate, formatPrice, getImageUrl } from '@/lib/utils';
import { AlertTriangle, ArrowLeft, Edit, CalendarDays, Tag, UserCircle, DollarSign, Info } from 'lucide-react';

const CourseDetailPage: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const [course, setCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

    const fetchCourse = useCallback(async () => {
        // ... (fetch logic remains the same)
        if (!courseId) {
            setError('Course ID is missing from URL.');
            setIsLoading(false);
            toast.error("Error", { description: "Course ID is missing." });
            navigate('/courses', { replace: true }); // Navigate back if ID is invalid
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const numericCourseId = parseInt(courseId, 10);
            if (isNaN(numericCourseId)) {
                throw new Error("Invalid Course ID format.");
            }
            const data = await getCourseDetails(numericCourseId);
            setCourse(data);
        } catch (err: any) {
            let message = 'Failed to fetch course details.';
            if (err.message === "Invalid Course ID format.") {
                message = err.message;
                navigate('/courses', { replace: true }); // Navigate back for invalid format too
            } else if (err.response && err.response.status === 404) {
                message = 'Course not found.';
                // Navigate back to list or to a dedicated 404 page
                navigate('/courses', { replace: true, state: { courseNotFound: true } }); // Pass state if needed
            } else if (err.message) {
                message = err.message;
            }
            setError(message);
            // Show toast only if it's not a 'not found' redirection
            if (!(err.response && err.response.status === 404) && err.message !== "Invalid Course ID format.") {
                toast.error("Error Fetching Details", { description: message });
            }
            console.error("Fetch course detail error:", err);
        } finally {
            setIsLoading(false);
        }
    }, [courseId, navigate]);

    useEffect(() => {
        fetchCourse();
    }, [fetchCourse]);

    const handleEditSuccess = (updatedCourse: Course) => {
        setCourse(updatedCourse);
        setIsEditModalOpen(false);
    };

    // Ensure the return type explicitly matches the allowed variants in BadgeProps
    // (excluding null/undefined as the function logic guarantees a string)
    const getStatusVariant = (status: Course['status']): NonNullable<BadgeProps['variant']> => {
        switch (status) {
            case 'active': return 'success';
            case 'inactive': return 'secondary';
            case 'draft': return 'warning';
            default: return 'default'; // Fallback ensures a valid string is always returned
        }
    };

    const placeholderImage = '/vite.svg';

    // --- Loading State UI (remains the same) ---
    if (isLoading) {
        return (
            <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
                <Skeleton className="h-9 w-36" />
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <Skeleton className="h-12 w-3/4 md:w-1/2" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <Skeleton className="w-full aspect-[16/7] rounded-lg" />
                <Skeleton className="h-24 w-full" />
                <div className="border rounded-lg p-4 md:p-6 space-y-4">
                    <Skeleton className="h-6 w-24" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-5 w-44" />
                        <Skeleton className="h-5 w-52" />
                        <Skeleton className="h-5 w-56" />
                    </div>
                </div>
            </div>
        );
    }

    // --- Error State UI (remains the same) ---
    if (error && !course) {
        return (
            <div className="container mx-auto py-16 px-4 text-center">
                <Alert variant="destructive" className="max-w-md mx-auto mb-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error Loading Course</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button variant="outline" asChild>
                    <Link to="/courses">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Courses
                    </Link>
                </Button>
            </div>
        );
    }

    // --- Course Not Found (remains the same) ---
    if (!course) {
        return (
            <div className="container mx-auto py-16 px-4 text-center text-muted-foreground">
                The requested course could not be found or loaded.
                <div className='mt-4'>
                    <Button variant="outline" asChild>
                        <Link to="/courses">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Courses
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    // --- Success State UI ---
    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            {/* Back Button (remains the same) */}
            <Button variant="outline" size="sm" asChild className="mb-6 group">
                <Link to="/courses">
                    <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Courses
                </Link>
            </Button>

            {/* Header: Title and Edit Button (remains the same) */}
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start gap-4">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex-1 break-words hyphens-auto">
                    {course.title}
                </h1>
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Edit className="mr-2 h-4 w-4" /> Edit Course
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Edit Course: {course.title}</DialogTitle>
                        </DialogHeader>
                        <CourseForm
                            initialValues={course}
                            onSuccess={handleEditSuccess}
                            onCancel={() => setIsEditModalOpen(false)}
                            userId={course.instructor.id}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Course Image (remains the same) */}
            <img
                src={getImageUrl(course.image, placeholderImage)}
                alt={`Thumbnail for ${course.title}`}
                className="w-full aspect-[16/7] object-cover rounded-lg mb-6 bg-muted border"
                onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = placeholderImage;
                }}
                loading="lazy"
            />

            {/* Description (remains the same) */}
            <div className="prose dark:prose-invert max-w-none mb-8 text-foreground/90">
                {course.description || <p className="italic text-muted-foreground">No description provided.</p>}
            </div>

            {/* Details Section */}
            <div className="border rounded-lg p-4 md:p-6 bg-card shadow-sm">
                <h2 className="text-xl font-semibold mb-4 flex items-center text-card-foreground">
                    <Info className="mr-2 h-5 w-5 text-primary" /> Details
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    {/* ... Instructor, Price ... */}
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <UserCircle className="h-4 w-4 flex-shrink-0" />
                        <span><strong>Instructor:</strong> {course.instructor?.username || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="h-4 w-4 flex-shrink-0" />
                        <span><strong>Price:</strong> {formatPrice(course.price)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Tag className="h-4 w-4 flex-shrink-0" />
                        <strong>Status:</strong>
                        {/* --- APPLY FIX HERE --- */}
                        <Badge
                            variant={getStatusVariant(course.status) ?? 'default'} // Add fallback
                            className="capitalize ml-1"
                        >
                            {course.status}
                        </Badge>
                        {/* --- END FIX --- */}
                    </div>
                    {/* ... Created, Updated ... */}
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarDays className="h-4 w-4 flex-shrink-0" />
                        <span><strong>Created:</strong> {formatDate(course.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground col-span-1 sm:col-span-2">
                        <CalendarDays className="h-4 w-4 flex-shrink-0" />
                        <span><strong>Last Updated:</strong> {formatDate(course.updated_at)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseDetailPage;
