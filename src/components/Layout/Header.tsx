// src/components/Layout/Header.tsx
import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Button from '../Common/Button/Button';
import styles from './Header.module.css';
import viteLogo from '/vite.svg'; // Use your logo
// Updated icons import
import { LogIn, LogOut, UserCircle } from 'lucide-react';

const Header: React.FC = () => {
    const { isAuthenticated, logout, user } = useAuth();
    const userRole = user?.profile?.role;

    return (
        <header className={styles.header}>
            <div className={styles.container}>
                <Link to="/" className={styles.logoLink}>
                    <img src={viteLogo} alt="Course Management App Logo" className={styles.logo} />
                    <span className={styles.appName}>CourseApp</span>
                </Link>
                <nav className={styles.nav}>
                    {/* Common link for all authenticated users */}
                    {isAuthenticated && (
                        <NavLink
                            to="/courses"
                            className={({ isActive }) => isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink}
                            title="View all available courses"
                        >
                            Courses
                        </NavLink>
                    )}

                     {/* Links for Students */}
                     {isAuthenticated && userRole === 'student' && (
                         <>
                             {/* --- ADDED: My Enrollments Link --- */}
                             <NavLink
                                 to="/my-enrollments"
                                 className={({ isActive }) => isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink}
                                  title="View your enrolled courses"
                             >
                                 My Enrollments
                             </NavLink>
                         </>
                     )}

                     {/* Links for Instructors / Admins */}
                     {isAuthenticated && (userRole === 'instructor' || userRole === 'admin') && (
                          <>
                              {/* --- ADDED: Quizzes Link (placeholder) --- */}
                              {/* This might link to a general quiz management page or specific course quizzes depending on design */}
                              <NavLink
                                  to="/quizzes" // Placeholder route - adjust as needed
                                  className={({ isActive }) => isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink}
                                  title="Manage Quizzes" // Adjust title if needed
                              >
                                  Quizzes
                              </NavLink>

                              {/* --- ADDED: Submissions Link (placeholder) --- */}
                              {/* This might link to a list of submissions needing grading or all submissions */}
                              <NavLink
                                  to="/submissions" // Placeholder route - adjust as needed
                                  className={({ isActive }) => isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink}
                                  title="View Submissions" // Adjust title if needed
                              >
                                  Submissions
                              </NavLink>

                              {/* TODO: Add other instructor/admin links (e.g., Dashboard) */}
                              {/* <NavLink to="/instructor/dashboard" ... > Dashboard </NavLink> */}
                          </>
                     )}

                    {/* Links for Admins Only (Example) */}
                     {/* {isAuthenticated && userRole === 'admin' && (
                          <>
                              <NavLink to="/admin/users" ... > Users </NavLink>
                          </>
                     )} */}


                    {/* Auth actions */}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}> {/* Push auth to right */}
                         {isAuthenticated ? (
                              <>
                                   <span className={styles.userInfo} title={`Logged in as ${user?.username} (${userRole})`}>
                                        <UserCircle size={18} style={{ marginRight: '0.3em', verticalAlign: 'bottom' }}/>
                                        {user?.username || 'User'}
                                   </span>
                                   <Button onClick={logout} variant="secondary" size="small" title="Log out">
                                       <LogOut size={16} style={{ marginRight: '0.4em' }} />
                                       Logout
                                   </Button>
                              </>
                         ) : (
                              <NavLink to="/login">
                                   <Button variant="primary" size="small" title="Log in">
                                       <LogIn size={16} style={{ marginRight: '0.4em' }}/>
                                       Login
                                   </Button>
                              </NavLink>
                         )}
                    </div>
                </nav>
            </div>
        </header>
    );
};

export default Header;
