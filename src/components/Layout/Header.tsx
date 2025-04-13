// src/components/Layout/Header.tsx
import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutDashboard, LogOut, LogIn } from 'lucide-react'; // Icons
import viteLogo from '/vite.svg'; // Use your logo
import { cn } from "@/lib/utils";

const Header: React.FC = () => {
    const { isAuthenticated, logout, user } = useAuth();

    const getInitials = (name?: string): string => {
        if (!name) return '?';
        return name.charAt(0).toUpperCase();
    };

    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        cn(
            "text-sm font-medium transition-colors hover:text-primary",
            isActive ? "text-primary" : "text-muted-foreground"
        );

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center">
                {/* Logo and App Name */}
                <Link to="/" className="mr-6 flex items-center space-x-2">
                    <img src={viteLogo} alt="App Logo" className="h-6 w-6" />
                    <span className="font-bold sm:inline-block">CourseApp</span>
                </Link>

                {/* Navigation Links */}
                <nav className="flex flex-1 items-center space-x-4 lg:space-x-6">
                    {isAuthenticated && (
                        <NavLink to="/courses" className={navLinkClass}>
                            <LayoutDashboard className="mr-2 h-4 w-4 inline-block" /> Courses
                        </NavLink>
                    )}
                    {/* Add other main nav links here */}
                </nav>

                {/* Right Side Actions (Login/User Menu) */}
                <div className="flex items-center space-x-4">
                    {isAuthenticated && user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                    <Avatar className="h-8 w-8">
                                        {/* Add AvatarImage if you have user profile pics */}
                                        {/* <AvatarImage src={user.profileImageUrl} alt={user.username} /> */}
                                        <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{user.username}</p>
                                        {/* <p className="text-xs leading-none text-muted-foreground">
                                            {user.email} // Add if available
                                        </p> */}
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {/* <DropdownMenuItem>
                                    <UserIcon className="mr-2 h-4 w-4" />
                                    <span>Profile</span>
                                </DropdownMenuItem> */}
                                <DropdownMenuItem onClick={logout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Button asChild variant="outline" size="sm">
                            <Link to="/login">
                                <LogIn className="mr-2 h-4 w-4" /> Login
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
