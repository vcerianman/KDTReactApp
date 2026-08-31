import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './SignUp.css';
import Notification from './Notification';
import request from './api/Request';

function SignUp() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        fullname: '',
        username: '',
        password: '',
        email: ''
    });

    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [toast, setToast] = useState(null);

    const togglePasswordVisibility = () => {
        setShowPassword((prev) => !prev);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setHasError(false);
        setErrorMessage('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setHasError(false);
        setErrorMessage('');

        if (!formData.username || !formData.fullname || !formData.email || !formData.password) {
            setToast({ message: 'Please fill in all required fields.', type: 'error' });
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                username: formData.username.trim(),
                fullname: formData.fullname.trim(),
                fullName: formData.fullname.trim(),
                email: formData.email.trim(),
                password: formData.password
            };

            const res = await request.post('/api/auth/signup', payload);

            // Extract and store token if provided
            const token = res?.token || res?.accessToken || res?.data?.token || res?.data?.accessToken || (typeof res === 'string' ? res : null);
            if (token) {
                localStorage.setItem('token', token);
            }

            // Redirect user to home logged in
            navigate('/home');
        } catch (error) {
            console.error('Sign up failed:', error);
            const msg = error?.response?.data?.message || error?.message || 'Sign up failed. Please check your information.';
            setHasError(true);
            setErrorMessage(msg);
            setToast({ message: msg, type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="signup-page-wrapper">
            {/* Universal Notification Toast */}
            <Notification toast={toast} onClose={() => setToast(null)} />

            <div className="signup-card">
                {/* Title */}
                <h1 className="signup-title">Sign Up to KDT Taskflow!</h1>

                {/* Sign Up Form */}
                <form onSubmit={handleSubmit}>
                    {/* Full Name */}
                    <div className="form-group">
                        <label htmlFor="fullname" className="form-label">Full name:</label>
                        <input
                            type="text"
                            id="fullname"
                            name="fullname"
                            className="form-input"
                            placeholder="Your Display Name (3- 6700 characters)"
                            value={formData.fullname}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {/* Username */}
                    <div className="form-group">
                        <label htmlFor="username" className="form-label">Username:</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            className="form-input"
                            placeholder="Your Username (3-6700 characters)"
                            value={formData.username}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {/* Password */}
                    <div className="form-group">
                        <label htmlFor="password" className="form-label">Password:</label>
                        <div className="password-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                name="password"
                                className="form-input"
                                placeholder="Your secret password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                            <button
                                type="button"
                                className="toggle-password-btn"
                                id="togglePassword"
                                aria-label="Toggle password visibility"
                                title="Show/Hide Password"
                                onClick={togglePasswordVisibility}
                            >
                                {showPassword ? '-' : '👁'}
                            </button>
                        </div>
                    </div>

                    {/* Email */}
                    <div className="form-group">
                        <label htmlFor="email" className="form-label">Email:</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            className="form-input"
                            placeholder="Your great email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                        {hasError && errorMessage && (
                            <span className="form-error-text">{errorMessage}</span>
                        )}
                    </div>

                    {/* Terms */}
                    <p className="terms-text">
                        By clicking Sign Up, you are agreeing to the
                        <Link to="/terms" className="terms-link">Terms of Use</Link>
                    </p>

                    <p className="login-text">
                        Already have an account? Login here:
                        <Link to="/login" className="terms-link">Login</Link>
                    </p>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="btn-signup"
                        disabled={submitting}
                    >
                        {submitting ? 'Signing Up...' : 'Sign Up'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default SignUp;
