// src/components/Course/CourseForm.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage, FormikHelpers } from 'formik';
import * as Yup from 'yup';

import { Course, User } from '../../types'; 
import { createCourse, updateCourse, CourseCreatePayload, CourseUpdatePayload } from '../../services/api';
import Button from '../Common/Button/Button';
import Input from '../Common/Input/Input'; 
import styles from './CourseForm.module.css'; 

interface CourseFormProps {
    initialValues?: Course;      
    user?: User | null;          
    onSuccess: (course: Course) => void; 
    onCancel: () => void;        
}

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
        .positive('Price must be a positive number')
        .required('Price is required'),
    status: Yup.string()
        .oneOf(['active', 'inactive', 'draft'], 'Invalid status selected')
        .required('Status is required'),
    image: Yup.mixed<File | string>() 
        .nullable() 
        .test('fileSize', 'Image file too large (max 2MB)', (value) => {
            if (!value || !(value instanceof File)) return true; 
            return value.size <= 2 * 1024 * 1024; 
        })
        .test('fileType', 'Unsupported file format (PNG, JPG, JPEG only)', (value) => {
            if (!value || !(value instanceof File)) return true; 
            return ['image/png', 'image/jpeg', 'image/jpg'].includes(value.type);
        }),
});

interface CourseFormValues {
    title: string;
    description: string;
    price: number | string; 
    status: 'active' | 'inactive' | 'draft';
    instructor_id: number | undefined; 
    image: File | string | null; 
}

