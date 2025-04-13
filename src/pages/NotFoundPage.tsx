// src/pages/NotFoundPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFoundPage: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.14))] text-center px-4">
            <h1 className="text-8xl font-bold text-primary/50 mb-2">404</h1>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Page Not Found</h2>
            <p className="text-muted-foreground mb-8 max-w-md">
                Oops! The page you are looking for doesn't seem to exist. It might have been moved or deleted.
            </p>
            <Button asChild>
                <Link to="/courses">
                     <Home className="mr-2 h-4 w-4" /> Go to Courses
                </Link>
            </Button>
        </div>
    );
};

export default NotFoundPage;
