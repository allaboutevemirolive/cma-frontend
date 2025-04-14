// src/components/Auth/RegistrationForm.tsx
import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import Button from '../Common/Button/Button';
import Input from '../Common/Input/Input';
import { RegistrationPayload } from '../../types';
import styles from './RegistrationForm.module.css'; // Create this CSS file

interface RegistrationFormProps {
    onSubmit: (values: RegistrationPayload) => Promise<void>;
    isLoading: boolean;
}

const RegistrationSchema = Yup.object().shape({
    username: Yup.string()
        .min(3, 'Username must be at least 3 characters')
        .max(50, 'Username too long')
        .required('Username is required'),
    email: Yup.string()
        .email('Invalid email address')
        .required('Email is required'),
    password: Yup.string()
        .min(8, 'Password must be at least 8 characters')
        .required('Password is required'),
    password2: Yup.string()
        .oneOf([Yup.ref('password')], 'Passwords must match')
        .required('Password confirmation is required'),
    role: Yup.string()
        .oneOf(['student', 'instructor'], 'Invalid role selected')
        .required('Role is required'),
    first_name: Yup.string().max(50, 'First name too long'),
    last_name: Yup.string().max(50, 'Last name too long'),
});

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSubmit, isLoading }) => {
    return (
        <Formik<RegistrationPayload> // Specify the type here
            initialValues={{
                username: '',
                email: '',
                password: '',
                password2: '',
                role: 'student', // Default role
                first_name: '',
                last_name: '',
            }}
            validationSchema={RegistrationSchema}
            onSubmit={async (values, { setSubmitting }) => {
                // We only need to pass the fields defined in RegistrationPayload to onSubmit
                const payload: RegistrationPayload = {
                    username: values.username,
                    email: values.email,
                    password: values.password,
                    password2: values.password2, // Send confirmation too
                    role: values.role,
                    first_name: values.first_name || undefined, // Send undefined if empty
                    last_name: values.last_name || undefined,   // Send undefined if empty
                };
                await onSubmit(payload);
                setSubmitting(false);
            }}
        >
            {({ isSubmitting, errors, touched }) => (
                <Form className={styles.form}>
                    <Field name="username">
                        {({ field }: any) => (
                            <Input
                                {...field}
                                id="reg-username"
                                label="Username *"
                                error={touched.username ? errors.username : undefined}
                                disabled={isLoading || isSubmitting}
                                autoComplete="username"
                                required
                            />
                        )}
                    </Field>

                    <Field name="email">
                        {({ field }: any) => (
                            <Input
                                {...field}
                                id="reg-email"
                                label="Email *"
                                type="email"
                                error={touched.email ? errors.email : undefined}
                                disabled={isLoading || isSubmitting}
                                autoComplete="email"
                                required
                            />
                        )}
                    </Field>

                    <Field name="password">
                        {({ field }: any) => (
                            <Input
                                {...field}
                                id="reg-password"
                                label="Password *"
                                type="password"
                                error={touched.password ? errors.password : undefined}
                                disabled={isLoading || isSubmitting}
                                autoComplete="new-password"
                                required
                            />
                        )}
                    </Field>

                    <Field name="password2">
                        {({ field }: any) => (
                            <Input
                                {...field}
                                id="reg-password2"
                                label="Confirm Password *"
                                type="password"
                                error={touched.password2 ? errors.password2 : undefined}
                                disabled={isLoading || isSubmitting}
                                autoComplete="new-password"
                                required
                            />
                        )}
                    </Field>

                    <Field name="role">
                        {({ field }: any) => (
                            <div className={styles.inputGroup}>
                                <label htmlFor="reg-role" className={styles.label}>Role *</label>
                                <select
                                    {...field}
                                    id="reg-role"
                                    className={`${styles.select} ${touched.role && errors.role ? styles.errorInput : ''}`}
                                    disabled={isLoading || isSubmitting}
                                    required
                                >
                                    <option value="student">Student</option>
                                    <option value="instructor">Instructor</option>
                                </select>
                                <ErrorMessage name="role" component="div" className={styles.errorMessage} />
                            </div>
                        )}
                    </Field>

                    <Field name="first_name">
                        {({ field }: any) => (
                            <Input
                                {...field}
                                id="reg-first_name"
                                label="First Name (Optional)"
                                error={touched.first_name ? errors.first_name : undefined}
                                disabled={isLoading || isSubmitting}
                                autoComplete="given-name"
                            />
                        )}
                    </Field>

                    <Field name="last_name">
                        {({ field }: any) => (
                            <Input
                                {...field}
                                id="reg-last_name"
                                label="Last Name (Optional)"
                                error={touched.last_name ? errors.last_name : undefined}
                                disabled={isLoading || isSubmitting}
                                autoComplete="family-name"
                            />
                        )}
                    </Field>

                    <Button
                        type="submit"
                        variant="primary"
                        size="large"
                        isLoading={isLoading || isSubmitting}
                        disabled={isLoading || isSubmitting}
                        className={styles.submitButton}
                    >
                        Register
                    </Button>
                </Form>
            )}
        </Formik>
    );
};

export default RegistrationForm;
