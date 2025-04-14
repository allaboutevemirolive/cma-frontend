// src/components/Layout/Header.tsx
import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Button from '../Common/Button/Button'; // Use the refined Button
import styles from './Header.module.css';
import viteLogo from '/vite.svg'; // Use your logo

const Header: React.FC = () => {
    const { isAuthenticated, logout, user } = useAuth();

    return (
        <header className={styles.header}>
            <div className={styles.container}>
                {/* Logo and App Name */}
                <Link to="/" className={styles.logoLink} title="Go to homepage">
                    <img src={viteLogo} alt="CourseApp Logo" className={styles.logo} />
                    <span className={styles.appName}>CourseApp</span>
                </Link>

                {/* Main Navigation & User Actions */}
                <nav className={styles.nav} aria-label="Main navigation">
                    {isAuthenticated ? (
                        // --- Authenticated User View ---
                        <>
                            <NavLink
                                to="/courses"
                                className={({ isActive }) =>
                                    isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink
                                }
                            >
                                Courses
                            </NavLink>
                            {/* Add other authenticated links here (e.g., /my-profile, /my-courses) */}

                            {/* Group User Info and Logout */}
                            <div className={styles.userActions}>
                                <span className={styles.userInfo} title={`Logged in as ${user?.username}`}>
                                    {/* Using optional chaining and providing a fallback */}
                                    Welcome, {user?.first_name || user?.username || 'User'}
                                </span>
                                <Button
                                    onClick={logout}
                                    variant="secondary" // Keep secondary or choose another subtle variant
                                    size="small"
                                    className={styles.logoutButton} // Add class if specific overrides needed
                                >
                                    Logout
                                </Button>
                            </div>
                        </>
                    ) : (
                        // --- Public View ---
                        <>
                            <NavLink
                                to="/login"
                                className={({ isActive }) =>
                                    isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink
                                }
                            >
                                Login
                            </NavLink>
                            <NavLink
                                to="/register"
                                className={({ isActive }) =>
                                    isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink
                                }
                            >
                                Register
                            </NavLink>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
};

export default Header;
