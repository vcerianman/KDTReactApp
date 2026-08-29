import React, { useState, useEffect, useCallback } from 'react';
import './Settings.css';
import NavBar from './NavBar';
import request from './api/Request';
import { getUserAvatarUrl } from './utils';

// Sidebar Navigation Component
function SettingsSidebar({ activeTab, onSelectTab }) {
    return (
        <div className="sidebar-card">
            <button
                type="button"
                className={`sidebar-tab-item ${activeTab === 'account' ? 'active' : ''}`}
                onClick={() => onSelectTab('account')}
            >
                Account Info
            </button>
            <button
                type="button"
                className={`sidebar-tab-item ${activeTab === 'info' ? 'active' : ''}`}
                onClick={() => onSelectTab('info')}
            >
                Edit Info
            </button>
            <button
                type="button"
                className={`sidebar-tab-item ${activeTab === 'security' ? 'active' : ''}`}
                onClick={() => onSelectTab('security')}
            >
                Security
            </button>
        </div>
    );
}

// Tab 1: Account Info
function AccountTab({ account, onChange, onSave }) {
    return (
        <div>
            <h2 className="setting-title">Account Info</h2>

            {/* Full Name */}
            <div className="form-row">
                <label htmlFor="fullNameInput" className="setting-label">Full name:</label>
                <div className="field-container">
                    <input
                        type="text"
                        className="setting-input-box"
                        id="fullNameInput"
                        value={account.fullname}
                        placeholder="Enter full name"
                        onChange={(e) => onChange('fullname', e.target.value)}
                    />
                </div>
            </div>

            {/* Username */}
            <div className="username-text">Username: @{account.username}</div>

            {/* Email Address */}
            <div className="form-row">
                <label htmlFor="emailInput" className="setting-label">Email Address:</label>
                <div className="field-container">
                    <input
                        type="email"
                        className="setting-input-box"
                        id="emailInput"
                        value={account.email}
                        placeholder="Enter email"
                        onChange={(e) => onChange('email', e.target.value)}
                    />
                </div>
            </div>

            {/* Language Dropdown */}
            <div className="form-row">
                <label htmlFor="languageSelect" className="setting-label" style={{ color: '#666666' }}>Language</label>
                <div className="field-container">
                    <select
                        className="setting-select-box"
                        id="languageSelect"
                        value={account.language}
                        onChange={(e) => onChange('language', e.target.value)}
                    >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="vi">Vietnamese</option>
                    </select>
                </div>
            </div>

            {/* Theme Dropdown */}
            <div className="form-row">
                <label htmlFor="themeSelect" className="setting-label" style={{ color: '#666666' }}>Theme</label>
                <div className="field-container">
                    <select
                        className="setting-select-box"
                        id="themeSelect"
                        value={account.theme}
                        onChange={(e) => onChange('theme', e.target.value)}
                    >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                    </select>
                </div>
            </div>

            {/* Save Info Button */}
            <div className="btn-save-container">
                <button type="button" className="btn-save-setting" onClick={onSave}>
                    Save Info
                </button>
            </div>
        </div>
    );
}

