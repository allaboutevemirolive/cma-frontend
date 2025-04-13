// src/components/Auth/LoginForm.tsx
import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import Button from '../Common/Button/Button';
import styles from './LoginForm.module.css';

interface LoginFormProps {
    onSubmit: (values: { username: string; password: string }) => Promise<void>;
    isLoading: boolean;
}

const LoginSchema = Yup.object().shape({
    username: Yup.string()
        .min(2, 'Too Short!')
        .max(50, 'Too Long!')
        .required('Username is required'),
    password: Yup.string()
        .min(6, 'Password must be at least 6 characters')
        .required('Password is required'),
});

const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, isLoading }) => {
    return (
        <Formik
            initialValues={{ username: '', password: '' }}
            validationSchema={LoginSchema}
            onSubmit={async (values, { setSubmitting }) => {
                await onSubmit(values);
                setSubmitting(false); // Formik's submitting state, distinct from parent isLoading
            }}
        >
            {({ isSubmitting }) => ( // Use Formik's isSubmitting state if needed
                <Form className={styles.form}>
                    <div className={styles.formGroup}>
                        <label htmlFor="username" className={styles.label}>Username</label>
                        <Field
                            type="text"
                            id="username"
                            name="username"
                            className={styles.input}
                            disabled={isLoading}
                        />
                        <ErrorMessage name="username" component="div" className={styles.error} />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="password" className={styles.label}>Password</label>
                        <Field
                            type="password"
                            id="password"
                            name="password"
                            className={styles.input}
                            disabled={isLoading}
                        />
                        <ErrorMessage name="password" component="div" className={styles.error} />
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        isLoading={isLoading} // Use the loading state from the parent (useAuth)
                        disabled={isLoading || isSubmitting}
                        className={styles.submitButton}
                    >
                        Login
                    </Button>
                </Form>
            )}
        </Formik>
    );
};

export default LoginForm;
