// src/components/Course/CourseForm.tsx
import React, { useState, useRef } from 'react';
import { CourseCreatePayload } from '../../services/api';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Course } from '../../types';
import { createCourse, updateCourse } from '../../services/api';
import Button from '../Common/Button/Button';
import Input from '../Common/Input/Input';
import styles from './CourseForm.module.css';

interface CourseFormProps {
    initialValues?: Course;
    userId?: number;
    onSuccess: (course: Course) => void;
    onCancel: () => void;
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
    status: Yup.string()
        .oneOf(['active', 'inactive', 'draft'], 'Invalid status')
        .required('Status is required'),
    image: Yup.mixed<File | string>()
        .nullable() // This allows the value to be null
        .optional() // This allows the value to be undefined (if field isn't always present)
        .test('fileSize', 'File too large (max 2MB)', (value) => {
            // Your existing test correctly handles non-File types already
            if (!value || !(value instanceof File)) return true;
            return value.size <= 2 * 1024 * 1024; // 2MB limit
        })
        .test('fileType', 'Unsupported file format (use PNG, JPG, JPEG)', (value) => {
            // Your existing test correctly handles non-File types already
            if (!value || !(value instanceof File)) return true;
            return ['image/png', 'image/jpeg', 'image/jpg'].includes(value.type);
        }),
});

// Type for form values handled by Formik
interface CourseFormValues extends Omit<Course, 'id' | 'created_at' | 'updated_at' | 'instructor' | 'price' | 'image'> {
    price: number | string;
    instructor_id: number | undefined;
    image: File | null | string;
}


const CourseForm: React.FC<CourseFormProps> = ({ initialValues, userId, onSuccess, onCancel }) => {
    const [formError, setFormError] = useState<string | null>(null);
    const isEditing = Boolean(initialValues);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const formInitialValues: CourseFormValues = {
        title: initialValues?.title || '',
        description: initialValues?.description || '',
        price: initialValues?.price || '',
        status: initialValues?.status || 'draft',
        instructor_id: initialValues?.instructor?.id ?? userId,
        image: initialValues?.image || null,
    };

    if (!isEditing && typeof userId !== 'number') {
        console.error("ERROR: CourseForm requires a valid 'userId' number prop when creating a new course.");
    }


    const handleSubmit = async (
        values: CourseFormValues,
        { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }
    ) => {
        setFormError(null);

        if (typeof values.instructor_id !== 'number') {
            setFormError("Instructor ID is missing or invalid.");
            setSubmitting(false);
            return;
        }

        type ApiPayload = Omit<CourseCreatePayload, 'image'> & { image?: File | null };

        const payload: ApiPayload = {
            title: values.title,
            description: values.description,
            price: String(values.price),
            status: values.status,
            instructor_id: values.instructor_id,
            ...(values.image instanceof File && { image: values.image }),
            ...(values.image === null && { image: null }),
        };

        try {
            let result: Course;
            if (isEditing && initialValues?.id) {
                result = await updateCourse(initialValues.id, payload);
                alert('Course updated successfully!');
            } else {
                const createPayload: CourseCreatePayload = {
                    ...payload,
                    instructor_id: payload.instructor_id,
                    image: values.image instanceof File ? values.image : undefined
                };
                if (payload.image === null && createPayload.hasOwnProperty('image')) {
                    delete createPayload.image;
                }

                result = await createCourse(createPayload);
                alert('Course created successfully!');
            }
            onSuccess(result);
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

    const getImageUrl = (imagePath?: string | null): string | null => {
        const placeholderImage = '/vite.svg';
        if (!imagePath) {
            return !isEditing ? placeholderImage : null;
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
            enableReinitialize
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
                                error={touched.title ? errors.title : undefined}
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
                                error={touched.price ? errors.price : undefined}
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

                    <Field type="hidden" name="instructor_id" />
                    {isEditing && initialValues?.instructor && (
                        <p className={styles.infoText}>Instructor: {initialValues.instructor.username}</p>
                    )}
                    {!isEditing && userId && (
                        <p className={styles.infoText}>Instructor: You (ID: {userId})</p>
                    )}

                    <div className={styles.inputGroup}>
                        <label htmlFor="image" className={styles.label}>
                            Course Image (Optional, max 2MB, PNG/JPG)
                        </label>

                        {isEditing && typeof values.image === 'string' && values.image && (
                            <div className={styles.imagePreviewContainer}>
                                <img src={getImageUrl(values.image) ?? ''} alt="Current course" className={styles.imagePreview} />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="small"
                                    onClick={() => {
                                        setFieldValue('image', null);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }}
                                    disabled={isSubmitting}
                                    className={styles.removeImageButton}
                                >
                                    Remove Image
                                </Button>
                            </div>
                        )}

                        {values.image instanceof File && (
                            <div className={styles.imagePreviewContainer}>
                                <img
                                    src={URL.createObjectURL(values.image)}
                                    alt="New image preview"
                                    className={styles.imagePreview}
                                    onLoad={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        URL.revokeObjectURL(target.src);
                                    }}
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
