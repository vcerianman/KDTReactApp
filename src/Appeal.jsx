import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import './Appeal.css';
import NavBar from './NavBar';
import Notification from './Notification';
import request from './api/Request';
import { getUserAvatarUrl } from './utils';

// Appeal Form Component
function AppealForm({ initialUsername, onSubmit, isSubmitting, isSubmitted }) {
    const [formData, setFormData] = useState({
        username: initialUsername || '',
        appealReason: ''
    });

    useEffect(() => {
        if (initialUsername) {
            setFormData(prev => ({
                ...prev,
                username: prev.username || initialUsername
            }));
        }
    }, [initialUsername]);

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    if (isSubmitted) {
        return (
            <div className="appeal-card">
                <h1 className="appeal-title">Submit Appeal</h1>
                <div className="appeal-success-box">
                    <div className="appeal-success-title">Appeal Submitted Successfully</div>
                    <p className="appeal-success-desc">
                        Your appeal has been received by the administrators. Please allow time for review.
                    </p>
                    <Link to="/home" className="btn-cancel" style={{ display: 'inline-block' }}>
                        Return to Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="appeal-card">
            <h1 className="appeal-title">Submit Appeal</h1>
            <p className="appeal-subtitle">
                If your account was banned, make your appeal and have great reasoning.
            </p>

            <form onSubmit={handleSubmit}>
                {/* Username */}
                <div className="form-group">
                    <label htmlFor="username" className="form-label">Username:</label>
                    <input
                        type="text"
                        id="username"
                        className="form-input"
                        placeholder="Your username..."
                        value={formData.username}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* Appeal Reason */}
                <div className="form-group">
                    <label htmlFor="appealReason" className="form-label">Appeal Reason:</label>
                    <textarea
                        id="appealReason"
                        className="form-textarea"
                        placeholder="Your great reasoning goes here..."
                        value={formData.appealReason}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="button-row">
                    <Link to="/home" className="btn-cancel">Cancel</Link>
                    <button
                        type="submit"
                        className="btn-submit"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Appeal'}
                    </button>
                </div>
            </form>
        </div>
    );
}

