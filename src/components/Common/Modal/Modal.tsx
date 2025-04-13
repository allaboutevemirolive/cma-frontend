// src/components/Common/Modal/Modal.tsx
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
// Removed Button import, assuming close is now styled internally
import styles from './Modal.module.css';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
            window.addEventListener('keydown', handleEsc);
        } else {
            document.body.style.overflow = ''; // Restore scrolling
        }
        return () => {
            document.body.style.overflow = ''; // Ensure cleanup
            window.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    return ReactDOM.createPortal(
        <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    {title && <h2 className={styles.modalTitle} id="modal-title">{title}</h2>}
                    <button
                        onClick={onClose}
                        className={styles.closeButton}
                        aria-label="Close modal"
                        type="button" // Explicitly set type
                    >
                        × {/* Use HTML entity */}
                    </button>
                </div>
                <div className={styles.modalBody}>
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default Modal;
