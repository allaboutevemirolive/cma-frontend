// src/components/Auth/LoginForm.tsx
import React from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import Button from '../Common/Button/Button';
import Input from '../Common/Input/Input'; 
import styles from './LoginForm.module.css';

interface LoginFormProps {
    onSubmit: (values: { username: string; password: string }) => Promise<void>;
    isLoading: boolean;
}

const LoginSchema = Yup.object().shape({
    username: Yup.string().required('Username is required'),
    password: Yup.string().required('Password is required'),
});

const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, isLoading }) => {
    return (
        <Formik
            initialValues={{ username: '', password: '' }}
            validationSchema={LoginSchema}
            onSubmit={async (values, { setSubmitting }) => {
                await onSubmit(values);
                setSubmitting(false);
            }}
        >
            {({ isSubmitting, errors, touched }) => ( 
                <Form className={styles.form}>
                    <Field name="username">
                        {({ field }: any) => ( 
                            <Input 
                                {...field}
                                id="username"
                                label="Username"
                                type="text"
                                error={touched.username ? errors.username : undefined} 
                                disabled={isLoading || isSubmitting}
                                autoComplete="username"
                            />
                        )}
                    </Field>

                    <Field name="password">
                         {({ field }: any) => (
                            <Input
                                {...field}
                                id="password"
                                label="Password"
                                type="password"
                                error={touched.password ? errors.password : undefined}
                                disabled={isLoading || isSubmitting}
                                autoComplete="current-password"
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
                        Login
                    </Button>
                </Form>
            )}
        </Formik>
    );
};

export default LoginForm;
