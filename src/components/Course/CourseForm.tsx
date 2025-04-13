// src/components/Course/CourseForm.tsx
import React, { useState, useRef } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Course } from '../../types'; // Assuming User type is nested in Course or not directly needed here
import { createCourse, updateCourse } from '../../services/api'; // Import API functions
import Button from '../Common/Button/Button';
import Input from '../Common/Input/Input'; // Using our custom Input
import styles from './CourseForm.module.css';
// Removed useAuth import as ID is passed via prop for creation

interface CourseFormProps {
    initialValues?: Course; // Pass existing course data for editing
    userId?: number;        // Pass this explicitly for NEW courses (required if initialValues is undefined)
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
    // instructor_id validation happens implicitly by requiring userId prop or initialValues
    status: Yup.string()
        .oneOf(['active', 'inactive', 'draft'], 'Invalid status')
        .required('Status is required'),
    image: Yup.mixed<File | null | string>().optional() // Handle File, null, or string (URL)
        .test('fileSize', 'File too large (max 2MB)', (value) => {
            if (!value || !(value instanceof File)) return true; // Allow no file or non-File types (like URLs when editing)
            return value.size <= 2 * 1024 * 1024; // 2MB limit
        })
        .test('fileType', 'Unsupported file format (use PNG, JPG, JPEG)', (value) => {
            if (!value || !(value instanceof File)) return true;
            return ['image/png', 'image/jpeg', 'image/jpg'].includes(value.type);
        }),
});

// Type for form values handled by Formik
interface CourseFormValues extends Omit<Course, 'id' | 'created_at' | 'updated_at' | 'instructor' | 'price' | 'image'> {
    price: number | string; // Allow string input, convert later
    instructor_id: number | undefined; // Needed for submission
    image: File | null | string; // Can be File for upload, string (URL) for existing, or null
}


