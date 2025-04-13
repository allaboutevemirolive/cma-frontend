// src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoginForm from '../components/Auth/LoginForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from 'lucide-react';

const LoginPage: React.FC = () => {
    const { login, isLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [error, setError] = useState<string | null>(null);

    // Get the path to redirect to after login, default to '/courses'
    const from = (location.state as { from?: Location })?.from?.pathname || '/courses';

    const handleLoginSubmit = async (credentials: { username: string; password: string }) => {
        setError(null);
        try {
            await login(credentials);
            navigate(from, { replace: true });
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || err.message || 'Login failed. Please check your credentials.';
            setError(errorMessage);
            console.error("Login failed on page:", err);
        }
    };

    return (
        <div className="flex min-h-[calc(100vh-theme(spacing.14))] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
             <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Login</CardTitle>
                    <CardDescription>Enter your credentials to access your account.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {error && (
                         <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Login Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <LoginForm onSubmit={handleLoginSubmit} isLoading={isLoading} />
                    {/* Add link to registration page if applicable
                    <p className="text-center text-sm text-muted-foreground">
                        Don't have an account?{' '}
                        <Link to="/register" className="font-medium text-primary hover:underline">
                            Sign up
                        </Link>
                    </p>
                     */}
                </CardContent>
            </Card>
        </div>
    );
};

export default LoginPage;
