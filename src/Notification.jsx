import React, { useState, useEffect, useCallback } from 'react';
import './Notification.css';

/**
 * Universal Dropdown Notification / Alert Banner Component
 * 
 * Props:
 * - toast: { message: string, type?: 'success' | 'error' | 'warning' | 'info' } | null
 * - message: string (if not using toast object)
 * - type: 'success' | 'error' | 'warning' | 'info' (default: 'success')
 * - onClose: () => void
 * - duration: number (auto-dismiss duration in ms, 0 to disable, default: 4000)
 */
function Notification({ toast, message, type = 'success', onClose, duration = 4000 }) {
    const alertMessage = toast?.message || (typeof toast === 'string' ? toast : message);
    const alertType = toast?.type || type || 'success';
    const isVisible = Boolean(alertMessage);

    useEffect(() => {
        if (!isVisible || !duration || duration <= 0 || !onClose) return;

        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [isVisible, duration, onClose, alertMessage]);

    if (!isVisible) return null;

    return (
        <div className={`custom-alert-banner alert-${alertType}`} role="alert">
            <span className="custom-alert-message">{alertMessage}</span>
            <button
                type="button"
                className="custom-alert-close-btn"
                aria-label="Dismiss alert"
                onClick={onClose}
            >
                <div className="custom-alert-circle-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                </div>
            </button>
        </div>
    );
}

/**
 * Custom hook for managing notifications across any JSX component.
 * 
 * Example usage:
 * const { toast, showToast, hideToast, NotificationBanner } = useNotification();
 * ...
 * showToast('Project saved successfully!', 'success');
 * ...
 * return (
 *   <div>
 *     <NotificationBanner />
 *     ...
 *   </div>
 * );
 */
export function useNotification(defaultDuration = 4000) {
    const [toast, setToast] = useState(null);

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type });
    }, []);

    const hideToast = useCallback(() => {
        setToast(null);
    }, []);

    const NotificationBanner = useCallback(() => {
        return (
            <Notification
                toast={toast}
                onClose={hideToast}
                duration={defaultDuration}
            />
        );
    }, [toast, hideToast, defaultDuration]);

    return {
        toast,
        showToast,
        hideToast,
        NotificationBanner
    };
}

export { Notification as NotificationBanner };
export default Notification;
