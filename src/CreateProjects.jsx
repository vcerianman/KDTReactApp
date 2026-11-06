import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './CreateProjects.css';
import NavBar from './NavBar';
import Notification from './Notification';
import request from './api/Request';
import useCurrentUser from './useCurrentUser';

// Custom Hook to handle form state, validation, and API interactions
// Custom Hook to handle form state, validation, and API interactions
function useCreateProjectForm() {
    const navigate = useNavigate();
    const { currentUser } = useCurrentUser();

    const [formData, setFormData] = useState({
        projectTitle: '',
        projectDesc: '',
        projectStatus: 'Active',
        startDate: '',
        dueDate: ''
    });

    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    const handleChange = useCallback((e) => {
        const { id, value } = e.target;
        setFormData((prev) => ({ ...prev, [id]: value }));
    }, []);

    const handleCloseToast = useCallback(() => {
        setToast(null);
    }, []);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();

        if (!formData.projectTitle || !formData.projectDesc || !formData.dueDate) {
            setToast({ message: 'Please fill in all required fields.', type: 'error' });
            return;
        }

        setLoading(true);
        try {
            // 1. Create project: POST /api/projects
            const payload = {
                name: formData.projectTitle.trim(),
                description: formData.projectDesc.trim(),
                status: formData.projectStatus.toUpperCase(),
                owner: currentUser?.username || '',
                start_date: formData.startDate || null,
                due_date: formData.dueDate
            };

            const projectRes = await request.post('/api/projects', payload);
            const projectData = projectRes?.data || projectRes;

            // Extract the new project ID from response
            const newProjectId = projectData?.id ?? projectData?._id ?? projectData;

            // 2. If user ID and new project ID are valid, update the user's projects list
            if (currentUser?.id && newProjectId != null) {
                try {
                    // Fetch current user data to get existing projects array
                    const userRes = await request.get(`/api/users/${currentUser.id}`);
                    const userData = userRes?.data || userRes;

                    let existingProjects = [];
                    if (Array.isArray(userData?.projects)) {
                        existingProjects = userData.projects;
                    } else if (typeof userData?.projects === 'string') {
                        // Handle comma-separated string formats like "1,2" or "{1,2}" if applicable
                        existingProjects = userData.projects
                            .replace(/[{}]/g, '')
                            .split(',')
                            .map(p => p.trim())
                            .filter(Boolean);
                    }

                    // Append the newest created project ID to the array/list
                    const updatedProjects = [...existingProjects, newProjectId];

                    // PATCH /api/users/{id} to update the user's projects array
                    await request.patch(`/api/users/${currentUser.id}`, {
                        projects: updatedProjects
                    });
                } catch (userUpdateErr) {
                    console.error('Failed to update user projects list:', userUpdateErr);
                }
            }

            // Redirect user to projects page on success
            navigate('/projects');
        } catch (error) {
            console.error('Failed to create project (/api/projects):', error);
            const msg = error?.response?.data?.message || error?.message || 'Failed to create project. Please try again.';
            setToast({ message: msg, type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [formData, currentUser, navigate]);

    return {
        formData,
        loading,
        toast,
        handleChange,
        handleSubmit,
        handleCloseToast
    };
}

// Create Project Form Component
function CreateProjectForm({ formData, loading, onChange, onSubmit }) {
    return (
        <div className="create-card">
            <h1 className="create-title">Create New Project</h1>

            <form onSubmit={onSubmit}>
                {/* Project Title */}
                <div className="form-group">
                    <label htmlFor="projectTitle" className="form-label">Project Title:</label>
                    <input
                        type="text"
                        id="projectTitle"
                        className="form-input"
                        placeholder="Your great project name..."
                        value={formData.projectTitle}
                        onChange={onChange}
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
                        onChange={onChange}
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
                        onChange={onChange}
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
                            onChange={onChange}
                        />
                    </div>

                    <div className="form-group half-width">
                        <label htmlFor="dueDate" className="form-label">Due Date:</label>
                        <input
                            type="date"
                            id="dueDate"
                            className="form-input"
                            value={formData.dueDate}
                            onChange={onChange}
                            required
                        />
                    </div>
                </div>

                <div className="button-row">
                    <Link to="/projects" className="btn-cancel">Cancel</Link>
                    <button type="submit" className="btn-submit" disabled={loading}>
                        {loading ? 'Creating...' : 'Create Project'}
                    </button>
                </div>
            </form>
        </div>
    );
}

// Main Create Projects Page Component
function CreateProjects() {
    const { currentUser } = useCurrentUser();
    const {
        formData,
        loading,
        toast,
        handleChange,
        handleSubmit,
        handleCloseToast
    } = useCreateProjectForm();

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
            <Notification toast={toast} onClose={handleCloseToast} />

            {/* Page Content Container */}
            <div className="page-container">
                <CreateProjectForm
                    formData={formData}
                    loading={loading}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                />
            </div>
        </div>
    );
}

export default CreateProjects;