// src/components/Course/CourseCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Course } from '../../types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getImageUrl, formatPrice } from '@/lib/utils'; // Use helpers
import { Trash2, Eye } from 'lucide-react'; // Icons

interface CourseCardProps {
    course: Course;
    onDelete: (id: number) => void;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, onDelete }) => {
    const placeholderImage = '/vite.svg';

    const getStatusVariant = (status: Course['status']): React.ComponentProps<typeof Badge>['variant'] => {
        switch (status) {
            case 'active': return 'success'; // Requires adding 'success' variant to Badge component
            case 'inactive': return 'secondary';
            case 'draft': return 'warning'; // Requires adding 'warning' variant to Badge component
            default: return 'default';
        }
    };

    // You might need to add custom variants to your Badge component (src/components/ui/badge.tsx)
    // Example for success variant:
    // success: "border-transparent bg-green-100 text-green-800 hover:bg-green-100/80 dark:bg-green-900/20 dark:text-green-400",
    // Example for warning variant:
    // warning: "border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80 dark:bg-yellow-900/20 dark:text-yellow-400",

    return (
        <Card className="flex flex-col overflow-hidden">
            <CardHeader className="p-0">
                <img
                    src={getImageUrl(course.image, placeholderImage)}
                    alt={`${course.title} thumbnail`}
                    className="aspect-video w-full object-cover" // aspect-video ensures consistent ratio
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = placeholderImage;
                    }}
                    loading="lazy" // Add lazy loading
                />
            </CardHeader>
            <CardContent className="flex-grow p-4 space-y-2">
                <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle> {/* Limit title lines */}
                <div className="text-sm text-muted-foreground space-y-1">
                    <p>Instructor: {course.instructor?.username || 'N/A'}</p>
                    <p className="font-semibold">{formatPrice(course.price)}</p>
                    <p>Status: <Badge variant={getStatusVariant(course.status)} className="capitalize">{course.status}</Badge></p>
                </div>
            </CardContent>
            <CardFooter className="p-4 pt-0 flex justify-end gap-2">
                <Button variant="outline" size="sm" asChild>
                    <Link to={`/courses/${course.id}`}>
                        <Eye className="mr-2 h-4 w-4" /> View
                    </Link>
                </Button>
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(course.id)}
                >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
            </CardFooter>
        </Card>
    );
};

export default CourseCard;
