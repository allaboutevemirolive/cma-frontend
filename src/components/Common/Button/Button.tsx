// src/components/Common/Button/Button.tsx
import React from 'react';
import styles from './Button.module.css'; // Import CSS Module

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large'; // Add size prop type
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium', // Add size prop with a default
  isLoading = false,
  disabled,
  className,
  ...props
}) => {
  const buttonClasses = [
    styles.button,
    styles[variant], // styles.primary, styles.secondary etc.
    styles[size],    // Add size class: styles.small, styles.medium etc.
    className,       // Allow passing custom classes
  ].filter(Boolean).join(' ');

  return (
    <button
      className={buttonClasses}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
};

export default Button;
