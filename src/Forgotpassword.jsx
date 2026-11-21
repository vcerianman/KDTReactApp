import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './Forgotpassword.css';
import request from './api/Request';

function Forgotpassword() {
    // Step state: 'init' | 'code' | 'reset' | 'success'
    const [step, setStep] = useState('init');

    // Form fields
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Password visibility toggles
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Feedback state
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null); // 'success' | 'error' | null
    const [message, setMessage] = useState('');

    const handleUsernameChange = useCallback((e) => {
        setUsername(e.target.value);
        setStatus(null);
        setMessage('');
    }, []);

    const handleEmailChange = useCallback((e) => {
        setEmail(e.target.value);
        setStatus(null);
        setMessage('');
    }, []);

    const handleCodeChange = useCallback((e) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
        setCode(val);
        setStatus(null);
        setMessage('');
    }, []);

    const handleNewPasswordChange = useCallback((e) => {
        setNewPassword(e.target.value);
        setStatus(null);
        setMessage('');
    }, []);

    const handleConfirmPasswordChange = useCallback((e) => {
        setConfirmPassword(e.target.value);
        setStatus(null);
        setMessage('');
    }, []);

    // 1. Send verification code to email
    const handleSendCode = useCallback(async (e) => {
        if (e) e.preventDefault();
        if (!username.trim() || !email.trim()) {
            setStatus('error');
            setMessage('Please provide both username and email.');
            return;
        }

        setLoading(true);
        setStatus(null);
        setMessage('');

        try {
            const payload = {
                username: username.trim(),
                email: email.trim()
            };

            let res;
            try {
                res = await request.post('/api/forgotpassword', payload);
            } catch (err1) {
                if (err1?.response?.status === 404) {
                    res = await request.post('/api/auth/forgot-password', payload);
                } else {
                    throw err1;
                }
            }

            setStep('code');
            setStatus('success');
            setMessage(res?.message || 'Verification code sent successfully');
        } catch (error) {
            console.error('Failed to send verification code:', error);
            const errMsg = error?.response?.data?.message || error?.response?.data?.error || 'Failed to send verification code. Please try again.';
            setStatus('error');
            setMessage(errMsg);
        } finally {
            setLoading(false);
        }
    }, [username, email]);

    // 2. Verify code
    const handleVerifyCode = useCallback(async (e) => {
        if (e) e.preventDefault();
        if (!code.trim()) {
            setStatus('error');
            setMessage('Please enter the 6-digit verification code.');
            return;
        }

        setLoading(true);
        setStatus(null);
        setMessage('');

        try {
            const payload = {
                username: username.trim(),
                email: email.trim(),
                code: code.trim()
            };

            try {
                await request.post('/api/forgotpassword', payload);
            } catch (err1) {
                if (err1?.response?.status === 404) {
                    await request.post('/api/auth/forgot-password', payload);
                } else {
                    throw err1;
                }
            }

            // Successfully verified code -> proceed to reset password step
            setStep('reset');
            setStatus(null);
            setMessage('');
        } catch (error) {
            console.error('Verification code mismatch:', error);
            setStatus('error');
            setMessage('Code Mismatch');
        } finally {
            setLoading(false);
        }
    }, [username, email, code]);

    // 3. Reset password
    const handleResetPassword = useCallback(async (e) => {
        if (e) e.preventDefault();
        if (!newPassword) {
            setStatus('error');
            setMessage('Please enter a new password.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setStatus('error');
            setMessage('Passwords do not match.');
            return;
        }

        setLoading(true);
        setStatus(null);
        setMessage('');

        try {
            const payload = {
                username: username.trim(),
                email: email.trim(),
                code: code.trim(),
                new_password: newPassword,
                password: newPassword
            };

            try {
                await request.post('/api/forgotpassword', payload);
            } catch (err1) {
                if (err1?.response?.status === 404) {
                    await request.post('/api/auth/forgot-password', payload);
                } else {
                    throw err1;
                }
            }

            // Webpage clears up and shows successful password reset
            setStep('success');
            setStatus(null);
            setMessage('');
        } catch (error) {
            console.error('Password reset failed:', error);
            const errMsg = error?.response?.data?.message || error?.response?.data?.error || 'Failed to reset password. Please try again.';
            setStatus('error');
            setMessage(errMsg);
        } finally {
            setLoading(false);
        }
    }, [username, email, code, newPassword, confirmPassword]);

    return (
        <div className="fp-page-wrapper">
            <div className="fp-card">
                {/* Back to Login link */}
                {step !== 'success' && (
                    <Link to="/login" className="fp-back-link" title="Back to Login">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 5l-7 7 7 7" />
                        </svg>
                        Back to Login
                    </Link>
                )}

                {/* ================= STEP 4: SUCCESS ================= */}
                {step === 'success' ? (
                    <div className="fp-success-wrap">
                        <div className="fp-success-icon-wrap">
                            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#1a7f37" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                            </svg>
                        </div>
                        <h1 className="fp-title">Password Reset Successfully!</h1>
                        <p className="fp-subtitle">
                            Your password has been reset. You can now log in with your new password.
                        </p>
                        <Link to="/login" className="fp-btn-verify fp-btn-link" title="Return to Login">
                            Return to Login
                        </Link>
                    </div>
                ) : step === 'reset' ? (
                    /* ================= STEP 3: RESET PASSWORD ================= */
                    <>
                        <div className="fp-icon-wrap">
                            <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="#00a2ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                        </div>

                        <h1 className="fp-title">Reset Password</h1>
                        <p className="fp-subtitle">
                            Please enter and confirm your new secret password.
                        </p>

                        <form onSubmit={handleResetPassword} className="fp-form">
                            {/* Reset Password */}
                            <div className="fp-form-group">
                                <label htmlFor="fp-new-password" className="fp-label">Reset Password:</label>
                                <div className="fp-password-wrapper">
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        id="fp-new-password"
                                        name="newPassword"
                                        className="fp-input"
                                        placeholder="Your new secret password"
                                        value={newPassword}
                                        onChange={handleNewPasswordChange}
                                        required
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        className="fp-toggle-password-btn"
                                        onClick={() => setShowNewPassword(prev => !prev)}
                                        aria-label="Toggle password visibility"
                                        title="Show/Hide Password"
                                    >
                                        {showNewPassword ? '-' : '👁'}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className="fp-form-group">
                                <label htmlFor="fp-confirm-password" className="fp-label">Confirm Password:</label>
                                <div className="fp-password-wrapper">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        id="fp-confirm-password"
                                        name="confirmPassword"
                                        className="fp-input"
                                        placeholder="Confirm your new secret password"
                                        value={confirmPassword}
                                        onChange={handleConfirmPasswordChange}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="fp-toggle-password-btn"
                                        onClick={() => setShowConfirmPassword(prev => !prev)}
                                        aria-label="Toggle password visibility"
                                        title="Show/Hide Password"
                                    >
                                        {showConfirmPassword ? '-' : '👁'}
                                    </button>
                                </div>
                            </div>

                            {/* Status message */}
                            {status && (
                                <span className={`fp-status-${status}`}>{message}</span>
                            )}

                            {/* Reset Password Button */}
                            <button
                                type="submit"
                                className="fp-btn-verify"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="fp-spinner"></span>
                                        Resetting...
                                    </>
                                ) : 'Reset Password'}
                            </button>
                        </form>
                    </>
                ) : (
                    /* ================= STEPS 1 & 2: USERNAME/EMAIL & CODE ================= */
                    <>
                        <div className="fp-icon-wrap">
                            <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="#00a2ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="4" width="20" height="16" rx="2" />
                                <path d="M2 7l10 7 10-7" />
                            </svg>
                        </div>

                        <h1 className="fp-title">Forgot Password?</h1>
                        <p className="fp-subtitle">
                            {step === 'code'
                                ? 'We have sent a 6-digit verification code to your email.'
                                : "Enter your username and email address and we'll send you a verification code."}
                        </p>

                        <form onSubmit={step === 'code' ? handleVerifyCode : handleSendCode} className="fp-form">
                            {/* Username */}
                            <div className="fp-form-group">
                                <label htmlFor="fp-username" className="fp-label">Username:</label>
                                <input
                                    type="text"
                                    id="fp-username"
                                    name="username"
                                    className="fp-input"
                                    placeholder="Your username"
                                    value={username}
                                    onChange={handleUsernameChange}
                                    disabled={step === 'code'}
                                    autoComplete="username"
                                    autoFocus={step === 'init'}
                                    required
                                />
                            </div>

                            {/* Email */}
                            <div className="fp-form-group">
                                <label htmlFor="fp-email" className="fp-label">Email address:</label>
                                <input
                                    type="email"
                                    id="fp-email"
                                    name="email"
                                    className="fp-input"
                                    placeholder="e.g. yourname@email.com"
                                    value={email}
                                    onChange={handleEmailChange}
                                    disabled={step === 'code'}
                                    required
                                    autoComplete="email"
                                />
                            </div>

                            {/* Code Input (replaces verify button when code sent) */}
                            {step === 'code' ? (
                                <div className="fp-form-group" style={{ marginTop: '14px' }}>
                                    <label htmlFor="fp-code" className="fp-label">Verification Code:</label>
                                    <div className="fp-code-wrapper">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            id="fp-code"
                                            name="code"
                                            className="fp-input fp-code-input"
                                            placeholder="6-digit code"
                                            maxLength={6}
                                            value={code}
                                            onChange={handleCodeChange}
                                            autoFocus
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="fp-code-submit-btn"
                                            onClick={handleVerifyCode}
                                            disabled={loading || code.trim().length === 0}
                                            title="Verify Code"
                                            aria-label="Verify Code"
                                        >
                                            {loading ? (
                                                <span className="fp-spinner-sm"></span>
                                            ) : (
                                                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ) : null}

                            {/* Status message */}
                            {status && (
                                <span className={`fp-status-${status}`}>{message}</span>
                            )}

                            {/* Verify Button (only shown in initial step) */}
                            {step === 'init' && (
                                <button
                                    type="submit"
                                    className="fp-btn-verify"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="fp-spinner"></span>
                                            Sending...
                                        </>
                                    ) : 'Verify'}
                                </button>
                            )}
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}

export default Forgotpassword;
