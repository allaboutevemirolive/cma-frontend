// src/components/Common/Modal/Modal.tsx
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import Button from '../Button/Button';
import styles from './Modal.module.css';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
    // Handle closing modal with Escape key
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }
        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    // Use createPortal to render the modal at the end of the body
    return ReactDOM.createPortal(
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    {title && <h2 className={styles.modalTitle}>{title}</h2>}
                    <Button
                        onClick={onClose}
                        className={styles.closeButton}
                        aria-label="Close modal"
                    >
                        × {/* Cross symbol */}
                    </Button>
                </div>
                <div className={styles.modalBody}>
                    {children}
                </div>
            </div>
        </div>,
        document.body // Mount the modal directly in the body
    );
};

export default Modal;
