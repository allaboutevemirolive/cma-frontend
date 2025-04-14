// src/components/Course/CourseCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Course } from '../../types'; // Ensure User type includes profile/is_staff if needed for complex checks
import Button from '../Common/Button/Button';
import styles from './CourseCard.module.css';
import { User as UserIcon, Activity, DollarSign, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth'; // Import useAuth hook

interface CourseCardProps {
    course: Course;
    onDelete: (id: number) => void; // Callback function for deletion
}

const CourseCard: React.FC<CourseCardProps> = ({ course, onDelete }) => {
    // Get the currently logged-in user from the Auth context
    const { user } = useAuth();
    const placeholderImage = '/vite.svg'; // Path to your placeholder image in the public folder

    // --- Role-Based Access Check ---
    // Determine if the current user can delete this specific course.
    // Checks if:
    // 1. A user is logged in (`user` is not null).
    // 2. The logged-in user is the instructor of the course.
    // 3. OR the logged-in user is an admin (is_staff).
    const canDelete = user && (user.id === course.instructor?.id || user.is_staff === true);

    // --- Image URL Helper ---
    // Function to construct the full image URL from the relative path provided by the backend.
    // Handles missing paths, absolute URLs, and prepends the VITE_API_BASE_URL.
    const getImageUrl = (imagePath?: string | null): string => {
        if (!imagePath) {
            return placeholderImage; // Use placeholder if no image path
        }
        // If imagePath is already a full URL, use it directly
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
            return imagePath;
        }
        // Prepend the base URL from environment variables (ensure VITE_API_BASE_URL is set, e.g., http://localhost:8000)
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
        // Remove trailing '/api' or similar parts if the image path is relative to the domain root
        const domainBaseUrl = apiBaseUrl.replace(/\/api\/?$/, '');
        // Ensure imagePath starts with a slash if it's relative to the domain root
        const formattedImagePath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;

        // Construct the full URL
        return `${domainBaseUrl}${formattedImagePath}`;
    };

    // --- Event Handlers ---
    // Handles the click on the delete button.
    const handleDeleteClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        // Prevent the event from propagating to the parent Link element
        event.stopPropagation();
        // Prevent any default button behavior that might interfere
        event.preventDefault();
        // Call the onDelete callback passed from the parent component (CourseListPage)
        onDelete(course.id);
    };

    // Fallback handler for image loading errors
    const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const target = event.target as HTMLImageElement;
        // Prevent potential infinite loop if the placeholder itself fails
        if (target.src !== placeholderImage) {
            target.src = placeholderImage;
        }
    }

    return (
        <div className={styles.card}>
            {/* Image Section: Links to the course detail page */}
            <Link
                to={`/courses/${course.id}`}
                className={styles.imageContainer}
                aria-label={`View details for ${course.title}`}
            >
                <img
                    src={getImageUrl(course.image)}
                    alt={`${course.title} course thumbnail`}
                    className={styles.image}
                    onError={handleImageError} // Use the error handler
                    loading="lazy" // Improve performance by lazy loading images
                />
            </Link>

            {/* Content Section */}
            <div className={styles.content}>
                {/* Title Section: Links to the course detail page */}
                <Link to={`/courses/${course.id}`} className={styles.titleLink}>
                    <h3 className={styles.title} title={course.title}>{course.title}</h3>
                </Link>

                {/* Meta Information Section */}
                <div className={styles.metaInfo}>
                    {/* Instructor Info */}
                    <p className={styles.metaItem} title={`Instructor: ${course.instructor?.username || 'N/A'}`}>
                        <UserIcon size={14} aria-hidden="true" />
                        <span className={styles.metaLabel}>Instructor:</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {course.instructor?.username || 'N/A'}
                        </span>
                    </p>
                    {/* Price Info */}
                    <p className={styles.metaItem} title={`Price: $${parseFloat(course.price).toFixed(2)}`}>
                        <DollarSign size={14} aria-hidden="true" />
                        <span className={styles.metaLabel}>Price:</span>
                        <span className={styles.price}>${parseFloat(course.price).toFixed(2)}</span>
                    </p>
                    {/* Status Info */}
                    <p className={styles.metaItem} title={`Status: ${course.status}`}>
                        <Activity size={14} aria-hidden="true" />
                        <span className={styles.metaLabel}>Status:</span>
                        {/* Dynamically apply status badge style based on course.status */}
                        <span className={`${styles.statusBadge} ${styles[course.status] || ''}`}>
                            {course.status}
                        </span>
                    </p>
                </div>

                {/* Action Buttons Area */}
                <div className={styles.actions}>
                    {/* Delete Button: Conditionally rendered based on RBAC */}
                    {canDelete && (
                        <Button
                            variant="danger" // Use the danger variant
                            size="small"     // Use the small size
                            onClick={handleDeleteClick}
                            title={`Delete course: ${course.title}`} // Tooltip for clarity
                            aria-label={`Delete course ${course.title}`} // Accessibility label
                        >
                            <Trash2 size={14} aria-hidden="true" /> {/* Optional: Delete icon */}
                            {/* You can add text like "Delete" here if preferred */}
                        </Button>
                    )}
                    {/* Add other actions like "Edit" here if needed on the card itself, checking permissions */}
                </div>
            </div>
        </div>
    );
};

export default CourseCard;
