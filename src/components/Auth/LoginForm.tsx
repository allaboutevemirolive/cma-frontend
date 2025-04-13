import React from 'react';
import { useFormik } from 'formik'; // Use useFormik hook for easier integration
import * as Yup from 'yup';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react"; // Spinner icon

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
    const formik = useFormik({
        initialValues: { username: '', password: '' },
        validationSchema: LoginSchema,
        onSubmit: async (values, { }) => {
            await onSubmit(values);
            // No need to call setSubmitting(false) here as isLoading prop controls the button state
        },
    });

    return (
        <form onSubmit={formik.handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                    id="username"
                    type="text"
                    placeholder="your_username"
                    {...formik.getFieldProps('username')} // Spread Formik props
                    disabled={isLoading}
                    aria-invalid={formik.touched.username && !!formik.errors.username}
                />
                {formik.touched.username && formik.errors.username ? (
                    <p className="text-sm text-destructive">{formik.errors.username}</p>
                ) : null}
            </div>

            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    {...formik.getFieldProps('password')} // Spread Formik props
                    disabled={isLoading}
                    aria-invalid={formik.touched.password && !!formik.errors.password}
                />
                {formik.touched.password && formik.errors.password ? (
                    <p className="text-sm text-destructive">{formik.errors.password}</p>
                ) : null}
            </div>

            <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Login
            </Button>
        </form>
    );
};

export default LoginForm;
