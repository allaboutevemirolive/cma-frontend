// src/components/Course/CourseForm.tsx
import React, { useState, useRef } from 'react';
import { CourseCreatePayload, CourseUpdatePayload } from '../../services/api';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Course } from '../../types';
import { createCourse, updateCourse } from '../../services/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner"; // Import toast function from sonner
import { Loader2, X } from "lucide-react";
import { getImageUrl } from '@/lib/utils'; // Use helper

interface CourseFormProps {
    initialValues?: Course;
    userId?: number;
    onSuccess: (course: Course) => void;
    onCancel: () => void;
}

// Validation Schema using Yup
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
    image: Yup.mixed() // Use mixed without generic type here
        .optional() // Makes the field itself optional
        .nullable() // Allows null value
        .test('fileSize', 'File too large (max 2MB)', (value) => {
            // value can be File, string, null, or undefined here
            if (!value || typeof value === 'string') return true; // Pass if null, undefined, or string URL
            if (value instanceof File) {
                return value.size <= 2 * 1024 * 1024; // 2MB limit
            }
            return false; // Should not happen, but safety return
        })
        .test('fileType', 'Unsupported file format (use PNG, JPG, JPEG)', (value) => {
            if (!value || typeof value === 'string') return true; // Pass if null, undefined, or string URL
            if (value instanceof File) {
                return ['image/png', 'image/jpeg', 'image/jpg'].includes(value.type);
            }
            return false;
        }),
});

// Type for form values handled by Formik
interface CourseFormValues extends Omit<Course, 'id' | 'created_at' | 'updated_at' | 'instructor' | 'price' | 'image'> {
    price: number | string;
    instructor_id: number | undefined;
    image: File | null | string; // Track File, existing URL string, or null (for removal)
}

