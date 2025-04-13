// src/components/Course/CourseCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Course } from '../../types'; // Make sure types are imported correctly
import Button from '../Common/Button/Button'; // Import the refined Button
import styles from './CourseCard.module.css'; // Import the refined CSS Module
import { User, Activity, DollarSign, Trash2 } from 'lucide-react'; // Example icons

interface CourseCardProps {
    course: Course;
    onDelete: (id: number) => void; // Callback function for deletion
}

const CourseCard: React.FC<CourseCardProps> = ({ course, onDelete }) => {
    // Placeholder image path (can be in public folder or imported)
    const placeholderImage = '/vite.svg';

    // Function to construct the full image URL, handling missing or absolute URLs
    const getImageUrl = (imagePath?: string | null): string => {
        if (!imagePath) {
            return placeholderImage; // Use placeholder if no image path
        }
        // If imagePath is already a full URL, use it directly
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
            return imagePath;
        }
        // Prepend the base URL from environment variables
        // Ensure VITE_API_BASE_URL is set correctly (e.g., http://localhost:8000)
        // Assuming images are served from the root or a /media/ path relative to the domain
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
        // Remove trailing '/api' or similar parts if the image path is relative to the domain root
        const domainBaseUrl = apiBaseUrl.replace(/\/api\/?$/, '');
        // Ensure imagePath starts with a slash if it's relative to the domain root
        const formattedImagePath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;

        return `${domainBaseUrl}${formattedImagePath}`;
    };

    const handleDeleteClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation(); // Prevent the Link navigation when delete is clicked
        event.preventDefault(); // Prevent any default button behavior that might interfere
        onDelete(course.id); // Call the onDelete prop passed from the parent
    };

    return (
        <div className={styles.card}>
            {/* Link wrapping the image */}
            <Link to={`/courses/${course.id}`} className={styles.imageContainer} aria-label={`View details for ${course.title}`}>
                <img
                    src={getImageUrl(course.image)}
                    alt={`${course.title} course thumbnail`}
                    className={styles.image}
                    // Set the placeholder as the fallback source on error
                    onError={(e) => {
                       const target = e.target as HTMLImageElement;
                       if (target.src !== placeholderImage) { // Prevent infinite loop if placeholder fails
                           target.src = placeholderImage;
                       }
                    }}
                    loading="lazy" // Improve performance by lazy loading images
                />
            </Link>

            {/* Content Area */}
            <div className={styles.content}>
                {/* Link wrapping the title */}
                <Link to={`/courses/${course.id}`} className={styles.titleLink}>
                    <h3 className={styles.title} title={course.title}>{course.title}</h3>
                </Link>

                {/* Meta information section */}
                <div className={styles.metaInfo}>
                    <p className={styles.metaItem} title={`Instructor: ${course.instructor?.username || 'N/A'}`}>
                        <User size={14} aria-hidden="true"/> {/* Icon */}
                        <span className={styles.metaLabel}>Instructor:</span>
                        {/* Ensure text truncates gracefully if needed */}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                           {course.instructor?.username || 'N/A'}
                        </span>
                    </p>
                    <p className={styles.metaItem} title={`Price: $${parseFloat(course.price).toFixed(2)}`}>
                        <DollarSign size={14} aria-hidden="true"/> {/* Icon */}
                        <span className={styles.metaLabel}>Price:</span>
                        <span className={styles.price}>${parseFloat(course.price).toFixed(2)}</span>
                    </p>
                    <p className={styles.metaItem} title={`Status: ${course.status}`}>
                        <Activity size={14} aria-hidden="true"/> {/* Icon */}
                        <span className={styles.metaLabel}>Status:</span>
                        <span className={`${styles.statusBadge} ${styles[course.status]}`}>
                            {course.status}
                        </span>
                    </p>
                    {/* Add more meta items if needed (e.g., duration, level) */}
                </div>

                {/* Action Buttons Area */}
                <div className={styles.actions}>
                    {/* Consider removing View button if image/title are links */}
                    {/*
                    <Link to={`/courses/${course.id}`}>
                        <Button variant="secondary" size="small">View</Button>
                    </Link>
                    */}
                    <Button
                        variant="danger" // Use the danger variant from Button component
                        size="small"     // Use the small size
                        onClick={handleDeleteClick}
                        title={`Delete course ${course.title}`} // Add tooltip
                        aria-label={`Delete course ${course.title}`}
                    >
                        <Trash2 size={14} /> {/* Optional: Add delete icon */}
                        {/* Remove text if icon is sufficient */}
                        {/* Delete */}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CourseCard;