// Main Appeal Page Component
function Appeal() {
    const [searchParams] = useSearchParams();

    const [currentUser, setCurrentUser] = useState({
        id: "?",
        fullname: "?",
        username: "",
        image: "/ProfilePic/0.jpg",
        status: "",
        role: ""
    });
    const [authChecking, setAuthChecking] = useState(true);
    const [isBlockedUser, setIsBlockedUser] = useState(false);
    const [appealsList, setAppealsList] = useState([]);
    const [alreadyAppealed, setAlreadyAppealed] = useState(false);
    const [toast, setToast] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Helper: checks if a given username has already submitted an appeal (exact and case-insensitive matching)
    const isUsernameAppealed = (usernameToCheck, list) => {
        if (!usernameToCheck) return false;
        const target = String(usernameToCheck).trim();
        if (!target) return false;

        return (list || []).some(a => {
            if (!a) return false;
            const aUname = String(
                a.username ||
                a.userName ||
                a.user?.username ||
                (typeof a.user === 'string' ? a.user : '') ||
                ''
            ).trim();

            // Match both exact casing and case-insensitive
            return aUname === target || aUname.toLowerCase() === target.toLowerCase();
        });
    };

    // Helper: fetches the latest appeals list from GET /api/appeals
    const fetchAppeals = async () => {
        try {
            const data = await request.get('/api/appeals');
            let list = [];
            if (Array.isArray(data)) {
                list = data;
            } else if (data && Array.isArray(data.data)) {
                list = data.data;
            } else if (data && Array.isArray(data.content)) {
                list = data.content;
            } else if (data && Array.isArray(data.appeals)) {
                list = data.appeals;
            } else if (data && Array.isArray(data.result)) {
                list = data.result;
            } else if (data && typeof data === 'object') {
                const values = Object.values(data);
                list = values.filter(item => item && typeof item === 'object' && (item.username || item.id));
            }
            return Array.isArray(list) ? list : [];
        } catch (err) {
            console.error('Failed to fetch appeals (/api/appeals):', err);
            return [];
        }
    };

    // Fetch user info and all appeals on initial page load
    const initializeData = useCallback(async () => {
        setAuthChecking(true);
        try {
            // 1. Fetch appeals list
            const appeals = await fetchAppeals();
            setAppealsList(appeals);

            // 2. Fetch current user from /api/auth/me
            const data = await request.get('/api/auth/me');
            if (data) {
                const uData = data.data || data;
                const uname = uData.username || uData.userName || uData.user?.username || uData.name || uData.sub || "";
                const fname = uData.full_name || uData.fullName || uData.fullname || uData.name || uname || "?";
                const img = uData.image || (uname ? getUserAvatarUrl(uname) : '/ProfilePic/0.jpg');
                const status = String(uData.status || uData.userStatus || '').toUpperCase();
                const uId = String(uData.id || "?");
                const uRole = uData.role || "MEMBER";
                const blocked = status.includes('BLOCK') || status.includes('BAN') || uData.blocked === true || uData.banned === true;

                setCurrentUser({
                    id: uId,
                    fullname: fname,
                    username: uname,
                    image: img,
                    status: status,
                    role: uRole
                });
                setIsBlockedUser(blocked);

                // 3. Check if this username already exists in appeals
                const targetUname = uname || searchParams.get('username') || '';
                if (targetUname && isUsernameAppealed(targetUname, appeals)) {
                    setAlreadyAppealed(true);
                }
            } else {
                setIsBlockedUser(false);
            }
        } catch (err) {
            console.error('Failed to initialize Appeal page data:', err);
            setIsBlockedUser(false);
        } finally {
            setAuthChecking(false);
        }
    }, [searchParams]);

    useEffect(() => {
        initializeData();
    }, [initializeData]);

    const handleAppealSubmit = async (appealData) => {
        const usernameSubmitted = (appealData.username || currentUser.username || '').trim();
        const reasonSubmitted = (appealData.appealReason || '').trim();

        // 1. Fetch fresh appeals to ensure strict single-appeal rule
        const freshAppeals = await fetchAppeals();
        setAppealsList(freshAppeals);

        if (isUsernameAppealed(usernameSubmitted, freshAppeals)) {
            setToast({
                message: 'You can only appeal once.',
                type: 'error'
            });
            setAlreadyAppealed(true);
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                username: usernameSubmitted,
                reason: reasonSubmitted
            };

            await request.post('/api/appeals', payload);

            setToast({
                message: 'Your appeal has been submitted successfully.',
                type: 'success'
            });
            setSubmitted(true);
            setAlreadyAppealed(true);
        } catch (err) {
            console.error('Failed to submit appeal (POST /api/appeals):', err);
            const errMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to submit appeal. Please try again.';
            setToast({
                message: errMsg,
                type: 'error'
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (authChecking) {
        return <div className="appeal-loading-container" />;
    }

    const initialUname = searchParams.get('username') || (currentUser.username !== '?' ? currentUser.username : '');
    const hasAppealed = alreadyAppealed || isUsernameAppealed(currentUser.username, appealsList) || isUsernameAppealed(initialUname, appealsList);

    return (
        <div className="appeal-page-wrapper">
            {/* Top Navigation Bar Component - loaded for all users */}
            <div id="navbar-root">
                <NavBar
                    userId={currentUser.id}
                    fullName={currentUser.fullname}
                    userName={currentUser.username || '?'}
                    userImg={currentUser.image}
                    userRole={currentUser.role}
                />
            </div>

            {/* Universal Notification Toast */}
            <Notification toast={toast} onClose={() => setToast(null)} />

            {/* Page Content Container */}
            <div className="page-container">
                {!isBlockedUser ? (
                    <div className="appeal-card appeal-blank-card">
                        <p className="appeal-restricted-text">This page is for banned users only!</p>
                    </div>
                ) : hasAppealed && !submitted ? (
                    <div className="appeal-card appeal-blank-card">
                        <p className="appeal-already-text">You can only appeal once</p>
                    </div>
                ) : (
                    <AppealForm
                        initialUsername={initialUname}
                        onSubmit={handleAppealSubmit}
                        isSubmitting={submitting}
                        isSubmitted={submitted}
                    />
                )}
            </div>
        </div>
    );
}

export default Appeal;
