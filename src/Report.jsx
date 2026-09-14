import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation, useNavigate, Link } from 'react-router-dom';
import './Report.css';
import NavBar from './NavBar';
import Notification from './Notification';
import request from './api/Request';
import { getUserAvatarUrl } from './utils';

function Report() {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();

    // Logged-in user state for NavBar
    const [loggedInUser, setLoggedInUser] = useState({
        id: "?",
        username: "?",
        fullname: "?",
        image: "/ProfilePic/0.jpg",
        role: ""
    });

    // Report Form state
    const navState = location.state || {};
    const [reportedTarget, setReportedTarget] = useState(
        navState.username || searchParams.get('username') || navState.author || searchParams.get('user') || ''
    );
    const [reportType, setReportType] = useState(
        navState.type || searchParams.get('type') || 'user'
    );
    const [reason, setReason] = useState('Inappropriate Content');
    const [details, setDetails] = useState(
        navState.content ? `Reported message content: "${navState.content}"` : ''
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [toast, setToast] = useState(null);

    // Fetch logged-in user from /api/auth/me
    const fetchLoggedInUser = useCallback(async () => {
        try {
            const data = await request.get('/api/auth/me');
            if (data) {
                const uData = data.data || data;
                const uname = uData.username || "?";
                setLoggedInUser({
                    id: String(uData.id || uData.userId || "?"),
                    username: uname,
                    fullname: uData.full_name || uData.fullName || uData.fullname || uData.name || uname,
                    image: uData.image || (uname !== '?' ? getUserAvatarUrl(uname) : '/ProfilePic/0.jpg'),
                    role: uData.role || ''
                });
            }
        } catch (err) {
            console.error('Failed to fetch logged-in user:', err);
        }
    }, []);

    useEffect(() => {
        fetchLoggedInUser();
    }, [fetchLoggedInUser]);

    useEffect(() => {
        const target = navState.username || searchParams.get('username') || navState.author || searchParams.get('user') || searchParams.get('target');
        const cat = navState.type || searchParams.get('type') || searchParams.get('category');
        if (target) {
            setReportedTarget(target);
        }
        if (cat) {
            setReportType(cat);
        }
    }, [navState.username, navState.author, navState.type, searchParams]);

    // Helper to format multiline explanation into a PostgreSQL list {"line 1","line 2"}
    function formatExplanationPostgreList(text) {
        if (!text || typeof text !== 'string') return '{}';
        const lines = text
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0);

        if (lines.length === 0) return '{}';

        const escapedLines = lines.map(line => `"${line.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
        return `{${escapedLines.join(',')}}`;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reportedTarget.trim() || !details.trim()) {
            setToast({ message: 'Please fill in all required fields.', type: 'error' });
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                type: reportType,
                author: loggedInUser.username && loggedInUser.username !== '?' ? loggedInUser.username : (loggedInUser.fullname || 'User'),
                targetUsername: reportedTarget.trim(),
                reason: reason,
                explanation: formatExplanationPostgreList(details)
            };

            try {
                await request.post('/api/reports', payload);
            } catch (err1) {
                // Fallback attempt to singular endpoint /api/report if plural differs
                try {
                    await request.post('/api/report', payload);
                } catch (err2) {
                    throw err1; // Throw original error if both fail
                }
            }

            setIsSubmitted(true);
            setToast({ message: 'Report submitted successfully.', type: 'success' });
        } catch (err) {
            console.error('Failed to submit report (POST /api/reports):', err);
            const errMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to submit report. Please try again.';
            setToast({ message: errMsg, type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="report-page-wrapper">
            <div id="navbar-root">
                <NavBar
                    userId={loggedInUser.id}
                    fullName={loggedInUser.fullname}
                    userName={loggedInUser.username}
                    userImg={loggedInUser.image}
                    userRole={loggedInUser.role}
                />
            </div>

            {toast && (
                <Notification
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <div className="page-container">
                <div className="report-card">
                    <h1 className="report-title">Submit a Report</h1>
                    <p className="report-subtitle">
                        Help keep Taskflow safe and productive. Reports are reviewed by administrators.
                    </p>

                    {navState.project && (
                        <div className="report-target-badge">
                            Project: <strong>{navState.project}</strong>
                            {navState.type && ` • Target Type: ${navState.type}`}
                        </div>
                    )}

                    {isSubmitted ? (
                        <div className="report-success-box">
                            <div className="report-success-title">Report Submitted</div>
                            <p className="report-success-desc">
                                Thank you for your report. The administration team has received your submission and will review it promptly.
                            </p>
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={() => navigate(-1)}
                                style={{ marginRight: '10px' }}
                            >
                                &larr; Go Back
                            </button>
                            <Link to="/home" className="btn-cancel" style={{ display: 'inline-block' }}>
                                Return to Home
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="reportTypeSelect" className="form-label">Report Category / Type *</label>
                                <select
                                    id="reportTypeSelect"
                                    className="form-select"
                                    value={reportType}
                                    onChange={(e) => setReportType(e.target.value)}
                                >
                                    <option value="post">Discussion Post</option>
                                    <option value="reply">Discussion Reply</option>
                                    <option value="user">User Account</option>
                                    <option value="project">Project Content</option>
                                    <option value="task">Task / Activity</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="reportTarget" className="form-label">Reported Username / Target *</label>
                                <input
                                    type="text"
                                    id="reportTarget"
                                    className="form-input"
                                    placeholder="Username or content identifier..."
                                    value={reportedTarget}
                                    onChange={(e) => setReportedTarget(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="reportReason" className="form-label">Violation Reason *</label>
                                <select
                                    id="reportReason"
                                    className="form-select"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                >
                                    <option value="Inappropriate Content">Inappropriate Content / Harassment</option>
                                    <option value="Spam / Misleading">Spam / Disruptive Behavior</option>
                                    <option value="Impersonation">Impersonation / Fake Identity</option>
                                    <option value="Unauthorized Project Actions">Unauthorized Project / Task Actions</option>
                                    <option value="Other">Other Policy Violation</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="reportDetails" className="form-label">Detailed Explanation *</label>
                                <textarea
                                    id="reportDetails"
                                    className="form-textarea"
                                    placeholder="1st line: Offensive content; 2nd line: details"
                                    value={details}
                                    onChange={(e) => setDetails(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="button-row">
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={() => navigate(-1)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-submit-report"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Report'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Report;
