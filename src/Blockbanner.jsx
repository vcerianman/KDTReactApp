import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import request from './api/Request';
import './Blockbanner.css';

function Blockbanner({ userStatus }) {
    const [isBlocked, setIsBlocked] = useState(
        String(userStatus || '').toUpperCase() === 'BLOCKED' ||
        String(userStatus || '').toUpperCase() === 'BANNED'
    );
    const [isSlideDown, setIsSlideDown] = useState(false);

    // Synchronize if status prop is provided
    useEffect(() => {
        if (userStatus !== undefined && userStatus !== null) {
            const s = String(userStatus).toUpperCase();
            setIsBlocked(s === 'BLOCKED' || s === 'BANNED');
        }
    }, [userStatus]);

    // Check user blocked status via GET /api/auth/me
    useEffect(() => {
        let isMounted = true;

        const checkBlockedStatus = async () => {
            try {
                const data = await request.get('/api/auth/me');
                if (isMounted && data) {
                    const uData = data.data || data;
                    const s = String(uData.status || '').toUpperCase();
                    if (s === 'BLOCKED' || s === 'BANNED') {
                        setIsBlocked(true);
                    } else if (userStatus === undefined) {
                        setIsBlocked(false);
                    }
                }
            } catch (err) {
                // Ignore if unauthenticated
            }
        };

        checkBlockedStatus();

        return () => {
            isMounted = false;
        };
    }, [userStatus]);

    // Trigger slide-down animation once page is loaded and user is confirmed blocked
    useEffect(() => {
        if (isBlocked) {
            const timer = setTimeout(() => {
                setIsSlideDown(true);
            }, 3000);
            return () => clearTimeout(timer);
        } else {
            setIsSlideDown(false);
        }
    }, [isBlocked]);

    if (!isBlocked) return null;

    return (
        <div
            className={`block-banner-container ${isSlideDown ? 'slide-down' : ''}`}
            id="blockBanner"
            role="alert"
            aria-live="assertive"
        >
            <div className="block-banner-content">
                <span className="block-banner-text">
                    You have been banned from using TASKFLOW
                </span>
                <Link to="/appeal" className="block-banner-appeal-link" id="blockBannerAppealLink">
                    Appeal
                </Link>
            </div>
        </div>
    );
}

// Global and module exports
if (typeof window !== 'undefined') {
    window.Blockbanner = Blockbanner;
    window.BlockBanner = Blockbanner;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Blockbanner;
}

export default Blockbanner;
