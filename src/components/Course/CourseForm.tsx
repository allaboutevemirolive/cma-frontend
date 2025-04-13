// src/components/Course/CourseForm.tsx
import React, { useState, useRef } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Course } from '../../types'; // Removed unused 'User' import
import { createCourse, updateCourse } from '../../services/api'; // Import API functions
import Button from '../Common/Button/Button';
import Input from '../Common/Input/Input'; // Using our custom Input
import styles from './CourseForm.module.css';
import { useAuth } from '../../hooks/useAuth'; // To get logged-in user ID

interface CourseFormProps {
    initialValues?: Course; // Pass existing course data for editing
    onSuccess: (course: Course) => void; // Callback on successful submission
    onCancel: () => void; // Callback for cancelling
}

// Validation Schema
const CourseSchema = Yup.object().shape({
    title: Yup.string()
        .min(3, 'Title is too short')
        .max(100, 'Title is too long')
        .required('Title is required'),
    description: Yup.string().required('Description is required'),
    price: Yup.number()
        .typeError('Price must be a number')
        .positive('Price must be positive')
        .required('Price is required'),
    // instructor_id is required for creation, handled separately
    status: Yup.string()
        .oneOf(['active', 'inactive', 'draft'], 'Invalid status')
        .required('Status is required'),
    image: Yup.mixed().optional() // Optional file validation
        .test('fileSize', 'File too large (max 2MB)', (value) => {
            if (!value || !(value instanceof File)) return true; // Allow no file or non-File types (like URLs when editing)
            return value.size <= 2 * 1024 * 1024; // 2MB limit
        })
        .test('fileType', 'Unsupported file format (use PNG, JPG, JPEG)', (value) => {
            if (!value || !(value instanceof File)) return true;
            return ['image/png', 'image/jpeg', 'image/jpg'].includes(value.type);
        }),
});

// Extend Course type for form values (instructor_id is required, image can be File)
interface CourseFormValues extends Omit<Course, 'id' | 'created_at' | 'updated_at' | 'instructor' | 'price' | 'image'> {
    price: number | string; // Allow string input, convert later
    instructor_id: number | undefined; // Needed for submission
    image: File | null | string; // Can be File for upload, string (URL) for existing, or null
}


