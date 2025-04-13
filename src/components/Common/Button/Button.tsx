// src/components/Common/Button/Button.tsx
import React from 'react';
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'small' | 'medium' | 'large';
    isLoading?: boolean;
    className?: string; // Ensure className is accepted
}

const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'medium',
    isLoading = false,
    disabled,
    className, // Destructure className
    ...props
}) => {
    const buttonClasses = [
        styles.button,
        styles[variant],
        styles[size],
        isLoading ? styles.loading : '', // Add loading class if needed
        className, // Include passed className
    ].filter(Boolean).join(' ');

    return (
        <button
            className={buttonClasses}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <span className={styles.spinner}></span>}
            {children}
        </button>
    );
};

export default Button;