const CourseForm: React.FC<CourseFormProps> = ({ initialValues, userId, onSuccess, onCancel }) => {
    const isEditing = Boolean(initialValues);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(
        // Pass undefined instead of null for the placeholder argument
        isEditing ? getImageUrl(initialValues?.image, undefined) : null
    );

    const formInitialValues: CourseFormValues = {
        title: initialValues?.title || '',
        description: initialValues?.description || '',
        price: initialValues?.price || '',
        status: initialValues?.status || 'draft',
        instructor_id: initialValues?.instructor?.id ?? userId,
        image: initialValues?.image || null, // Start with existing image URL or null
    };

    // Show error and prevent rendering if creating without a user ID
    if (!isEditing && typeof userId !== 'number') {
        console.error("ERROR: CourseForm requires a valid 'userId' number prop when creating a new course.");
        // Display error state instead of just logging and toasting
        return <p className="text-destructive p-4 text-center">Error: Cannot create course without instructor information.</p>;
    }

    // Formik Hook Setup
    const formik = useFormik<CourseFormValues>({
        initialValues: formInitialValues,
        validationSchema: CourseSchema,
        enableReinitialize: true, // Important if initialValues can change
        onSubmit: async (values, { setSubmitting, setFieldError }) => {
            setSubmitting(true); // Manually set submitting state

            if (typeof values.instructor_id !== 'number') {
                toast.error("Submission Error", {
                    description: "Instructor ID is missing or invalid.",
                });
                setSubmitting(false);
                return;
            }

            // Prepare payload: distinguish between File, null (remove), and undefined (no change)
            const payload: CourseCreatePayload | CourseUpdatePayload = {
                title: values.title,
                description: values.description,
                price: String(values.price), // Ensure price is string for API
                status: values.status,
                instructor_id: values.instructor_id,
                // Only include image if it's a File or explicitly set to null for removal
                ...(values.image instanceof File && { image: values.image }),
                // Send null to signal removal on backend (if value is null and was changed)
                ...(values.image === null && initialValues?.image !== null && { image: null }),
            };

            // If image wasn't changed (still original string URL), don't send it in PATCH
            if (isEditing && typeof values.image === 'string' && values.image === initialValues?.image) {
                delete (payload as any).image;
            }


            try {
                let result: Course;
                if (isEditing && initialValues?.id) {
                    result = await updateCourse(initialValues.id, payload as CourseUpdatePayload);
                    toast.success("Course updated successfully.");
                } else {
                    // Ensure instructor_id is present for creation payload type
                    const createPayload = payload as CourseCreatePayload;
                    if (typeof createPayload.instructor_id !== 'number') {
                         throw new Error("Instructor ID is required for creating a course.");
                    }
                    result = await createCourse(createPayload);
                    toast.success("Course created successfully.");
                }
                onSuccess(result); // Call the onSuccess callback provided by parent
            } catch (error: any) {
                console.error('Course form submission error:', error);
                const apiErrors = error.response?.data;
                let generalErrorMessage = `Failed to ${isEditing ? 'update' : 'create'} course.`;
                let fieldErrorHandled = false;

                if (apiErrors && typeof apiErrors === 'object') {
                    // Handle field-specific errors by setting Formik field errors
                    Object.entries(apiErrors).forEach(([key, value]) => {
                         const message = Array.isArray(value) ? value.join(', ') : String(value);
                         // Map API field names to Formik field names if necessary
                         const formikKey = key === 'instructor_id' ? 'instructor_id' : key;
                         if (formikKey in formik.values) {
                             setFieldError(formikKey, message);
                             fieldErrorHandled = true;
                         }
                    });
                    // Construct a general error message if needed (or use detail)
                    if (apiErrors.detail) {
                         generalErrorMessage = apiErrors.detail;
                    } else if (!fieldErrorHandled) {
                        // If no specific field errors were mapped, show a generic error
                        generalErrorMessage += ' Please check the details below.';
                    }
                } else if (error.message) {
                    generalErrorMessage = error.message;
                }

                // Show a general error toast only if no specific field errors were set
                // or if there's a non-field error like 'detail'
                if (!fieldErrorHandled || apiErrors?.detail) {
                     toast.error("Submission Error", {
                        description: generalErrorMessage,
                    });
                } else {
                    toast.error("Validation Error", {
                        description: "Please check the errors in the form fields.",
                    })
                }

            } finally {
                setSubmitting(false); // Ensure submitting is set to false
            }
        },
    });

    // Handle file selection and preview
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.currentTarget.files?.[0];
        if (file) {
            formik.setFieldValue("image", file);
            // Create preview URL
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            formik.setFieldValue("image", null); // No file selected
            // Reset preview based on initial state
            setImagePreviewUrl(isEditing ? getImageUrl(initialValues?.image, undefined) : null);
        }
    };

    // Handle image removal
    const handleRemoveImage = () => {
        formik.setFieldValue('image', null); // Set Formik value to null (signals removal)
        setImagePreviewUrl(null); // Clear preview
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Clear the file input visually
        }
    };

    return (
        // Form structure using Tailwind classes for spacing
        <form onSubmit={formik.handleSubmit} className="space-y-6">

            {/* Title Field */}
            <div className="space-y-2">
                <Label htmlFor="title">Course Title</Label>
                <Input
                    id="title"
                    placeholder="e.g., Introduction to React"
                    {...formik.getFieldProps('title')}
                    disabled={formik.isSubmitting}
                    aria-invalid={formik.touched.title && !!formik.errors.title}
                />
                {formik.touched.title && formik.errors.title ? (
                    <p className="text-sm text-destructive">{formik.errors.title}</p>
                ) : null}
            </div>

            {/* Description Field */}
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    placeholder="Detailed course description..."
                    rows={4}
                    {...formik.getFieldProps('description')}
                    disabled={formik.isSubmitting}
                    aria-invalid={formik.touched.description && !!formik.errors.description}
                />
                {formik.touched.description && formik.errors.description ? (
                    <p className="text-sm text-destructive">{formik.errors.description}</p>
                ) : null}
            </div>

            {/* Price and Status Fields (in a grid for layout) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="price">Price ($)</Label>
                    <Input
                        id="price"
                        type="number"
                        step="0.01"
                        placeholder="e.g., 29.99"
                        {...formik.getFieldProps('price')}
                        disabled={formik.isSubmitting}
                        aria-invalid={formik.touched.price && !!formik.errors.price}
                    />
                    {formik.touched.price && formik.errors.price ? (
                        <p className="text-sm text-destructive">{formik.errors.price}</p>
                    ) : null}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                        name="status" // Name attribute for potential form submission without JS
                        value={formik.values.status}
                        onValueChange={(value) => formik.setFieldValue('status', value)}
                        disabled={formik.isSubmitting}
                    >
                        <SelectTrigger id="status" aria-invalid={formik.touched.status && !!formik.errors.status}>
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                    {formik.touched.status && formik.errors.status ? (
                        <p className="text-sm text-destructive">{formik.errors.status}</p>
                    ) : null}
                </div>
            </div>

            {/* Instructor Info (read-only display) */}
            {isEditing && initialValues?.instructor && (
                <p className="text-sm text-muted-foreground">Instructor: {initialValues.instructor.username}</p>
            )}
            {!isEditing && userId && (
                // This assumes you fetch the current user's details elsewhere or know the ID
                <p className="text-sm text-muted-foreground">Instructor: You (ID: {userId})</p>
            )}

            {/* Image Upload Field */}
            <div className="space-y-2">
                <Label htmlFor="image">Course Image (Optional, max 2MB, PNG/JPG)</Label>
                {imagePreviewUrl && (
                    <div className="relative w-fit border rounded p-2 bg-muted/20">
                        <img src={imagePreviewUrl} alt="Preview" className="h-24 w-auto rounded object-contain" />
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md"
                            onClick={handleRemoveImage}
                            disabled={formik.isSubmitting}
                            aria-label="Remove image"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}
                <Input
                    id="image"
                    name="image" // Important for associating label and errors
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    // Style the file input button provided by the browser
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-input file:bg-background file:text-sm file:font-medium file:text-foreground hover:file:bg-accent hover:file:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                    accept="image/png, image/jpeg, image/jpg"
                    disabled={formik.isSubmitting}
                    aria-invalid={formik.touched.image && !!formik.errors.image}
                />
                {formik.touched.image && formik.errors.image ? (
                    <p className="text-sm text-destructive">{formik.errors.image}</p>
                ) : null}
            </div>


            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={formik.isSubmitting}>
                    Cancel
                </Button>
                <Button type="submit" disabled={formik.isSubmitting || !formik.isValid}>
                    {formik.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? 'Update Course' : 'Create Course'}
                </Button>
            </div>
        </form>
    );
};

export default CourseForm;