// Tab 2: Edit Info
function EditInfoTab({ info, onChange, onSave }) {
    const handleAvatarChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (uploadEvent) => {
                onChange('avatar', uploadEvent.target.result);
                onChange('avatarName', file.name);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleVideoChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const fileURL = URL.createObjectURL(file);
            onChange('videoUrl', fileURL);
            onChange('videoName', file.name);
        }
    };

    return (
        <div>
            <h2 className="setting-title">Edit Info</h2>

            {/* Profile Picture Change */}
            <div className="form-row">
                <label className="setting-label">Profile Picture:</label>
                <div className="field-container">
                    <div className="upload-control-group">
                        <div className="avatar-preview-box">
                            <img
                                src={info.avatar}
                                alt="Profile Avatar"
                                className="avatar-preview-img"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/ProfilePic/0.jpg';
                                }}
                            />
                        </div>
                        <label htmlFor="avatarFileInput" className="btn-upload">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M4 4h3l2-2h6l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm8 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" />
                            </svg>
                            Change Picture
                        </label>
                        <input
                            type="file"
                            id="avatarFileInput"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleAvatarChange}
                        />
                        <span className="upload-filename-text">{info.avatarName}</span>
                    </div>
                </div>
            </div>

            {/* Edit Status Dropdown */}
            <div className="form-row">
                <label htmlFor="editStatusSelect" className="setting-label">Edit Status:</label>
                <div className="field-container">
                    <select
                        className="setting-select-box"
                        id="editStatusSelect"
                        value={info.status || 'ACTIVE'}
                        onChange={(e) => onChange('status', e.target.value)}
                    >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                    </select>
                </div>
            </div>

            {/* Edit About */}
            <div className="form-row" style={{ alignItems: 'flex-start' }}>
                <label htmlFor="editAboutInput" className="setting-label" style={{ paddingTop: '8px' }}>Edit about:</label>
                <div className="field-container">
                    <textarea
                        className="setting-input-box setting-textarea-box"
                        id="editAboutInput"
                        placeholder="Edit about..."
                        value={info.about}
                        onChange={(e) => onChange('about', e.target.value)}
                    />
                </div>
            </div>

            {/* Video About Me Upload */}
            <div className="form-row" style={{ alignItems: 'flex-start' }}>
                <label className="setting-label" style={{ paddingTop: '8px' }}>Video about me:</label>
                <div className="field-container">
                    <div className="video-upload-wrapper">
                        {info.videoUrl && (
                            <video className="video-preview-player" controls loop muted key={info.videoUrl}>
                                <source src={info.videoUrl} type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                        )}
                        <div className="upload-control-group">
                            <label htmlFor="videoFileInput" className="btn-upload">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z" />
                                </svg>
                                Upload Video
                            </label>
                            <input
                                type="file"
                                id="videoFileInput"
                                accept="video/*"
                                style={{ display: 'none' }}
                                onChange={handleVideoChange}
                            />
                            <span className="upload-filename-text">{info.videoName}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Info Button */}
            <div className="btn-save-container">
                <button type="button" className="btn-save-setting" onClick={onSave}>
                    Save Info
                </button>
            </div>
        </div>
    );
}

// Tab 3: Security
function SecurityTab({ security, onChange, onSave }) {
    return (
        <div>
            <h2 className="setting-title">Security</h2>

            <div className="form-row">
                <label htmlFor="currentPassword" className="setting-label">Current Password:</label>
                <div className="field-container">
                    <input
                        type="password"
                        className="setting-input-box"
                        id="currentPassword"
                        placeholder="Enter current password"
                        value={security.currentPassword}
                        onChange={(e) => onChange('currentPassword', e.target.value)}
                    />
                </div>
            </div>

            <div className="form-row">
                <label htmlFor="newPassword" className="setting-label">New Password:</label>
                <div className="field-container">
                    <input
                        type="password"
                        className="setting-input-box"
                        id="newPassword"
                        placeholder="Enter new password"
                        value={security.newPassword}
                        onChange={(e) => onChange('newPassword', e.target.value)}
                    />
                </div>
            </div>

            <div className="form-row">
                <label htmlFor="confirmPassword" className="setting-label">Confirm Password:</label>
                <div className="field-container">
                    <input
                        type="password"
                        className="setting-input-box"
                        id="confirmPassword"
                        placeholder="Confirm new password"
                        value={security.confirmPassword}
                        onChange={(e) => onChange('confirmPassword', e.target.value)}
                    />
                </div>
            </div>

            <div className="btn-save-container">
                <button type="button" className="btn-save-setting" onClick={onSave}>
                    Save Security
                </button>
            </div>
        </div>
    );
}

// Helper to compile multi-line about text into a list of strings
const compileAboutList = (aboutText) => {
    if (!aboutText) return [];
    if (Array.isArray(aboutText)) return aboutText.map(s => String(s).trim()).filter(Boolean);
    return String(aboutText)
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
};

