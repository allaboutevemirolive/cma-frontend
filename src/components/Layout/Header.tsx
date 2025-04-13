// src/components/Layout/Header.tsx
import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Button from '../Common/Button/Button';
import styles from './Header.module.css';
import viteLogo from '/vite.svg'; // Use your logo
import { LogIn, LogOut, UserCircle } from 'lucide-react'; // Add icons

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
                             {/* TODO: Uncomment when MyEnrollmentsPage is created */}
                             {/* <NavLink
                                 to="/my-enrollments"
                                 className={({ isActive }) => isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink}
                                  title="View your enrolled courses"
                             >
                                 My Courses
                             </NavLink> */}
                         </>
                     )}

                     {/* Links for Instructors */}
                     {isAuthenticated && userRole === 'instructor' && (
                          <>
                              {/* TODO: Uncomment when InstructorDashboard is created */}
                              {/* <NavLink
                                  to="/instructor/dashboard"
                                  className={({ isActive }) => isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink}
                                  title="Manage your courses and quizzes"
                              >
                                  Dashboard
                              </NavLink> */}
                          </>
                     )}

                    {/* Links for Admins */}
                     {isAuthenticated && userRole === 'admin' && (
                          <>
                              {/* TODO: Uncomment when AdminDashboard is created */}
                              {/* <NavLink
                                  to="/admin/dashboard"
                                  className={({ isActive }) => isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink}
                                   title="Admin Management Area"
                              >
                                  Admin Panel
                              </NavLink> */}
                          </>
                     )}


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
