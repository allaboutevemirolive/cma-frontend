// src/components/Course/CourseCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Course } from '../../types';
import Button from '../Common/Button/Button';
import styles from './CourseCard.module.css';
import { User as UserIcon, Activity, DollarSign, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface CourseCardProps {
    course: Course;
    onDelete: (id: number) => void;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, onDelete }) => {

    const { user } = useAuth();
    const placeholderImage = '/vite.svg';

    const canDelete = user && (user.id === course.instructor?.id || user.is_staff === true);

    const getImageUrl = (imagePath?: string | null): string => {
        if (!imagePath) {
            return placeholderImage;
        }

        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
            return imagePath;
        }

        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

        const domainBaseUrl = apiBaseUrl.replace(/\/api\/?$/, '');

        const formattedImagePath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;

        return `${domainBaseUrl}${formattedImagePath}`;
    };

    const handleDeleteClick = (event: React.MouseEvent<HTMLButtonElement>) => {

        event.stopPropagation();

        event.preventDefault();

        onDelete(course.id);
    };

    const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const target = event.target as HTMLImageElement;

        if (target.src !== placeholderImage) {
            target.src = placeholderImage;
        }
    }

    return (
        <div className={styles.card}>
            {}
            <Link
                to={`/courses/${course.id}`}
                className={styles.imageContainer}
                aria-label={`View details for ${course.title}`}
            >
                <img
                    src={getImageUrl(course.image)}
                    alt={`${course.title} course thumbnail`}
                    className={styles.image}
                    onError={handleImageError}
                    loading="lazy"
                />
            </Link>

            {}
            <div className={styles.content}>
                {}
                <Link to={`/courses/${course.id}`} className={styles.titleLink}>
                    <h3 className={styles.title} title={course.title}>{course.title}</h3>
                </Link>

                {}
                <div className={styles.metaInfo}>
                    {}
                    <div className={styles.metaItem} title={`Instructor: ${course.instructor?.username || 'N/A'}`}>
                        <UserIcon size={14} aria-hidden="true" /> {}
                        <span className={styles.metaLabel}>Instructor:</span>
                        {}
                        <span>
                            {course.instructor?.username || 'N/A'}
                        </span>
                    </div>
                    {}
                    <div className={styles.metaItem} title={`Price: $${parseFloat(course.price).toFixed(2)}`}>
                        <DollarSign size={14} aria-hidden="true" />
                        <span className={styles.metaLabel}>Price:</span>
                        <span className={styles.price}>${parseFloat(course.price).toFixed(2)}</span>
                    </div>
                    <div className={styles.metaItem} title={`Status: ${course.status}`}>
                        <Activity size={14} aria-hidden="true" />
                        <span className={styles.metaLabel}>Status:</span>
                        <span className={`${styles.statusBadge} ${styles[course.status] || ''}`}>
                            {course.status}
                        </span>
                    </div>
                </div>

                <div className={styles.actions}>
                    {}
                    {canDelete && (
                        <Button
                            variant="danger"
                            size="small"
                            onClick={handleDeleteClick}
                            title={`Delete course: ${course.title}`}
                            aria-label={`Delete course ${course.title}`}
                        >
                            <Trash2 size={14} aria-hidden="true" /> {}
                            {}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CourseCard;
