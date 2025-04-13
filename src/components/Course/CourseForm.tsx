// src/components/Course/CourseForm.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage, FormikHelpers } from 'formik';
import * as Yup from 'yup';

// --- Corrected Imports ---
// Import types from the types directory
import { Course, User, CourseCreatePayload, CourseUpdatePayload, CourseStatus } from '../../types';
// Import API functions from the services directory
import { createCourse, updateCourse } from '../../services/api';
// --- End Corrected Imports ---

import Button from '../Common/Button/Button';
import Input from '../Common/Input/Input'; // Use the refined Input component
import styles from './CourseForm.module.css'; // Import the corresponding CSS module

interface CourseFormProps {
    initialValues?: Course;      // Optional: If provided, the form is in "edit" mode
    user?: User | null;          // Optional: Logged-in user, needed for creating courses
    onSuccess: (course: Course) => void; // Callback on successful create/update
    onCancel: () => void;        // Callback when the cancel button is clicked
}

// Validation Schema using Yup
const CourseSchema = Yup.object().shape({
    title: Yup.string()
        .min(3, 'Title must be at least 3 characters')
        .max(100, 'Title cannot exceed 100 characters')
        .required('Title is required'),
    description: Yup.string()
        .min(10, 'Description must be at least 10 characters')
        .required('Description is required'),
    price: Yup.number()
        .typeError('Price must be a valid number')
        // Allow 0 price for free courses
        .min(0, 'Price cannot be negative')
        .required('Price is required'),
    status: Yup.string()
        .oneOf<CourseStatus>(['active', 'inactive', 'draft'], 'Invalid status selected') // Use CourseStatus type
        .required('Status is required'),
    // Use Yup.mixed for files. Allow string for existing URLs during edit, File for new uploads, and null for removal.
    image: Yup.mixed<File | string >() // Allow File, string (URL), or null
        .nullable() // Allow null value (for removing image)
        .test('fileSize', 'Image file too large (max 2MB)', (value) => {
            if (!value || typeof value === 'string' || value === null) return true; // Skip if not a file or an existing URL string or null
            return value instanceof File && value.size <= 2 * 1024 * 1024; // 2MB check only for new Files
        })
        .test('fileType', 'Unsupported file format (PNG, JPG, JPEG only)', (value) => {
            if (!value || typeof value === 'string' || value === null) return true; // Skip if not a file or an existing URL string or null
             return value instanceof File && ['image/png', 'image/jpeg', 'image/jpg'].includes(value.type);
        }),
});

// Type for the values Formik will manage internally
interface CourseFormValues {
    title: string;
    description: string;
    price: number | string; // Input type="number" can yield string initially
    status: CourseStatus; // Use the imported CourseStatus type
    instructor_id: number | undefined; // Must be number or undefined
    image: File | string | null; // string = existing URL, File = new upload, null = remove
}