// Main Settings Page Component
function Settings() {
    const [activeTab, setActiveTab] = useState('account');

    // Current logged-in user info
    const [currentUser, setCurrentUser] = useState({
        id: "?",
        fullname: "?",
        username: "?",
        image: "/ProfilePic/0.jpg"
    });

    // Account settings state
    const [account, setAccount] = useState({
        fullname: "?",
        username: "?",
        email: "",
        language: "en",
        theme: "light"
    });

    // Profile info state
    const [profileInfo, setProfileInfo] = useState({
        avatar: "/ProfilePic/0.jpg",
        avatarName: "0.jpg",
        status: "ACTIVE",
        about: "",
        videoUrl: "ProfileVid.mp4",
        videoName: "ProfileVid.mp4"
    });

    // Security state
    const [security, setSecurity] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    // Custom Alert Toast State: { message: string, type: 'success' | 'error' } | null
    const [toast, setToast] = useState(null);

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type });
    }, []);

    // Auto-dismiss alert after 4 seconds
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => {
                setToast(null);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // Fetch logged in user via GET /api/auth/me and GET /api/users/{ID}
    const fetchCurrentUser = useCallback(async () => {
        try {
            const data = await request.get('/api/auth/me');
            if (data) {
                const userId = String(data.id || "?");
                const uname = data.username || "?";
                const fname = data.full_name || data.fullName || data.fullname || data.name || uname;
                const email = data.email || "";
                const img = data.image || (uname !== '?' ? getUserAvatarUrl(uname) : '/ProfilePic/0.jpg');

                setCurrentUser({
                    id: userId,
                    fullname: fname,
                    username: uname,
                    image: img
                });

                setAccount(prev => ({
                    ...prev,
                    fullname: fname,
                    username: uname,
                    email: email
                }));

                // Fetch detailed user profile for about and status
                let userAboutText = "";
                let userStatus = "ACTIVE";

                if (userId && userId !== "?") {
                    try {
                        const userRes = await request.get(`/api/users/${userId}`);
                        const uData = userRes?.data || userRes;
                        if (uData) {
                            if (Array.isArray(uData.about)) {
                                userAboutText = uData.about.join('\n');
                            } else if (typeof uData.about === 'string') {
                                userAboutText = uData.about;
                            }
                            userStatus = (uData.status || "ACTIVE").toUpperCase();
                        }
                    } catch (uErr) {
                        console.error(`Failed to fetch user details for ID ${userId}:`, uErr);
                    }
                }

                setProfileInfo(prev => ({
                    ...prev,
                    avatar: img,
                    avatarName: uname !== '?' ? `${uname}.jpg` : '0.jpg',
                    status: userStatus,
                    about: userAboutText
                }));
            }
        } catch (err) {
            console.error('Failed to fetch current user (/api/auth/me):', err);
        }
    }, []);

    useEffect(() => {
        fetchCurrentUser();
    }, [fetchCurrentUser]);

    // Handle theme changes
    useEffect(() => {
        if (account.theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        return () => {
            document.body.classList.remove('dark-mode');
        };
    }, [account.theme]);

    const handleAccountChange = (key, value) => {
        setAccount(prev => ({ ...prev, [key]: value }));
    };

    const handleProfileInfoChange = (key, value) => {
        setProfileInfo(prev => ({ ...prev, [key]: value }));
    };

    const handleSecurityChange = (key, value) => {
        setSecurity(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveAccount = async () => {
        if (!currentUser.id || currentUser.id === "?") {
            showToast('Unable to identify logged in user. Please log in again.', 'error');
            return;
        }

        try {
            const payload = {
                fullname: account.fullname,
                email: account.email
            };

            await request.put(`/api/users/${currentUser.id}`, payload);

            // Update current user state for NavBar immediately
            setCurrentUser(prev => ({
                ...prev,
                fullname: account.fullname
            }));

            showToast('Saved successfully!', 'success');
        } catch (err) {
            console.error(`Failed to update account info (/api/users/${currentUser.id}):`, err);
            const errMsg = err?.response?.data?.message || err?.message || 'Failed to save account info!';
            showToast(errMsg, 'error');
        }
    };

    const handleSaveProfileInfo = async () => {
        if (!currentUser.id || currentUser.id === "?") {
            showToast('Unable to identify logged in user. Please log in again.', 'error');
            return;
        }

        try {
            const compiledAbout = compileAboutList(profileInfo.about);

            const payload = {
                about: compiledAbout,
                status: profileInfo.status || 'ACTIVE'
            };

            await request.put(`/api/users/${currentUser.id}`, payload);
            showToast('Saved successfully!', 'success');
        } catch (err) {
            console.error(`Failed to update profile info (/api/users/${currentUser.id}):`, err);
            const errMsg = err?.response?.data?.message || err?.message || 'Failed to save profile info!';
            showToast(errMsg, 'error');
        }
    };

    const handleSaveSecurity = async () => {
        if (!currentUser.id || currentUser.id === "?") {
            showToast('Unable to identify logged in user. Please log in again.', 'error');
            return;
        }

        if (!security.currentPassword) {
            showToast('Please enter your current password.', 'error');
            return;
        }

        if (!security.newPassword) {
            showToast('Please enter a new password.', 'error');
            return;
        }

        if (security.newPassword !== security.confirmPassword) {
            showToast('New passwords do not match!', 'error');
            return;
        }

        try {
            // 1. Check current password with POST /api/auth/password
            try {
                await request.post('/api/auth/password', {
                    password: security.currentPassword
                });
            } catch (authErr) {
                console.error('Password verification failed (/api/auth/password):', authErr);
                const status = authErr?.response?.status;
                if (status === 403 || status === 400) {
                    const msg = authErr?.response?.data?.message || 'Current password is incorrect!';
                    showToast(msg, 'error');
                } else {
                    const errMsg = authErr?.response?.data?.message || authErr?.message || 'Current password is incorrect!';
                    showToast(errMsg, 'error');
                }
                return;
            }

            // 2. Change password with PUT /api/users/{ID}
            const payload = {
                password: security.newPassword
            };

            await request.put(`/api/users/${currentUser.id}`, payload);

            // 3. Reset password input fields
            setSecurity({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });

            showToast('Saved successfully!', 'success');
        } catch (err) {
            console.error(`Failed to update password (/api/users/${currentUser.id}):`, err);
            const errMsg = err?.response?.data?.message || err?.message || 'Failed to update password!';
            showToast(errMsg, 'error');
        }
    };

    return (
        <div className={`settings-page-wrapper ${account.theme === 'dark' ? 'dark-mode' : ''}`}>
            {/* Top Navigation Bar Component */}
            <div id="navbar-root">
                <NavBar
                    userId={currentUser.id}
                    fullName={currentUser.fullname}
                    userName={currentUser.username}
                    userImg={currentUser.image}
                />
            </div>

            {/* Custom Sliding Alert Banner */}
            {toast && (
                <div className={`custom-alert-banner alert-${toast.type}`} role="alert">
                    <span className="custom-alert-message">{toast.message}</span>
                    <button
                        type="button"
                        className="custom-alert-close-btn"
                        aria-label="Dismiss alert"
                        onClick={() => setToast(null)}
                    >
                        <div className="custom-alert-circle-icon">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                            </svg>
                        </div>
                    </button>
                </div>
            )}

            {/* Main Settings Container */}
            <div className="page-container">
                <h1 className="page-title">My Settings</h1>

                <div className="settings-layout">
                    {/* Left Sidebar */}
                    <SettingsSidebar
                        activeTab={activeTab}
                        onSelectTab={setActiveTab}
                    />

                    {/* Right Content Area */}
                    <div className="settings-content-area">
                        {activeTab === 'account' && (
                            <AccountTab
                                account={account}
                                onChange={handleAccountChange}
                                onSave={handleSaveAccount}
                            />
                        )}
                        {activeTab === 'info' && (
                            <EditInfoTab
                                info={profileInfo}
                                onChange={handleProfileInfoChange}
                                onSave={handleSaveProfileInfo}
                            />
                        )}
                        {activeTab === 'security' && (
                            <SecurityTab
                                security={security}
                                onChange={handleSecurityChange}
                                onSave={handleSaveSecurity}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Settings;