const CourseForm: React.FC<CourseFormProps> = ({ initialValues, user, onSuccess, onCancel }) => {
    const [formError, setFormError] = useState<string | null>(null);
    const isEditing = Boolean(initialValues?.id); 
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const instructorId = isEditing ? initialValues?.instructor?.id : user?.id;

    const formInitialValues: CourseFormValues = {
        title: initialValues?.title || '',
        description: initialValues?.description || '',
        price: initialValues?.price || '', 
        status: initialValues?.status || 'draft',
        instructor_id: instructorId,
        image: initialValues?.image || null, 
    };

    const getImageUrl = (imagePath?: string | null): string | null => {
        if (!imagePath) return null;
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
        const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/?$/, '');
        return `${baseUrl}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`;
    };

    useEffect(() => {
        if (isEditing && typeof initialValues?.image === 'string') {
            setPreviewUrl(getImageUrl(initialValues.image));
        } else {
            setPreviewUrl(null); 
        }

        if (fileInputRef.current) {
            fileInputRef.current.removeAttribute('data-filename');
            fileInputRef.current.value = '';
        }
    }, [initialValues?.image, isEditing]); 

    const handleFileChange = (
        event: React.ChangeEvent<HTMLInputElement>,
        setFieldValue: FormikHelpers<CourseFormValues>['setFieldValue']
    ) => {
        const file = event.currentTarget.files ? event.currentTarget.files[0] : null;
        setFieldValue("image", file); 

        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
            event.currentTarget.setAttribute('data-filename', file.name);
        } else {
            setPreviewUrl(null); 
            event.currentTarget.removeAttribute('data-filename');
        }
    };

    const handleRemoveImage = (
        setFieldValue: FormikHelpers<CourseFormValues>['setFieldValue']
    ) => {
        setFieldValue('image', null); 
        setPreviewUrl(null);          
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; 
            fileInputRef.current.removeAttribute('data-filename'); 
        }
    };

    const handleSubmit = async (
        values: CourseFormValues,
        { setSubmitting }: FormikHelpers<CourseFormValues>
    ) => {
        setFormError(null);

        if (typeof values.instructor_id !== 'number') {
            setFormError("Instructor ID is missing or invalid. Cannot submit.");
            setSubmitting(false);
            return;
        }

        const updatePayload: CourseUpdatePayload = {
            title: values.title,
            description: values.description,
            price: String(values.price), 
            status: values.status,
            instructor_id: values.instructor_id,
        };

        if (values.image === null) {
            updatePayload.image = null;
        }

        try {
            let result: Course;
            if (isEditing && initialValues?.id) {

                const finalUpdateData = values.image instanceof File
                    ? { ...updatePayload, image: values.image }
                    : updatePayload;

                console.log("Updating course with payload:", finalUpdateData);
                result = await updateCourse(initialValues.id, finalUpdateData);

            } else {

                const createPayload: CourseCreatePayload = {
                    title: values.title, 
                    description: values.description, 
                    price: String(values.price), 
                    status: values.status, 
                    instructor_id: values.instructor_id, 

                    ...(values.image instanceof File && { image: values.image }),
                };

                 if (!(createPayload.image instanceof File)) {
                    delete (createPayload as Partial<CourseCreatePayload>).image;
                 }

                console.log("Creating course with payload:", createPayload);
                result = await createCourse(createPayload);
            }
            onSuccess(result); 
        } catch (error: any) {

            console.error('Course form submission error:', error.response || error);
            const apiErrors = error.response?.data;
            let errorMessage = `Failed to ${isEditing ? 'update' : 'create'} course.`;

            if (apiErrors && typeof apiErrors === 'object') {
                if (apiErrors.detail) {
                    errorMessage = apiErrors.detail;
                } else if (apiErrors.non_field_errors) {
                     errorMessage = Array.isArray(apiErrors.non_field_errors) ? apiErrors.non_field_errors.join(' ') : apiErrors.non_field_errors;
                } else {
                    errorMessage += ' Errors: ' + Object.entries(apiErrors)
                        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                        .join('; ');
                }
            } else if (apiErrors && typeof apiErrors === 'string') {
                errorMessage = apiErrors;
            } else if (error.message) {
                errorMessage = error.message;
            }
            setFormError(errorMessage);
        } finally {
            setSubmitting(false); 
        }
    };

    const isSubmitDisabled = (isSubmitting: boolean): boolean => {
        if (isSubmitting) return true;
        if (typeof instructorId !== 'number') {

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
            enableReinitialize 
        >
            {({ isSubmitting, setFieldValue, errors, touched }) => (
                <Form className={styles.form} noValidate>
                    {formError && <div className={styles.formError} role="alert">{formError}</div>}

                    {}
                    <Field name="title">
                        {({ field }: any) => (
                            <Input
                                {...field}
                                id="title"
                                label="Course Title"
                                placeholder="e.g., Advanced React Patterns"
                                error={touched.title ? errors.title : undefined}
                                disabled={isSubmitting}
                                required
                            />
                        )}
                    </Field>

                    {}
                    <Field name="description">
                        {({ field }: any) => (
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
                                />
                                <ErrorMessage name="description" component="div" className={styles.errorMessage} />
                            </div>
                        )}
                    </Field>

                    {}
                    <Field name="price">
                        {({ field }: any) => (
                            <Input
                                {...field}
                                id="price"
                                label="Price ($)"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="e.g., 49.99"
                                error={touched.price ? errors.price : undefined}
                                disabled={isSubmitting}
                                required
                            />
                        )}
                    </Field>

                    {}
                    <Field name="status">
                        {({ field }: any) => (
                            <div className={styles.inputGroup}>
                                <label htmlFor="status" className={styles.label}>Status *</label>
                                <select
                                    {...field}
                                    id="status"
                                    className={`${styles.select} ${touched.status && errors.status ? styles.errorInput : ''}`}
                                    disabled={isSubmitting}
                                    required
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

                    {}
                    <div className={styles.inputGroup}>
                        <label htmlFor="image" className={styles.fileInputLabel}>
                            Course Image (Optional, max 2MB, PNG/JPG/JPEG)
                        </label>

                        {previewUrl && (
                            <div className={styles.imagePreviewContainer}>
                                <img src={previewUrl} alt="Current course preview" className={styles.imagePreview} />
                                <Button
                                    type="button"
                                    onClick={() => handleRemoveImage(setFieldValue)}
                                    disabled={isSubmitting}
                                    className={styles.removeImageButton}
                                    aria-label="Remove course image"
                                >
                                    Remove
                                </Button>
                            </div>
                        )}

                        <input
                            id="image"
                            name="image"
                            type="file"
                            ref={fileInputRef}
                            onChange={(event) => handleFileChange(event, setFieldValue)}
                            className={`${styles.fileInput} ${touched.image && errors.image ? styles.errorInput : ''}`}
                            accept="image/png, image/jpeg, image/jpg"
                            disabled={isSubmitting}
                            aria-describedby="image-error"
                        />
                        <ErrorMessage name="image" component="div" className={styles.errorMessage} id="image-error" />
                    </div>

                    {}
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
