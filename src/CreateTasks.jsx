import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './CreateTasks.css';
import NavBar from './NavBar';
import request from './api/Request';
import { getUserAvatarUrl } from './utils';

// Create Task Form Component
function CreateTaskForm({ onSubmit }) {
    const [formData, setFormData] = useState({
        taskName: '',
        taskDesc: '',
        projectAssign: 'Project A',
        assignUser: '',
        taskPriority: 'MEDIUM',
        taskStatus: 'TODO',
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
            <h1 className="create-title">Assign New Task</h1>

            <form onSubmit={handleSubmit}>
                {/* Task Name */}
                <div className="form-group">
                    <label htmlFor="taskName" className="form-label">Task name:</label>
                    <input
                        type="text"
                        id="taskName"
                        className="form-input"
                        placeholder="Your task name..."
                        value={formData.taskName}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* Task Description */}
                <div className="form-group">
                    <label htmlFor="taskDesc" className="form-label">Task description:</label>
                    <textarea
                        id="taskDesc"
                        className="form-textarea"
                        placeholder="Brief description of the task..."
                        value={formData.taskDesc}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* Project Assign */}
                <div className="form-group">
                    <label htmlFor="projectAssign" className="form-label">Project assign:</label>
                    <select
                        id="projectAssign"
                        className="form-select"
                        value={formData.projectAssign}
                        onChange={handleChange}
                        required
                    >
                        <option value="" disabled>Select a project...</option>
                        <option value="Project A">Project A (id:123)</option>
                        <option value="Project B">Project B (id:124)</option>
                        <option value="Project C">Project C (id:125)</option>
                        <option value="Project D">Project D (id:126)</option>
                        <option value="Project E">Project E (id:127)</option>
                    </select>
                </div>

                {/* Assign User */}
                <div className="form-group">
                    <label htmlFor="assignUser" className="form-label">Assign User:</label>
                    <input
                        type="text"
                        id="assignUser"
                        className="form-input"
                        placeholder="Enter username or name (e.g. @KDT)..."
                        value={formData.assignUser}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* Priority & Initial Status */}
                <div className="form-row-dates">
                    <div className="form-group half-width">
                        <label htmlFor="taskPriority" className="form-label">Priority:</label>
                        <select
                            id="taskPriority"
                            className="form-select"
                            value={formData.taskPriority}
                            onChange={handleChange}
                        >
                            <option value="URGENT">URGENT</option>
                            <option value="HIGH">HIGH</option>
                            <option value="MEDIUM">MEDIUM</option>
                            <option value="LOW">LOW</option>
                        </select>
                    </div>

                    <div className="form-group half-width">
                        <label htmlFor="taskStatus" className="form-label">Status:</label>
                        <select
                            id="taskStatus"
                            className="form-select"
                            value={formData.taskStatus}
                            onChange={handleChange}
                        >
                            <option value="TODO">TODO</option>
                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                            <option value="IN_REVIEW">IN_REVIEW</option>
                            <option value="DONE">DONE</option>
                        </select>
                    </div>
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

                {/* Buttons Row */}
                <div className="button-row">
                    <Link to="/tasks" className="btn-cancel">Cancel</Link>
                    <button type="submit" className="btn-submit">Assign Task</button>
                </div>
            </form>
        </div>
    );
}

// Main Create Tasks Page Component
function CreateTasks() {
    const navigate = useNavigate();

    const [currentUser, setCurrentUser] = useState({
        id: "?",
        fullname: "?",
        username: "?",
        image: "/ProfilePic/0.jpg"
    });

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

    const handleCreateTask = (taskData) => {
        alert(`Task "${taskData.taskName}" assigned successfully!`);
        navigate('/tasks');
    };

    return (
        <div className="create-tasks-page-wrapper">
            {/* Top Navigation Bar Component */}
            <div id="navbar-root">
                <NavBar
                    userId={currentUser.id}
                    fullName={currentUser.fullname}
                    userName={currentUser.username}
                    userImg={currentUser.image}
                />
            </div>

            {/* Page Content Container */}
            <div className="page-container">
                <CreateTaskForm onSubmit={handleCreateTask} />
            </div>
        </div>
    );
}

export default CreateTasks;
