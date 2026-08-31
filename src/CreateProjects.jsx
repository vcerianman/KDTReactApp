import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './CreateProjects.css';
import NavBar from './NavBar';
import Notification from './Notification';
import request from './api/Request';
import { getUserAvatarUrl } from './utils';

// Create Project Form Component
function CreateProjectForm({ onSubmit }) {
    const [formData, setFormData] = useState({
        projectTitle: '',
        projectDesc: '',
        projectStatus: 'Active',
        startDate: '',
        dueDate: ''
    });

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="create-card">
            <h1 className="create-title">Create New Project</h1>

            <form onSubmit={handleSubmit}>
                {/* Project Title */}
                <div className="form-group">
                    <label htmlFor="projectTitle" className="form-label">Project Title:</label>
                    <input
                        type="text"
                        id="projectTitle"
                        className="form-input"
                        placeholder="Your great project name..."
                        value={formData.projectTitle}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* Project Description */}
                <div className="form-group">
                    <label htmlFor="projectDesc" className="form-label">Description:</label>
                    <textarea
                        id="projectDesc"
                        className="form-textarea"
                        placeholder="Brief description..."
                        value={formData.projectDesc}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* Initial Status */}
                <div className="form-group">
                    <label htmlFor="projectStatus" className="form-label">Initial Status:</label>
                    <select
                        id="projectStatus"
                        className="form-select"
                        value={formData.projectStatus}
                        onChange={handleChange}
                    >
                        <option value="Active">Active</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Planning">Planning</option>
                    </select>
                </div>

                {/* Start Date & Due Date */}
                <div className="form-row-dates">
                    <div className="form-group half-width">
                        <label htmlFor="startDate" className="form-label">Start Date:</label>
                        <input
                            type="date"
                            id="startDate"
                            className="form-input"
                            value={formData.startDate}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group half-width">
                        <label htmlFor="dueDate" className="form-label">Due Date:</label>
                        <input
                            type="date"
                            id="dueDate"
                            className="form-input"
                            value={formData.dueDate}
                            onChange={handleChange}
                            required
                        />
                    </div>
                </div>

                <div className="button-row">
                    <Link to="/projects" className="btn-cancel">Cancel</Link>
                    <button type="submit" className="btn-submit">Create Project</button>
                </div>
            </form>
        </div>
    );
}

// Main Create Projects Page Component
function CreateProjects() {
    const navigate = useNavigate();

    const [currentUser, setCurrentUser] = useState({
        id: "?",
        fullname: "?",
        username: "?",
        image: "/ProfilePic/0.jpg"
    });
    const [toast, setToast] = useState(null);

    // Fetch logged in user info for NavBar
    const fetchCurrentUser = useCallback(async () => {
        try {
            const data = await request.get('/api/auth/me');
            if (data) {
                const uname = data.username || "?";
                const fname = data.full_name || data.fullName || data.fullname || data.name || uname;
                const img = data.image || (uname !== '?' ? getUserAvatarUrl(uname) : '/ProfilePic/0.jpg');

                setCurrentUser({
                    id: String(data.id || "?"),
                    fullname: fname,
                    username: uname,
                    image: img
                });
            }
        } catch (err) {
            console.error('Failed to fetch current user (/api/auth/me):', err);
        }
    }, []);

    useEffect(() => {
        fetchCurrentUser();
    }, [fetchCurrentUser]);

    const handleCreateProject = (projectData) => {
        navigate('/projects');
    };

    return (
        <div className="create-projects-page-wrapper">
            {/* Top Navigation Bar Component */}
            <div id="navbar-root">
                <NavBar
                    userId={currentUser.id}
                    fullName={currentUser.fullname}
                    userName={currentUser.username}
                    userImg={currentUser.image}
                />
            </div>

            {/* Universal Notification Toast */}
            <Notification toast={toast} onClose={() => setToast(null)} />

            {/* Page Content Container */}
            <div className="page-container">
                <CreateProjectForm onSubmit={handleCreateProject} />
            </div>
        </div>
    );
}

export default CreateProjects;
