// src/components/Layout/Header.tsx
import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Button from '../Common/Button/Button'; 
import styles from './Header.module.css';
import viteLogo from '/vite.svg'; 

const Header: React.FC = () => {
    const { isAuthenticated, logout, user } = useAuth();

    return (
        <header className={styles.header}>
            <div className={styles.container}>
                {}
                <Link to="/" className={styles.logoLink} title="Go to homepage">
                    <img src={viteLogo} alt="CourseApp Logo" className={styles.logo} />
                    <span className={styles.appName}>CourseApp</span>
                </Link>

                {}
                <nav className={styles.nav} aria-label="Main navigation">
                    {isAuthenticated ? (

                        <>
                            <NavLink
                                to="/courses"
                                className={({ isActive }) =>
                                    isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink
                                }
                            >
                                Courses
                            </NavLink>
                            {}

                            {}
                            <div className={styles.userActions}>
                                <span className={styles.userInfo} title={`Logged in as ${user?.username}`}>
                                    {}
                                    Welcome, {user?.first_name || user?.username || 'User'}
                                </span>
                                <Button
                                    onClick={logout}
                                    variant="secondary" 
                                    size="small"
                                    className={styles.logoutButton} 
                                >
                                    Logout
                                </Button>
                            </div>
                        </>
                    ) : (

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
