// src/components/Common/Input/Input.tsx
import React from 'react';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input: React.FC<InputProps> = ({ label, id, error, className, ...props }) => {
  const inputClasses = [
    styles.input,
    error ? styles.errorInput : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.inputGroup}>
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}
      <input
        id={id}
        className={inputClasses}
        {...props}
      />
      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );
};

export default Input;