const CourseForm: React.FC<CourseFormProps> = ({ initialValues, onSuccess, onCancel }) => {
    const { user } = useAuth(); // Get logged-in user (assuming it has an ID)
    const [formError, setFormError] = useState<string | null>(null);
    const isEditing = Boolean(initialValues);
    const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

    // Set default values for the form
    const formInitialValues: CourseFormValues = {
        title: initialValues?.title || '',
        description: initialValues?.description || '',
        price: initialValues?.price || '', // Keep as string initially for input field
        status: initialValues?.status || 'draft',
        instructor_id: initialValues?.instructor?.id || user?.id, // Use logged-in user ID as default/fallback
        image: initialValues?.image || null, // Existing image URL or null
    };

    if (!formInitialValues.instructor_id && !isEditing) {
        console.error("Instructor ID is missing for new course creation.");
        // Handle this case - maybe disable form or show an error
        // For now, we'll let validation catch it if needed by the API call.
    }


    const handleSubmit = async (
        values: CourseFormValues,
        { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }
    ) => {
        setFormError(null);

        if (!values.instructor_id) {
            setFormError("Instructor ID is required.");
            setSubmitting(false);
            return;
        }

        // Define the payload type explicitly to allow File | null | undefined
        // This makes the intention clearer to TypeScript.
        const payload: {
            title: string;
            description: string;
            price: string;
            status: 'active' | 'inactive' | 'draft';
            instructor_id: number;
            image?: File | null; // Explicitly allow File or null
        } = {
            title: values.title,
            description: values.description,
            price: String(values.price), // Ensure price is a string for the API
            status: values.status,
            instructor_id: values.instructor_id,
            // Image handling:
            // If it's a file, include it.
            // If it's explicitly null (user removed it), include null.
            // Otherwise (it's a string URL or undefined), omit it from the initial payload object.
            ...(values.image instanceof File && { image: values.image }),
            ...(values.image === null && { image: null }),
        };

        try {
            let result: Course;
            if (isEditing && initialValues?.id) {
                // Ensure payload type matches updateCourse expectation (Partial<...>)
                // The 'as any' cast might be needed if TS has trouble inferring the complex conditional type for image
                result = await updateCourse(initialValues.id, payload as any);
                alert('Course updated successfully!');
            } else {
                // Ensure instructor_id is present for creation
                if (!payload.instructor_id) throw new Error("Instructor ID is missing.");
                // Ensure payload type matches createCourse expectation
                // The createCourse function differentiates based on payload.image type
                // The 'as any' cast might be needed here too.
                result = await createCourse(payload as any);
                alert('Course created successfully!');
            }
            onSuccess(result); // Call the success callback
        } catch (error: any) {
            console.error('Course form submission error:', error);
            // Extract specific error messages if the API provides them
            const apiErrors = error.response?.data;
            let errorMessage = `Failed to ${isEditing ? 'update' : 'create'} course.`;
            if (apiErrors && typeof apiErrors === 'object') {
                errorMessage += ' Errors: ' + Object.entries(apiErrors)
                    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                    .join('; ');
            } else if (apiErrors?.detail) {
                errorMessage = apiErrors.detail;
            } else if (error.message) {
                errorMessage = error.message;
            }
            setFormError(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    // Helper to get image URL for preview (copied from CourseCard/DetailPage for consistency)
    const getImageUrl = (imagePath?: string | null): string | null => {
        const placeholderImage = '/vite.svg'; // Default placeholder
        if (!imagePath) {
            return isEditing ? null : placeholderImage; // Show nothing if editing and no image, else placeholder
        }
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
            return imagePath;
        }
        const baseUrl = import.meta.env.VITE_API_BASE_URL.replace('/api', '');
        return `${baseUrl}${imagePath}`;
    };

    return (
        <Formik
            initialValues={formInitialValues}
            validationSchema={CourseSchema}
            onSubmit={handleSubmit}
            enableReinitialize // Allows form to update if initialValues prop changes
        >
            {({ isSubmitting, setFieldValue, errors, touched, values }) => (
                <Form className={styles.form}>
                    {formError && <div className={styles.formError}>{formError}</div>}

                    <Field name="title">
                        {({ field }: any) => (
                            <Input
                                {...field}
                                id="title"
                                label="Course Title"
                                placeholder="e.g., Introduction to React"
                                error={touched.title && errors.title}
                                disabled={isSubmitting}
                            />
                        )}
                    </Field>

                    <Field name="description">
                        {({ field }: any) => (
                            <div className={styles.inputGroup}>
                                <label htmlFor="description" className={styles.label}>Description</label>
                                <textarea
                                    {...field}
                                    id="description"
                                    rows={4}
                                    placeholder="Detailed course description..."
                                    className={`${styles.textarea} ${touched.description && errors.description ? styles.errorInput : ''}`}
                                    disabled={isSubmitting}
                                />
                                <ErrorMessage name="description" component="div" className={styles.errorMessage} />
                            </div>
                        )}
                    </Field>

                    <Field name="price">
                        {({ field }: any) => (
                            <Input
                                {...field}
                                id="price"
                                label="Price ($)"
                                type="number"
                                step="0.01"
                                placeholder="e.g., 29.99"
                                error={touched.price && errors.price}
                                disabled={isSubmitting}
                            />
                        )}
                    </Field>

                    <Field name="status">
                        {({ field }: any) => (
                            <div className={styles.inputGroup}>
                                <label htmlFor="status" className={styles.label}>Status</label>
                                <select
                                    {...field}
                                    id="status"
                                    className={`${styles.select} ${touched.status && errors.status ? styles.errorInput : ''}`}
                                    disabled={isSubmitting}
                                >
                                    <option value="draft">Draft</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                                <ErrorMessage name="status" component="div" className={styles.errorMessage} />
                            </div>
                        )}
                    </Field>

                    {/* Instructor ID - Hidden field, assuming it's set from context or initialValues */}
                    <Field type="hidden" name="instructor_id" />
                    {/* Optional: Display instructor if editing */}
                    {isEditing && initialValues?.instructor && (
                        <p className={styles.infoText}>Instructor: {initialValues.instructor.username}</p>
                    )}

                    {/* Image Upload */}
                    <div className={styles.inputGroup}>
                        <label htmlFor="image" className={styles.label}>
                            Course Image (Optional, max 2MB, PNG/JPG)
                        </label>
                        {/* Display current image preview if editing and image exists (and is a string URL) */}
                        {isEditing && typeof values.image === 'string' && values.image && (
                            <div className={styles.imagePreviewContainer}>
                                <img src={getImageUrl(values.image) ?? ''} alt="Current course" className={styles.imagePreview} />
                                <Button
                                    type="button"
                                    variant="secondary" // Use secondary or create a specific style
                                    size="small" // Use the size prop
                                    onClick={() => {
                                        setFieldValue('image', null); // Set to null to indicate removal intent
                                        if (fileInputRef.current) fileInputRef.current.value = ''; // Clear file input visually
                                    }}
                                    disabled={isSubmitting}
                                    className={styles.removeImageButton}
                                >
                                    Remove Image
                                </Button>
                            </div>
                        )}
                        {/* Display preview if a new file is selected */}
                        {values.image instanceof File && (
                            <div className={styles.imagePreviewContainer}>
                                <img
                                    src={URL.createObjectURL(values.image)}
                                    alt="Preview"
                                    className={styles.imagePreview}
                                    // Clean up object URL when component unmounts or file changes
                                    onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)}
                                />
                            </div>
                        )}

                        <input
                            id="image"
                            name="image"
                            type="file"
                            ref={fileInputRef}
                            onChange={(event) => {
                                setFieldValue("image", event.currentTarget.files ? event.currentTarget.files[0] : null);
                            }}
                            className={styles.fileInput}
                            accept="image/png, image/jpeg, image/jpg"
                            disabled={isSubmitting}
                        />
                        <ErrorMessage name="image" component="div" className={styles.errorMessage} />
                    </div>


                    <div className={styles.formActions}>
                        <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
                            {isEditing ? 'Update Course' : 'Create Course'}
                        </Button>
                        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
                            Cancel
                        </Button>
                    </div>
                </Form>
            )}
        </Formik>
    );
};

export default CourseForm;
