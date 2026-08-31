import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Login.css';
import request from './api/Request';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [hasError, setHasError] = useState(false);

    const togglePasswordVisibility = () => {
        setShowPassword((prev) => !prev);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setHasError(false);
        try {
            const res = await request.post('/api/auth/login', { username, password });
            const token = res?.token || res?.accessToken || res?.data?.token || res?.data?.accessToken || (typeof res === 'string' ? res : null);
            if (token) {
                localStorage.setItem('token', token);
            }
            window.location.href = '/home';
        } catch (error) {
            console.error('Login failed:', error);
            setHasError(true);
        }
    };

    return (
        <div className="login-page-wrapper">
            <div className="signup-card">
                {/* Title */}
                <h1 className="signup-title">Login to KDT Taskflow!</h1>

                {/* Sign Up Form */}
                <form action="#" method="POST" onSubmit={handleSubmit}>
                    {/* Username */}
                    <div className="form-group">
                        <label htmlFor="username" className="form-label">Username:</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            className="form-input"
                            placeholder="Your Username (3-6700 characters)"
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value);
                                setHasError(false);
                            }}
                            required
                        />
                        {hasError && <span className="form-error-text">Incorrect username or password</span>}
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
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setHasError(false);
                                }}
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
                        {hasError && <span className="form-error-text">Incorrect username or password</span>}
                    </div>

                    <p className="signup-text">
                        New here? Create account now: <Link to="/signup" className="terms-link">Sign up</Link>
                    </p>

                    {/* Submit Button */}
                    <button type="submit" className="btn-signup">Login</button>
                </form>
            </div>
        </div>
    );
}

export default Login;