const CourseForm: React.FC<CourseFormProps> = ({ initialValues, userId, onSuccess, onCancel }) => {
    const [formError, setFormError] = useState<string | null>(null);
    const isEditing = Boolean(initialValues);
    const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

    // Set default values for the form
    const formInitialValues: CourseFormValues = {
        title: initialValues?.title || '',
        description: initialValues?.description || '',
        price: initialValues?.price || '', // Keep as string initially for input field
        status: initialValues?.status || 'draft',
        // Use instructor ID from initialValues if editing, otherwise use the userId prop for creation
        instructor_id: initialValues?.instructor?.id ?? userId, // Use nullish coalescing
        image: initialValues?.image || null, // Existing image URL or null for creation
    };

    // Perform a check early if instructor ID is missing for creation
    if (!isEditing && typeof userId !== 'number') {
        console.error("ERROR: CourseForm requires a valid 'userId' number prop when creating a new course.");
        // Optionally, you could return an error message component here instead of the form
        // return <div className={styles.formError}>Cannot create course: Missing instructor information.</div>;
    }


    const handleSubmit = async (
        values: CourseFormValues,
        { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }
    ) => {
        setFormError(null); // Clear previous errors

        // Re-check instructor_id before submitting (should be set by initialValues or userId prop)
        if (typeof values.instructor_id !== 'number') {
            setFormError("Instructor ID is missing or invalid.");
            setSubmitting(false);
            return;
        }

        // Prepare payload type explicitly for API functions
        // Omit fields not sent in the payload body (like the nested instructor object)
        type ApiPayload = Omit<CourseCreatePayload, 'image'> & { image?: File | null };

        const payload: ApiPayload = {
            title: values.title,
            description: values.description,
            price: String(values.price), // Ensure price is a string for the API
            status: values.status,
            instructor_id: values.instructor_id, // Ensure instructor_id is set
            // Conditionally add 'image' based on its type
            ...(values.image instanceof File && { image: values.image }),
            ...(values.image === null && { image: null }), // Send null if explicitly set for removal
        };

        try {
            let result: Course;
            if (isEditing && initialValues?.id) {
                // Use updateCourse for edits (handles PATCH)
                result = await updateCourse(initialValues.id, payload);
                alert('Course updated successfully!');
            } else {
                // Use createCourse for new courses
                // Ensure the payload matches CourseCreatePayload structure
                 const createPayload: CourseCreatePayload = {
                    ...payload,
                    instructor_id: payload.instructor_id, // Already validated as number
                    image: values.image instanceof File ? values.image : undefined // Only pass if File
                 };
                 // Handle the case where payload.image might be null, but createCourse handles File | undefined
                 if (payload.image === null && createPayload.hasOwnProperty('image')) {
                    delete createPayload.image; // Don't send null image for create
                 }

                 result = await createCourse(createPayload);
                 alert('Course created successfully!');
            }
            onSuccess(result); // Call the success callback with the returned course data
        } catch (error: any) {
            console.error('Course form submission error:', error);
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

    // Helper to get image URL for preview or placeholder
    const getImageUrl = (imagePath?: string | null): string | null => {
        const placeholderImage = '/vite.svg';
        if (!imagePath) {
            // Show placeholder only if creating, show nothing if editing and no image
            return !isEditing ? placeholderImage : null;
        }
        // If it's already a full URL (from API response), use it directly
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
            return imagePath;
        }
        // Otherwise, assume it's a relative path from MEDIA_URL (less common now with full URLs from API)
        const baseUrl = import.meta.env.VITE_API_BASE_URL.replace('/api', ''); // Get domain root
        return `${baseUrl}${imagePath}`;
    };

    return (
        <Formik
            initialValues={formInitialValues}
            validationSchema={CourseSchema}
            onSubmit={handleSubmit}
            enableReinitialize // Update form if initialValues prop changes (useful for edit form)
        >
            {/* Formik render props provide form state and helpers */}
            {({ isSubmitting, setFieldValue, errors, touched, values }) => (
                <Form className={styles.form}>
                    {/* Display general form errors */}
                    {formError && <div className={styles.formError}>{formError}</div>}

                    {/* Course Title Field */}
                    <Field name="title">
                        {({ field }: any) => (
                            <Input
                                {...field}
                                id="title"
                                label="Course Title"
                                placeholder="e.g., Introduction to React"
                                error={touched.title ? errors.title : undefined}
                                disabled={isSubmitting}
                            />
                        )}
                    </Field>

                    {/* Description Field */}
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

                    {/* Price Field */}
                    <Field name="price">
                        {({ field }: any) => (
                            <Input
                                {...field}
                                id="price"
                                label="Price ($)"
                                type="number"
                                step="0.01"
                                placeholder="e.g., 29.99"
                                error={touched.price ? errors.price : undefined}
                                disabled={isSubmitting}
                            />
                        )}
                    </Field>

                    {/* Status Field */}
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

                    {/* Instructor ID - Hidden field to hold the value */}
                    <Field type="hidden" name="instructor_id" />
                    {/* Display instructor info for context */}
                    {isEditing && initialValues?.instructor && (
                        <p className={styles.infoText}>Instructor: {initialValues.instructor.username}</p>
                    )}
                    {!isEditing && userId && ( // Display instructor info if creating and ID is passed
                        <p className={styles.infoText}>Instructor: You (ID: {userId})</p>
                    )}

                    {/* Image Upload Section */}
                    <div className={styles.inputGroup}>
                        <label htmlFor="image" className={styles.label}>
                            Course Image (Optional, max 2MB, PNG/JPG)
                        </label>

                        {/* Existing Image Preview (only when editing with a string URL) */}
                        {isEditing && typeof values.image === 'string' && values.image && (
                            <div className={styles.imagePreviewContainer}>
                                <img src={getImageUrl(values.image) ?? ''} alt="Current course" className={styles.imagePreview} />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="small"
                                    onClick={() => {
                                        setFieldValue('image', null); // Set to null to indicate removal
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }}
                                    disabled={isSubmitting}
                                    className={styles.removeImageButton}
                                >
                                    Remove Image
                                </Button>
                            </div>
                        )}

                        {/* New File Preview (only when a file is selected) */}
                        {values.image instanceof File && (
                            <div className={styles.imagePreviewContainer}>
                                <img
                                    src={URL.createObjectURL(values.image)}
                                    alt="New image preview"
                                    className={styles.imagePreview}
                                    // Clean up object URL when the component might re-render causing the URL to become invalid
                                    // Note: This might cause brief flicker if component re-renders for other reasons.
                                    // Consider more robust preview/cleanup logic if needed.
                                    onLoad={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        // Optional: Keep URL until unmount? More complex state needed.
                                         URL.revokeObjectURL(target.src); // Revoke immediately after load
                                    }}
                                />
                            </div>
                        )}

                        {/* File Input */}
                        <input
                            id="image"
                            name="image"
                            type="file"
                            ref={fileInputRef}
                            onChange={(event) => {
                                // Set the field value to the selected File object or null
                                setFieldValue("image", event.currentTarget.files ? event.currentTarget.files[0] : null);
                            }}
                            className={styles.fileInput}
                            accept="image/png, image/jpeg, image/jpg"
                            disabled={isSubmitting}
                        />
                        <ErrorMessage name="image" component="div" className={styles.errorMessage} />
                    </div>

                    {/* Action Buttons */}
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
