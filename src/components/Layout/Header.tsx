// src/components/Layout/Header.tsx
import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Button from '../Common/Button/Button';
import styles from './Header.module.css';
import viteLogo from '/vite.svg'; // Use your logo

const Header: React.FC = () => {
    const { isAuthenticated, logout, user } = useAuth();

    return (
        <header className={styles.header}>
            <div className={styles.container}>
                <Link to="/" className={styles.logoLink}>
                    <img src={viteLogo} alt="App Logo" className={styles.logo} />
                    <span className={styles.appName}>CourseApp</span>
                </Link>
                <nav className={styles.nav}>
                    {isAuthenticated ? (
                        <>
                            <NavLink
                                to="/courses"
                                className={({ isActive }) => isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink}
                            >
                                Courses
                            </NavLink>
                            {/* Add other authenticated links here (e.g., Profile) */}
                            <span className={styles.userInfo}>Welcome, {user?.username || 'User'}</span>
                            <Button onClick={logout} variant="secondary" size="small">
                                Logout
                            </Button>
                        </>
                    ) : (
                        <NavLink
                            to="/login"
                            className={({ isActive }) => isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink}
                        >
                            Login
                        </NavLink>
                    )}
                </nav>
            </div>
        </header>
    );
};

export default Header;
