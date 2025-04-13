// src/components/Course/CourseCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Course } from '../../types'; // Import User type
import Button from '../Common/Button/Button';
import styles from './CourseCard.module.css';
import { User as UserIcon, Activity, DollarSign, Trash2, Edit } from 'lucide-react'; // Added Edit icon
import { useAuth } from '../../hooks/useAuth'; // Import useAuth

interface CourseCardProps {
    course: Course;
    onDelete: (id: number, title: string) => void; // Pass title for confirmation message
    onEdit: (course: Course) => void; // Callback to open edit modal
}

const CourseCard: React.FC<CourseCardProps> = ({ course, onDelete, onEdit }) => {
    const { user } = useAuth(); // Get current user
    const placeholderImage = '/vite.svg';

    // Determine if the current user is the instructor of this course
    const isInstructorOwner = user?.id === course.instructor?.id;

    const getImageUrl = (imagePath?: string | null): string => {
        if (!imagePath) {
            return placeholderImage;
        }
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
            return imagePath;
        }
        // Prepend API base URL (ensure it doesn't end with /api)
        const domainBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/?$/, '');
        const formattedImagePath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
        // Ensure double slashes aren't formed if domainBaseUrl is empty or '/'
        if (domainBaseUrl && domainBaseUrl !== '/') {
             return `${domainBaseUrl}${formattedImagePath}`;
        } else {
             // Handle cases where base URL is root or not set, assume relative path from host
             return formattedImagePath;
        }
    };

    const handleDeleteClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        event.preventDefault();
        onDelete(course.id, course.title); // Pass ID and title
    };

    const handleEditClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        event.preventDefault();
        onEdit(course); // Pass the course data to the handler
    };

    return (
        <div className={styles.card}>
            <Link to={`/courses/${course.id}`} className={styles.imageContainer} aria-label={`View details for ${course.title}`}>
                <img
                    src={getImageUrl(course.image)}
                    alt={`${course.title} course thumbnail`}
                    className={styles.image}
                    onError={(e) => {
                       const target = e.target as HTMLImageElement;
                       if (target.src !== placeholderImage) {
                           target.src = placeholderImage;
                       }
                    }}
                    loading="lazy"
                />
            </Link>

            <div className={styles.content}>
                <Link to={`/courses/${course.id}`} className={styles.titleLink}>
                    <h3 className={styles.title} title={course.title}>{course.title}</h3>
                </Link>

                <div className={styles.metaInfo}>
                    <p className={styles.metaItem} title={`Instructor: ${course.instructor?.username || 'N/A'}`}>
                        <UserIcon size={14} aria-hidden="true"/>
                        <span className={styles.metaLabel}>Instructor:</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                           {course.instructor?.username || 'N/A'}
                        </span>
                    </p>
                    <p className={styles.metaItem} title={`Price: $${parseFloat(course.price).toFixed(2)}`}>
                        <DollarSign size={14} aria-hidden="true"/>
                        <span className={styles.metaLabel}>Price:</span>
                        <span className={styles.price}>${parseFloat(course.price).toFixed(2)}</span>
                    </p>
                    <p className={styles.metaItem} title={`Status: ${course.status_display}`}>
                        <Activity size={14} aria-hidden="true"/>
                        <span className={styles.metaLabel}>Status:</span>
                        <span className={`${styles.statusBadge} ${styles[course.status]}`}>
                            {course.status_display} {/* Use status_display */}
                        </span>
                    </p>
                </div>

                {/* Action Buttons Area */}
                <div className={styles.actions}>
                    {/* Show Edit/Delete only if the logged-in user is the instructor */}
                    {isInstructorOwner && (
                        <>
                            <Button
                                variant="secondary" // Secondary variant for edit
                                size="small"
                                onClick={handleEditClick}
                                title={`Edit course ${course.title}`}
                                aria-label={`Edit course ${course.title}`}
                            >
                                <Edit size={14} />
                            </Button>
                            <Button
                                variant="danger"
                                size="small"
                                onClick={handleDeleteClick}
                                title={`Delete course ${course.title}`}
                                aria-label={`Delete course ${course.title}`}
                            >
                                <Trash2 size={14} />
                            </Button>
                        </>
                    )}
                    {/* TODO: Add Enroll button for students if not instructor */}
                    {!isInstructorOwner && (
                         <Button
                              variant="primary"
                              size="small"
                              onClick={() => alert(`Enroll logic for ${course.id} TBD`)} // Placeholder
                              title={`Enroll in ${course.title}`}
                              aria-label={`Enroll in ${course.title}`}
                          >
                             Enroll
                          </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CourseCard;