const CourseForm: React.FC<CourseFormProps> = ({ initialValues, user, onSuccess, onCancel }) => {
    const [formError, setFormError] = useState<string | null>(null);
    const isEditing = Boolean(initialValues?.id); // Check specifically for ID for edit mode
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State to manage the URL for the image preview
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Determine the instructor ID based on mode and props
    // Use nullish coalescing for safety
    const instructorId = isEditing ? initialValues?.instructor?.id : user?.id;

    // Set up initial form values for Formik
    const formInitialValues: CourseFormValues = {
        title: initialValues?.title || '',
        description: initialValues?.description || '',
        price: initialValues?.price ?? '', // Use ?? for empty string default if price is missing
        status: initialValues?.status || 'draft',
        instructor_id: instructorId,
        // Handle image: could be string (URL), File (shouldn't happen initially), or null
        image: typeof initialValues?.image === 'string' ? initialValues.image : null,
    };

    // Function to safely get image URL (handles API base URL if needed)
    const getImageUrl = (imagePath?: string | null): string | null => {
        if (!imagePath) return null;
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
        const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/?$/, '');
        const formattedImagePath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
        // Ensure double slashes aren't formed if baseUrl is empty or '/'
        if (baseUrl && baseUrl !== '/') {
            return `${baseUrl}${formattedImagePath}`;
        } else {
            return formattedImagePath; // Assume relative path from host if no base URL
        }
    };

    // Effect to set the initial preview URL when editing
    useEffect(() => {
        // Only set preview if initialValues.image is a string (URL)
        if (isEditing && typeof initialValues?.image === 'string') {
            setPreviewUrl(getImageUrl(initialValues.image));
        } else {
            setPreviewUrl(null); // Clear preview otherwise
        }
        // Reset filename attribute on mount/initialValue change
        if (fileInputRef.current) {
            fileInputRef.current.removeAttribute('data-filename');
            fileInputRef.current.value = ''; // Clear the file input visually
        }
    }, [initialValues?.image, isEditing]); // Rerun if initial image changes


    // Handle file input changes
    const handleFileChange = (
        event: React.ChangeEvent<HTMLInputElement>,
        setFieldValue: FormikHelpers<CourseFormValues>['setFieldValue']
    ) => {
        const file = event.currentTarget.files?.[0] ?? null; // Use optional chaining and nullish coalescing
        setFieldValue("image", file); // Update Formik state with File or null

        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Ensure result is a string before setting preview
                if (typeof reader.result === 'string') {
                     setPreviewUrl(reader.result);
                }
            };
            reader.readAsDataURL(file);
            event.currentTarget.setAttribute('data-filename', file.name);
        } else {
            setPreviewUrl(null); // Clear preview if no file selected
            if (event.currentTarget) { // Check if currentTarget exists before accessing
                 event.currentTarget.removeAttribute('data-filename');
            }
        }
    };

    // Handle removing the selected/existing image
    const handleRemoveImage = (
        setFieldValue: FormikHelpers<CourseFormValues>['setFieldValue']
    ) => {
        setFieldValue('image', null); // Set Formik value to null (signals removal)
        setPreviewUrl(null);          // Clear the visual preview
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Clear the file input element visually
            fileInputRef.current.removeAttribute('data-filename'); // Remove filename display
        }
    };

    // Handle form submission
    const handleSubmit = async (
        values: CourseFormValues,
        { setSubmitting }: FormikHelpers<CourseFormValues>
    ) => {
        setFormError(null); // Clear previous errors

        // Re-validate instructor_id before submission
        if (typeof values.instructor_id !== 'number') {
            setFormError("Instructor information is missing. Cannot submit.");
            setSubmitting(false);
            return;
        }

        try {
            let result: Course;

            if (isEditing && initialValues?.id) {
                // --- UPDATE Logic (PATCH) ---
                // Start building the JSON payload without the image initially
                const baseUpdatePayload: Omit<CourseUpdatePayload, 'image'> = {
                    title: values.title,
                    description: values.description,
                    price: String(values.price),
                    status: values.status,
                    instructor_id: values.instructor_id,
                };

                let dataToSend: FormData | CourseUpdatePayload;
                let headers: Record<string, string> = { 'Content-Type': 'application/json' }; // Default to JSON

                if (values.image instanceof File) {
                    // --- Case 1: New File Uploaded ---
                    const formData = new FormData();
                    // Append non-image fields
                    Object.entries(baseUpdatePayload).forEach(([key, value]) => {
                         if (value !== undefined) { // Ensure value exists before appending
                              formData.append(key, String(value));
                          }
                      });
                    // Append the new file
                    formData.append('image', values.image, values.image.name);
                    dataToSend = formData;
                    delete headers['Content-Type']; // Let browser handle Content-Type for FormData
                    console.log("Updating course with FormData (new image)");

                } else if (values.image === null && typeof initialValues.image === 'string') {
                    // --- Case 2: Image Explicitly Removed ---
                    // (Only send image: null if it was previously a string URL)
                    dataToSend = { ...baseUpdatePayload, image: null };
                    console.log("Updating course with JSON (removing image)");

                } else {
                     // --- Case 3: Image Unchanged or Initially Null ---
                     // Send JSON payload *without* the image field.
                     dataToSend = baseUpdatePayload; // Payload already excludes image
                     console.log("Updating course with JSON (image unchanged or was null)");
                }

                result = await updateCourse(initialValues.id, dataToSend); // Pass dataToSend (either FormData or JSON)

            } else {
                // --- CREATE Logic (POST) ---
                const createPayload: CourseCreatePayload = {
                    title: values.title,
                    description: values.description,
                    price: String(values.price), // Ensure price is string
                    status: values.status,
                    instructor_id: values.instructor_id, // Already checked it's a number
                    // Conditionally add image only if it's a File
                    ...(values.image instanceof File && { image: values.image }),
                };

                 // Explicitly remove image property if it's not a File (defensive)
                 if (!(createPayload.image instanceof File)) {
                    delete (createPayload as Partial<CourseCreatePayload>).image;
                 }

                console.log("Creating course with payload:", createPayload);
                result = await createCourse(createPayload);
            }
            onSuccess(result); // Call success callback with the result

        } catch (error: any) {
            console.error('Course form submission error:', error.response || error);
            const apiErrors = error.response?.data;
            let errorMessage = `Failed to ${isEditing ? 'update' : 'create'} course.`;

            // Handle detailed API errors
            if (apiErrors && typeof apiErrors === 'object') {
                if (apiErrors.detail) {
                    errorMessage = apiErrors.detail;
                } else if (apiErrors.non_field_errors) {
                    errorMessage = Array.isArray(apiErrors.non_field_errors) ? apiErrors.non_field_errors.join(' ') : String(apiErrors.non_field_errors);
                } else {
                    const fieldErrors = Object.entries(apiErrors)
                        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
                        .join('; ');
                    if (fieldErrors) {
                        errorMessage += ` Errors: ${fieldErrors}`;
                    }
                }
            } else if (typeof apiErrors === 'string') {
                errorMessage = apiErrors;
            } else if (error.message) {
                errorMessage = error.message;
            }
            setFormError(errorMessage);
        } finally {
            setSubmitting(false); // Ensure submitting state is always reset
        }
    };

    // Check if the submit button should be disabled
    const isSubmitDisabled = (isSubmitting: boolean): boolean => {
        if (isSubmitting) return true;
        if (typeof instructorId !== 'number') { // Check the derived instructorId
             console.warn("Submit disabled: Instructor ID is not a valid number.");
             return true;
        }
        return false;
    }

    return (
        <Formik
            initialValues={formInitialValues}
            validationSchema={CourseSchema}
            onSubmit={handleSubmit}
            enableReinitialize // Update form if initialValues prop changes
        >
            {({ isSubmitting, setFieldValue, errors, touched }) => (
                <Form className={styles.form} noValidate>
                    {formError && <div className={styles.formError} role="alert">{formError}</div>}

                    {/* Title Field */}
                    <Field name="title">
                        {({ field }: { field: any }) => (
                            <Input
                                {...field}
                                id="title"
                                label="Course Title *"
                                placeholder="e.g., Advanced React Patterns"
                                error={touched.title ? errors.title : undefined}
                                disabled={isSubmitting}
                                required
                                aria-required="true"
                            />
                        )}
                    </Field>

                    {/* Description Field */}
                    <Field name="description">
                         {({ field }: { field: any }) => (
                             <div className={styles.inputGroup}>
                                 <label htmlFor="description" className={styles.label}>Description *</label>
                                <textarea
                                    {...field}
                                    id="description"
                                    rows={5}
                                    placeholder="Provide a detailed description..."
                                    className={`${styles.textarea} ${touched.description && errors.description ? styles.errorInput : ''}`}
                                    disabled={isSubmitting}
                                    required
                                     aria-required="true"
                                     aria-invalid={touched.description && !!errors.description}
                                     aria-describedby={touched.description && errors.description ? "description-error" : undefined}
                                />
                                <ErrorMessage name="description" component="div" className={styles.errorMessage} id="description-error" />
                            </div>
                        )}
                    </Field>

                    {/* Price Field */}
                    <Field name="price">
                         {({ field }: { field: any }) => (
                             <Input
                                {...field}
                                id="price"
                                label="Price ($) *"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="e.g., 49.99 (use 0 for free)"
                                error={touched.price ? errors.price : undefined}
                                disabled={isSubmitting}
                                required
                                aria-required="true"
                             />
                        )}
                    </Field>

                    {/* Status Field */}
                    <Field name="status">
                         {({ field }: { field: any }) => (
                             <div className={styles.inputGroup}>
                                 <label htmlFor="status" className={styles.label}>Status *</label>
                                <select
                                    {...field}
                                    id="status"
                                    className={`${styles.select} ${touched.status && errors.status ? styles.errorInput : ''}`}
                                    disabled={isSubmitting}
                                    required
                                     aria-required="true"
                                     aria-invalid={touched.status && !!errors.status}
                                     aria-describedby={touched.status && errors.status ? "status-error" : undefined}
                                >
                                    <option value="draft">Draft</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                                <ErrorMessage name="status" component="div" className={styles.errorMessage} id="status-error" />
                            </div>
                        )}
                    </Field>

                     {/* Hidden field might not be strictly necessary as instructor_id is handled in handleSubmit */}
                     {/* <Field type="hidden" name="instructor_id" /> */}

                    {/* --- Image Upload Section --- */}
                    <div className={styles.inputGroup}>
                        <label htmlFor="image" className={styles.fileInputLabel}>
                            Course Image (Optional, max 2MB, PNG/JPG/JPEG)
                        </label>

                        {/* Preview Area */}
                        {previewUrl && (
                            <div className={styles.imagePreviewContainer}>
                                <img src={previewUrl} alt="Current course preview" className={styles.imagePreview} />
                                <Button
                                    type="button"
                                    variant="danger"
                                    size="small"
                                    onClick={() => handleRemoveImage(setFieldValue)}
                                    disabled={isSubmitting}
                                    className={styles.removeImageButton}
                                    aria-label="Remove course image"
                                >
                                    Remove
                                </Button>
                            </div>
                        )}

                        {/* Actual File Input */}
                        <input
                            id="image"
                            name="image"
                            type="file"
                            ref={fileInputRef}
                            onChange={(event) => handleFileChange(event, setFieldValue)}
                            className={`${styles.fileInput} ${touched.image && errors.image ? styles.errorInput : ''}`}
                            accept="image/png, image/jpeg, image/jpg"
                            disabled={isSubmitting}
                            aria-invalid={touched.image && !!errors.image}
                            aria-describedby="image-error"
                        />
                        <ErrorMessage name="image" component="div" className={styles.errorMessage} id="image-error" />
                    </div>

                    {/* --- Form Actions --- */}
                    <div className={styles.formActions}>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onCancel}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={isSubmitting}
                            disabled={isSubmitDisabled(isSubmitting)}
                            title={typeof instructorId !== 'number' ? 'Cannot submit without instructor info' : (isEditing ? 'Update Course' : 'Create Course')}
                        >
                            {isEditing ? 'Update Course' : 'Create Course'}
                        </Button>
                    </div>
                </Form>
            )}
        </Formik>
    );
};

export default CourseForm;
