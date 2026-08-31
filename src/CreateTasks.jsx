import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import './CreateTasks.css';
import NavBar from './NavBar';
import Notification from './Notification';
import request from './api/Request';
import { getUserAvatarUrl } from './utils';

// User Selection Modal Component (like Edit Members in tasks.jsx)
function UserSelectModal({
    isOpen,
    onClose,
    users,
    loading,
    onSelectUser
}) {
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const filteredUsers = [...(users || [])].filter(u => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        const full = `${u.fullname || ''} ${u.username || ''}`.toLowerCase();
        return full.includes(query);
    });

    return (
        <div
            className="members-modal-overlay"
            id="userSelectModalOverlay"
            onClick={(e) => {
                if (e.target.id === 'userSelectModalOverlay') {
                    onClose();
                }
            }}
        >
            <div className="members-modal-card">
                <div className="members-modal-header">
                    <h3 className="members-modal-title">Select Assignee</h3>
                    <div className="members-header-right">
                        <div className="members-search-box">
                            <svg className="members-search-icon" viewBox="0 0 24 24">
                                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                            </svg>
                            <input
                                type="text"
                                className="members-search-input"
                                placeholder="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <button
                            type="button"
                            className="members-modal-close-btn"
                            aria-label="Close"
                            onClick={onClose}
                        >
                            &times;
                        </button>
                    </div>
                </div>

                <div className="members-list-scroll">
                    {loading ? (
                        <div className="members-empty-text">Loading users...</div>
                    ) : filteredUsers.length > 0 ? (
                        filteredUsers.map(u => (
                            <div
                                key={u.id}
                                className="member-item-row"
                                onClick={() => onSelectUser(u)}
                                title={`Select @${u.username}`}
                            >
                                <img
                                    src={u.image || getUserAvatarUrl(u.username)}
                                    alt={u.fullname}
                                    className="member-avatar-img"
                                    onError={(e) => {
                                        e.target.src = '/ProfilePic/0.jpg';
                                    }}
                                />
                                <div className="member-info-text">
                                    <span className="member-fullname">{u.fullname}</span>
                                    <span className="member-username">@{u.username}</span>
                                </div>
                                <button
                                    type="button"
                                    className="btn-select-member"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectUser(u);
                                    }}
                                >
                                    Select
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="members-empty-text">No users found...</div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Create Task Form Component
function CreateTaskForm({
    projects,
    loadingProjects,
    formData,
    onFormChange,
    onOpenUserModal,
    onSubmit,
    submitting
}) {
    return (
        <div className="create-card">
            <h1 className="create-title">Assign New Task</h1>

            <form onSubmit={onSubmit}>
                {/* Task Title */}
                <div className="form-group">
                    <label htmlFor="title" className="form-label">Task title:</label>
                    <input
                        type="text"
                        id="title"
                        className="form-input"
                        placeholder="Your task title..."
                        value={formData.title}
                        onChange={onFormChange}
                        required
                    />
                </div>

                {/* Task Description */}
                <div className="form-group">
                    <label htmlFor="description" className="form-label">Task description:</label>
                    <textarea
                        id="description"
                        className="form-textarea"
                        placeholder="Brief description of the task..."
                        value={formData.description}
                        onChange={onFormChange}
                        required
                    />
                </div>

                {/* Project Assign */}
                <div className="form-group">
                    <label htmlFor="projectId" className="form-label">Project assign:</label>
                    <select
                        id="projectId"
                        className="form-select"
                        value={formData.projectId}
                        onChange={onFormChange}
                        required
                    >
                        {loadingProjects && <option value="">Loading projects...</option>}
                        {!loadingProjects && projects.length === 0 && (
                            <option value="">No projects available</option>
                        )}
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.title} (id:{p.id})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Assignee & Assigner */}
                <div className="form-row-dates">
                    <div className="form-group half-width">
                        <label htmlFor="assignee" className="form-label">Assignee:</label>
                        <div className="input-with-button-row">
                            <input
                                type="text"
                                id="assignee"
                                className="form-input"
                                placeholder="Assignee username (e.g. KDT)..."
                                value={formData.assignee}
                                onChange={onFormChange}
                                required
                            />
                            <button
                                type="button"
                                className="btn-search-user"
                                onClick={onOpenUserModal}
                                title="Search and select user"
                                aria-label="Search and select user"
                            >
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="form-group half-width">
                        <label htmlFor="assigner" className="form-label">Assigner:</label>
                        <input
                            type="text"
                            id="assigner"
                            className="form-input"
                            value={formData.assigner}
                            readOnly
                            tabIndex={-1}
                            style={{ backgroundColor: '#f0f2f5', cursor: 'not-allowed', color: '#555' }}
                            title="Assigner cannot be changed (assigned by current logged-in user)"
                        />
                    </div>
                </div>

                {/* Priority & Due Date */}
                <div className="form-row-dates">
                    <div className="form-group half-width">
                        <label htmlFor="priority" className="form-label">Priority:</label>
                        <select
                            id="priority"
                            className="form-select"
                            value={formData.priority}
                            onChange={onFormChange}
                        >
                            <option value="URGENT">URGENT</option>
                            <option value="HIGH">HIGH</option>
                            <option value="MEDIUM">MEDIUM</option>
                            <option value="LOW">LOW</option>
                        </select>
                    </div>

                    <div className="form-group half-width">
                        <label htmlFor="dueDate" className="form-label">Due Date:</label>
                        <input
                            type="date"
                            id="dueDate"
                            className="form-input"
                            value={formData.dueDate}
                            onChange={onFormChange}
                            required
                        />
                    </div>
                </div>

                {/* Buttons Row */}
                <div className="button-row">
                    <Link
                        to={formData.projectId ? `/tasks?projectId=${encodeURIComponent(formData.projectId)}` : "/tasks"}
                        className="btn-cancel"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        className="btn-submit"
                        disabled={submitting || !formData.projectId}
                    >
                        {submitting ? 'Assigning...' : 'Assign Task'}
                    </button>
                </div>
            </form>
        </div>
    );
}

// Main Create Tasks Page Component
function CreateTasks() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [currentUser, setCurrentUser] = useState({
        id: "?",
        fullname: "?",
        username: "?",
        image: "/ProfilePic/0.jpg"
    });

    const [projects, setProjects] = useState([]);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Global users for assignee selection prompt
    const [usersList, setUsersList] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);

    const [toast, setToast] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        projectId: '',
        assignee: '',
        assigner: '',
        priority: 'MEDIUM',
        dueDate: ''
    });

    // Fetch logged in user & their available projects
    const fetchData = useCallback(async () => {
        setLoadingProjects(true);
        try {
            let userId = "?";
            let uname = "?";
            let fname = "?";
            let img = "/ProfilePic/0.jpg";

            try {
                const authData = await request.get('/api/auth/me');
                if (authData) {
                    userId = String(authData.id || "?");
                    uname = authData.username || "?";
                    fname = authData.full_name || authData.fullName || authData.fullname || authData.name || uname;
                    img = authData.image || (uname !== '?' ? getUserAvatarUrl(uname) : '/ProfilePic/0.jpg');

                    setCurrentUser({
                        id: userId,
                        fullname: fname,
                        username: uname,
                        image: img
                    });
                }
            } catch (authErr) {
                console.error('Failed to fetch auth me in CreateTasks:', authErr);
            }

            // Fetch user projects via GET /api/users/{ID}
            let loadedProjects = [];
            if (userId && userId !== "?") {
                try {
                    const userRes = await request.get(`/api/users/${userId}`);
                    const userData = userRes?.data || userRes;
                    const projectIds = userData && Array.isArray(userData.projects) ? userData.projects : [];

                    if (projectIds.length > 0) {
                        const projectPromises = projectIds.map(async (item) => {
                            const pId = typeof item === 'object' && item !== null ? (item.id || item.projectId) : item;
                            if (!pId) return null;
                            try {
                                const projRes = await request.get(`/api/projects/${pId}`);
                                const pData = projRes?.data || projRes;
                                return {
                                    id: String(pData?.id || pId),
                                    title: pData?.title || pData?.name || `Project ${pId}`
                                };
                            } catch (pErr) {
                                return {
                                    id: String(pId),
                                    title: typeof item === 'string' ? item : `Project ${pId}`
                                };
                            }
                        });
                        loadedProjects = (await Promise.all(projectPromises)).filter(Boolean);
                    }
                } catch (uErr) {
                    console.error('Failed to fetch user projects in CreateTasks:', uErr);
                }
            }

            // Fallback projects if none found
            if (loadedProjects.length === 0) {
                try {
                    const allProjRes = await request.get('/api/projects');
                    const allList = Array.isArray(allProjRes) ? allProjRes : (allProjRes && Array.isArray(allProjRes.data) ? allProjRes.data : []);
                    if (allList.length > 0) {
                        loadedProjects = allList.map(p => ({
                            id: String(p.id || p._id),
                            title: p.title || p.name || `Project ${p.id}`
                        }));
                    }
                } catch (allErr) {
                    console.error('Failed to fetch all projects in CreateTasks:', allErr);
                }
            }

            if (loadedProjects.length === 0) {
                loadedProjects = [
                    { id: '123', title: 'Project A' },
                    { id: '124', title: 'Project B' },
                    { id: '125', title: 'Project C' },
                    { id: '126', title: 'Project D' },
                    { id: '127', title: 'Project E' }
                ];
            }

            setProjects(loadedProjects);

            // Determine which project should be automatically selected
            const urlProjectId = searchParams.get('projectId') || searchParams.get('project') || searchParams.get('projectAssign');
            let selectedProjectId = '';

            if (urlProjectId) {
                const found = loadedProjects.find(p =>
                    p.id.toLowerCase() === urlProjectId.toLowerCase() ||
                    p.title.toLowerCase() === urlProjectId.toLowerCase()
                );
                selectedProjectId = found ? found.id : urlProjectId;
            } else if (loadedProjects.length > 0) {
                selectedProjectId = loadedProjects[0].id;
            }

            setFormData(prev => ({
                ...prev,
                projectId: prev.projectId || selectedProjectId,
                assigner: prev.assigner || (uname !== '?' ? uname : 'KDT')
            }));

        } catch (err) {
            console.error('Failed to initialize CreateTasks:', err);
        } finally {
            setLoadingProjects(false);
        }
    }, [searchParams]);

    // Fetch users for assignee selection prompt
    const fetchUsers = useCallback(async () => {
        setLoadingUsers(true);
        try {
            const data = await request.get('/api/users');
            const userList = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : null);
            if (userList && userList.length > 0) {
                const formatted = userList.map(u => ({
                    id: String(u.id || u._id || Math.random()),
                    fullname: u.full_name || u.fullName || u.fullname || u.name || u.username || 'User',
                    username: u.username || '',
                    image: u.image || getUserAvatarUrl(u.username)
                }));
                setUsersList(formatted);
            } else {
                const defaultList = [
                    { id: '1', fullname: 'KDT', username: 'KDT', image: '/ProfilePic/KDT.jpg' },
                    { id: '2', fullname: 'Khang nig', username: 'Turtlely', image: '/ProfilePic/Turtlely.jpg' },
                    { id: '3', fullname: 'Ngo Do', username: 'NgoDo', image: '/ProfilePic/NgoDo.jpg' },
                    { id: '4', fullname: 'Eternal DESTROYER', username: 'CodeMaster', image: '/ProfilePic/0.jpg' },
                    { id: '5', fullname: 'USER', username: 'user', image: '/ProfilePic/0.jpg' },
                    { id: '6', fullname: 'dds', username: 'dds', image: '/ProfilePic/dds.jpg' }
                ];
                setUsersList(defaultList);
            }
        } catch (err) {
            console.error('Failed to fetch users for modal in CreateTasks:', err);
            const defaultList = [
                { id: '1', fullname: 'KDT', username: 'KDT', image: '/ProfilePic/KDT.jpg' },
                { id: '2', fullname: 'Khang nig', username: 'Turtlely', image: '/ProfilePic/Turtlely.jpg' },
                { id: '3', fullname: 'Ngo Do', username: 'NgoDo', image: '/ProfilePic/NgoDo.jpg' },
                { id: '4', fullname: 'Eternal DESTROYER', username: 'CodeMaster', image: '/ProfilePic/0.jpg' },
                { id: '5', fullname: 'USER', username: 'user', image: '/ProfilePic/0.jpg' },
                { id: '6', fullname: 'dds', username: 'dds', image: '/ProfilePic/dds.jpg' }
            ];
            setUsersList(defaultList);
        } finally {
            setLoadingUsers(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenUserModal = () => {
        setIsUserModalOpen(true);
        if (usersList.length === 0) {
            fetchUsers();
        }
    };

    const handleSelectUser = (user) => {
        setFormData(prev => ({
            ...prev,
            assignee: user.username || user.fullname || ''
        }));
        setIsUserModalOpen(false);
    };

    const handleFormChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleAssignTask = async (e) => {
        e.preventDefault();
        if (!formData.projectId) {
            setToast({ message: 'Please select a project to assign the task to.', type: 'error' });
            return;
        }

        setSubmitting(true);
        try {
            const formattedDueDate = formData.dueDate ? formData.dueDate.split('T')[0] : '';

            const payload = {
                title: formData.title.trim(),
                description: formData.description.trim(),
                priority: formData.priority,
                assignee: formData.assignee.trim(),
                assigner: (formData.assigner || currentUser.username || 'KDT').trim(),
                dueDate: formattedDueDate
            };

            await request.post(`/api/projects/${encodeURIComponent(formData.projectId)}/tasks`, payload);

            navigate(`/tasks?projectId=${encodeURIComponent(formData.projectId)}`);
        } catch (err) {
            console.error(`Failed to assign task to project ${formData.projectId}:`, err);
            const errorMsg = err.response?.data?.message || err.message || 'Failed to assign task. Please try again.';
            setToast({ message: errorMsg, type: 'error' });
        } finally {
            setSubmitting(false);
        }
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

            {/* Universal Notification Toast */}
            <Notification toast={toast} onClose={() => setToast(null)} />

            {/* Page Content Container */}
            <div className="page-container">
                <CreateTaskForm
                    projects={projects}
                    loadingProjects={loadingProjects}
                    formData={formData}
                    onFormChange={handleFormChange}
                    onOpenUserModal={handleOpenUserModal}
                    onSubmit={handleAssignTask}
                    submitting={submitting}
                />
            </div>

            {/* User Selection Modal Prompt */}
            <UserSelectModal
                isOpen={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
                users={usersList}
                loading={loadingUsers}
                onSelectUser={handleSelectUser}
            />
        </div>
    );
}

export default CreateTasks;
