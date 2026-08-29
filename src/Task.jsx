import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import './Task.css';
import NavBar from './NavBar';
import request from './api/Request';
import {
    getTaskPriorityClass,
    getPriorityTagClass,
    getProjectStatusClass,
    getUserAvatarUrl
} from './utils';

// Section Reload Button Component matching the reload icon design
function ReloadButton({ onReload, isLoading }) {
    return (
        <button
            type="button"
            className={`section-reload-btn ${isLoading ? 'loading' : ''}`}
            onClick={onReload}
            title="Reload tasks"
            aria-label="Reload tasks"
        >
            <svg
                viewBox="0 0 24 24"
                width="28"
                height="28"
                fill="none"
                stroke="#60646c"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M20 11a8.1 8.1 0 0 0-15.5-2m-.5-4v4h4" />
                <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
            </svg>
        </button>
    );
}

// Priority Sorting Weights: URGENT (1) -> HIGH (2) -> MEDIUM (3) -> LOW (4)
const PRIORITY_ORDER = {
    'URGENT': 1,
    'HIGH': 2,
    'MEDIUM': 3,
    'LOW': 4
};

function getPriorityRank(priority) {
    const p = (priority || '').toUpperCase();
    return PRIORITY_ORDER[p] || 5;
}

// Header Section (Title & Search Bar)
function TasksHeader({ searchQuery, onSearchChange }) {
    return (
        <div className="tasks-header-row">
            <h1 className="page-title">My Great Tasks</h1>
            <div className="search-container tasks-search">
                <svg className="search-icon" viewBox="0 0 24 24" width="14" height="14">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
                <input
                    type="text"
                    className="top-search-input"
                    id="taskSearchInput"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
        </div>
    );
}

// Single Task Card Component
function TaskCard({ task, onTaskAction }) {
    const priorityClass = getTaskPriorityClass(task.priority);
    const tagClass = getPriorityTagClass(task.priority);

    return (
        <div className={`task-card ${priorityClass}`} data-task-id={task.id}>
            <div className="task-main-content">
                <div className="task-title-row">
                    <span className="task-title">{task.title}</span>
                    <span className={`task-priority-tag ${tagClass}`}>{task.priority}</span>
                    <span className="task-assigner-pill">
                        {task.assigner}
                    </span>
                </div>
                <div className="task-dates-row">
                    <span>{task.dates}</span>
                </div>
            </div>
            <button
                className="btn-task-action"
                title="Proceed / View Task"
                aria-label="Proceed / View Task"
                onClick={() => onTaskAction(task)}
            >
                <svg viewBox="0 0 24 24" width="20" height="20">
                    <path d="M8 5v14l11-7z" />
                </svg>
            </button>
        </div>
    );
}

// Single Status Column Component with Vertical Scroll
function StatusColumnCard({ columnKey, title, borderClass, tasks, onTaskAction }) {
    return (
        <div className={`status-column-card ${borderClass}`}>
            <div className="column-header">
                <h2 className="column-title">
                    {title}
                    <span className="column-count-badge">{tasks.length}</span>
                </h2>
            </div>
            <div className="column-tasks-scroll">
                {tasks.length > 0 ? (
                    tasks.map(task => (
                        <TaskCard key={task.id} task={task} onTaskAction={onTaskAction} />
                    ))
                ) : (
                    <div className="column-empty-state">
                        <span>No tasks in {title.toLowerCase()}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// 4 Columns Kanban Board with Bottom Horizontal Scrollbar
function KanbanBoard({ currentProject, searchQuery, onTaskAction }) {
    const query = searchQuery.toLowerCase().trim();

    // Filter tasks by live search query
    const projectTasks = currentProject ? currentProject.tasks || [] : [];
    const filteredTasks = projectTasks.filter(task => {
        if (!query) return true;
        const searchCorpus = `${task.title} ${task.priority} ${task.assigner} ${task.status} ${task.dates}`.toLowerCase();
        return searchCorpus.includes(query);
    });

    // Bucket tasks into the 4 columns
    const columnsDef = [
        {
            key: 'TODO',
            title: 'TODO',
            borderClass: 'col-todo',
            matcher: (status) => {
                const s = (status || '').toUpperCase();
                return s === 'TODO' || s === 'TO_DO' || s === 'PLANNING' || s === 'BACKLOG';
            }
        },
        {
            key: 'IN_PROGRESS',
            title: 'IN PROGRESS',
            borderClass: 'col-in-progress',
            matcher: (status) => {
                const s = (status || '').toUpperCase();
                return s === 'IN_PROGRESS' || s === 'IN PROGRESS' || s === 'DOING' || s === 'IN_REVIEW' || s === 'ON_HOLD';
            }
        },
        {
            key: 'COMPLETED',
            title: 'COMPLETED',
            borderClass: 'col-completed',
            matcher: (status) => {
                const s = (status || '').toUpperCase();
                return s === 'COMPLETED' || s === 'DONE' || s === 'FINISHED';
            }
        },
        {
            key: 'CANCELLED',
            title: 'CANCELLED',
            borderClass: 'col-cancelled',
            matcher: (status) => {
                const s = (status || '').toUpperCase();
                return s === 'CANCELLED' || s === 'CANCELED' || s === 'ARCHIVED';
            }
        }
    ];

    return (
        <div className="kanban-board-scroll-container" id="kanbanBoardScrollWrapper">
            <div className="kanban-board-track">
                {columnsDef.map(col => {
                    // Filter and sort by priority: URGENT -> HIGH -> MEDIUM -> LOW
                    const colTasks = filteredTasks
                        .filter(task => col.matcher(task.status))
                        .sort((a, b) => getPriorityRank(a.priority) - getPriorityRank(b.priority));

                    return (
                        <StatusColumnCard
                            key={col.key}
                            columnKey={col.key}
                            title={col.title}
                            borderClass={col.borderClass}
                            tasks={colTasks}
                            onTaskAction={onTaskAction}
                        />
                    );
                })}
            </div>
        </div>
    );
}

// Current Project Card & Switch Buttons
function CurrentProjectSection({ currentProject, onPrevProject, onNextProject, onOpenProjectUsers }) {
    if (!currentProject) return null;
    const statusClass = getProjectStatusClass(currentProject.status);

    const projectUsers = currentProject.users && currentProject.users.length > 0
        ? currentProject.users
        : [
            { id: '0', fullname: '(no one)', username: 'N/A', image: '/ProfilePic/01.jpg' }
        ];

    const displayedUsers = projectUsers.slice(0, 4);
    const extraCount = Math.max(0, projectUsers.length - 4);
    const userNamesString = projectUsers.map(u => u.fullname || u.name || u.username).join(', ');

    return (
        <div className="project-switch-container">
            {/* Current Project Card */}
            <div className={`current-project-card ${statusClass}`} data-project-id={currentProject.id}>
                {/* Left side: Project Title & Desc */}
                <div className="project-card-left">
                    <h2 className="project-title-header">
                        {currentProject.title} <span className="project-id-sub">(id:{currentProject.id})</span>
                    </h2>
                    <p className="project-card-desc">{currentProject.desc}</p>
                </div>

                {/* Middle Column: Involved Users */}
                <div className="project-card-middle">
                    <div className="project-users-header-row">
                        <span className="project-users-names-text" title={`Users: ${userNamesString}`}>
                            Users: {userNamesString}
                        </span>
                        <button
                            type="button"
                            className="btn-project-info-circle"
                            title="View all involved project users"
                            aria-label="View all involved project users"
                            onClick={() => onOpenProjectUsers(projectUsers, currentProject.title)}
                        >
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                            </svg>
                        </button>
                    </div>
                    <div className="project-users-avatars-row">
                        {displayedUsers.map((u, idx) => (
                            <img
                                key={u.id || idx}
                                src={u.image || getUserAvatarUrl(u.username)}
                                alt={u.fullname || u.username}
                                className="project-user-avatar-thumb"
                                title={`${u.fullname || u.username} (@${u.username})`}
                                onError={(e) => { e.target.src = '/ProfilePic/0.jpg'; }}
                            />
                        ))}
                        {extraCount > 0 && (
                            <span className="project-users-extra-badge">+{extraCount}</span>
                        )}
                    </div>
                </div>

                {/* Right side: Status & Owner */}
                <div className="project-card-right">
                    <div className="project-status-label">Status: {currentProject.status}</div>
                    <div className="project-owner-label">
                        owner: @{currentProject.owner || 'KDT'}
                    </div>
                </div>
            </div>

            {/* Switch Projects Navigation Buttons */}
            <div className="project-nav-buttons">
                <button
                    className="btn-nav-project"
                    onClick={onPrevProject}
                    title="Previous Project"
                    aria-label="Previous Project"
                >
                    <svg viewBox="0 0 24 24" width="22" height="22">
                        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                    </svg>
                </button>
                <button
                    className="btn-nav-project"
                    onClick={onNextProject}
                    title="Next Project"
                    aria-label="Next Project"
                >
                    <svg viewBox="0 0 24 24" width="22" height="22">
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

// Global & Project Users Prompt Modal Component
function GlobalUsersModal({
    isOpen,
    onClose,
    users,
    loading,
    title = "Edit Members",
    projectUserIds = [],
    isEditMode = false,
    onToggleMember,
    actionLoadingId = null
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

    const filteredUsers = [...(users || [])]
        .filter(u => {
            const query = searchQuery.toLowerCase().trim();
            if (!query) return true;
            const full = `${u.fullname} ${u.username}`.toLowerCase();
            return full.includes(query);
        })
        .sort((a, b) => {
            if (!isEditMode) return 0;
            const aIn = projectUserIds.includes(String(a.id));
            const bIn = projectUserIds.includes(String(b.id));
            if (aIn && !bIn) return -1;
            if (!aIn && bIn) return 1;
            return 0;
        });

    return (
        <div
            className="members-modal-overlay"
            id="membersModalOverlay"
            onClick={(e) => {
                if (e.target.id === 'membersModalOverlay') {
                    onClose();
                }
            }}
        >
            <div className="members-modal-card">
                <div className="members-modal-header">
                    <h3 className="members-modal-title">{title}</h3>
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
                        filteredUsers.map(u => {
                            const isInProject = projectUserIds.includes(String(u.id));
                            const isActionLoading = actionLoadingId === String(u.id);

                            return (
                                <div key={u.id} className="member-item-row">
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
                                    {isEditMode && (
                                        <div className="member-actions-wrapper">
                                            {isInProject ? (
                                                <button
                                                    type="button"
                                                    className="btn-member-action remove-btn"
                                                    title={`Remove ${u.fullname || u.username} from project`}
                                                    aria-label={`Remove ${u.fullname || u.username} from project`}
                                                    disabled={isActionLoading}
                                                    onClick={() => onToggleMember(u, true)}
                                                >
                                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                                        <path d="M19 13H5v-2h14v2z" />
                                                    </svg>
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="btn-member-action add-btn"
                                                    title={`Add ${u.fullname || u.username} to project`}
                                                    aria-label={`Add ${u.fullname || u.username} to project`}
                                                    disabled={isActionLoading}
                                                    onClick={() => onToggleMember(u, false)}
                                                >
                                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="members-empty-text">No users found...</div>
                    )}
                </div>
            </div>
        </div>
    );
}

// New Task Footer Action
function NewTaskFooter({ onOpenMembers }) {
    return (
        <div className="new-task-footer-row">
            <span className="new-task-label">Assign new task?</span>
            <div className="new-task-buttons-group">
                <button
                    type="button"
                    className="btn-add-members"
                    onClick={onOpenMembers}
                >
                    Edit members
                </button>
                <Link to="/create-tasks" className="btn-assign-task">Assign new task</Link>
            </div>
        </div>
    );
}

// Main Task / Kanban Page Component
function Task() {
    const [searchParams] = useSearchParams();

    // Current Logged-in User
    const [currentUser, setCurrentUser] = useState({
        id: "?",
        fullname: "?",
        username: "?",
        image: "/ProfilePic/0.jpg"
    });

    // Modal State for Global or Project users prompt
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: 'Edit Members',
        users: [],
        loading: false,
        isEditMode: false
    });
    const [actionLoadingId, setActionLoadingId] = useState(null);

    const [globalUsers, setGlobalUsers] = useState([]);

    // Projects with tasks data
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    // Active Project Index
    const [currentProjectIndex, setCurrentProjectIndex] = useState(0);

    // Live Search Query State
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

    // Fetch user project IDs via GET /api/users/{ID} and then tasks via GET /api/projects/{ID}/tasks
    const fetchUserAndTasks = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            // 1. Get logged-in user from /api/auth/me
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
                console.error('Failed to fetch auth me in Task.jsx:', authErr);
            }

            if (!userId || userId === "?") {
                setProjects([]);
                setLoadError(true);
                return;
            }

            // 2. Fetch user's project IDs via GET /api/users/{ID}
            const userRes = await request.get(`/api/users/${userId}`);
            const userData = userRes?.data || userRes;
            const projectIds = userData && Array.isArray(userData.projects) ? userData.projects : [];

            if (projectIds.length === 0) {
                setProjects([]);
                setLoadError(false);
                return;
            }

            // 3. For each project ID, fetch project info & tasks in parallel
            const projectPromises = projectIds.map(async (item) => {
                const projId = typeof item === 'object' && item !== null ? (item.id || item.projectId) : item;
                if (!projId) return null;

                try {
                    // Fetch project metadata
                    let projData = null;
                    try {
                        const projRes = await request.get(`/api/projects/${projId}`);
                        projData = projRes?.data || projRes;
                    } catch (pErr) {
                        console.error(`Failed to fetch project info for ${projId}:`, pErr);
                    }

                    // Fetch project tasks via GET /api/projects/{projId}/tasks
                    let taskList = [];
                    try {
                        const taskRes = await request.get(`/api/projects/${projId}/tasks`);
                        taskList = Array.isArray(taskRes) ? taskRes : (taskRes && Array.isArray(taskRes.data) ? taskRes.data : []);
                    } catch (tErr) {
                        console.error(`Failed to fetch tasks for project ${projId}:`, tErr);
                    }

                    const formattedTasks = taskList.map(t => {
                        const datesFormatted = t.dates || (t.start_date && t.end_date
                            ? `${t.start_date} - ${t.end_date}`
                            : (t.startDate && t.endDate
                                ? `${t.startDate} - ${t.endDate}`
                                : (t.dates || '')));

                        return {
                            id: String(t.id || t._id || Math.random()),
                            title: t.title || t.name || 'Task',
                            priority: (t.priority || 'MEDIUM').toUpperCase(),
                            assigner: t.assigner || t.assignee || t.createdBy || t.assignedTo || uname || 'KDT',
                            desc: t.desc || t.description || '',
                            status: (t.status || 'TODO').toUpperCase(),
                            dates: datesFormatted
                        };
                    });

                    const pDatesFormatted = projData?.dates || (projData?.start_date && projData?.end_date
                        ? `${projData.start_date} - ${projData.end_date}`
                        : (projData?.startDate && projData?.endDate
                            ? `${projData.startDate} - ${projData.endDate}`
                            : ''));

                    // Fetch users involved in this project via GET /api/users?projectId={ID}
                    let pUsers = [];
                    try {
                        const pUsersRes = await request.get(`/api/users?projectId=${projId}`);
                        const uList = Array.isArray(pUsersRes) ? pUsersRes : (pUsersRes && Array.isArray(pUsersRes.data) ? pUsersRes.data : []);
                        if (uList && uList.length > 0) {
                            pUsers = uList.map(u => ({
                                id: String(u.id || u._id || Math.random()),
                                fullname: u.full_name || u.fullName || u.fullname || u.name || u.username || 'User',
                                username: u.username || '',
                                image: u.image || getUserAvatarUrl(u.username)
                            }));
                        }
                    } catch (uErr) {
                        console.error(`Failed to fetch project users for project ${projId} (/api/users?projectId=${projId}):`, uErr);
                    }

                    // If empty or error, fallback to project data users or sample list
                    if (pUsers.length === 0) {
                        if (projData?.users && Array.isArray(projData.users) && projData.users.length > 0) {
                            pUsers = projData.users;
                        } else {
                            pUsers = [
                                { id: '1', fullname: 'KDT', username: 'KDT', image: '/ProfilePic/KDT.jpg' },
                                { id: '2', fullname: 'Khang nig', username: 'Turtlely', image: '/ProfilePic/Turtlely.jpg' },
                                { id: '3', fullname: 'Ngo Do', username: 'NgoDo', image: '/ProfilePic/NgoDo.jpg' },
                                { id: '4', fullname: 'Eternal DESTROYER', username: 'CodeMaster', image: '/ProfilePic/0.jpg' },
                                { id: '5', fullname: 'USER', username: 'user', image: '/ProfilePic/0.jpg' },
                                { id: '6', fullname: 'dds', username: 'dds', image: '/ProfilePic/dds.jpg' }
                            ];
                        }
                    }

                    return {
                        id: String(projData?.id || projId),
                        title: projData?.title || projData?.name || `Project ${projId}`,
                        desc: projData?.description || projData?.desc || '',
                        status: (projData?.status || 'ACTIVE').toUpperCase(),
                        dates: pDatesFormatted,
                        owner: projData?.owner || projData?.createdBy || 'KDT',
                        users: pUsers,
                        tasks: formattedTasks
                    };
                } catch (err) {
                    console.error(`Failed to process project ${projId}:`, err);
                    return null;
                }
            });

            const loadedProjects = (await Promise.all(projectPromises)).filter(Boolean);
            setProjects(loadedProjects);
            setLoadError(false);
        } catch (err) {
            console.error('Failed to fetch user and tasks:', err);
            setProjects([]);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUserAndTasks();
    }, [fetchUserAndTasks]);

    // Switch to Previous Project
    const handlePrevProject = () => {
        setCurrentProjectIndex(prev => (prev > 0 ? prev - 1 : projects.length - 1));
    };

    // Switch to Next Project
    const handleNextProject = () => {
        setCurrentProjectIndex(prev => (prev < projects.length - 1 ? prev + 1 : 0));
    };

    // Interactive Task Action Button: cycle status forward (TODO -> IN_PROGRESS -> COMPLETED)
    const handleTaskAction = (taskToMove) => {
        setProjects(prevProjects => {
            return prevProjects.map((proj, pIdx) => {
                if (pIdx !== currentProjectIndex) return proj;
                const updatedTasks = proj.tasks.map(t => {
                    if (t.id !== taskToMove.id) return t;
                    let nextStatus = t.status;
                    if (t.status === 'TODO') nextStatus = 'IN_PROGRESS';
                    else if (t.status === 'IN_PROGRESS') nextStatus = 'COMPLETED';
                    else if (t.status === 'COMPLETED') nextStatus = 'TODO';
                    else if (t.status === 'CANCELLED') nextStatus = 'TODO';
                    return { ...t, status: nextStatus };
                });
                return { ...proj, tasks: updatedTasks };
            });
        });
    };

    // Handle search and projectId query parameters
    useEffect(() => {
        const projectIdParam = searchParams.get('projectId') || searchParams.get('project');
        if (projectIdParam && projects.length > 0) {
            const matchedIdx = projects.findIndex(p =>
                p.id.toLowerCase() === projectIdParam.toLowerCase() ||
                p.title.toLowerCase() === projectIdParam.toLowerCase()
            );
            if (matchedIdx !== -1) {
                setCurrentProjectIndex(matchedIdx);
            }
        }

        const searchParam = searchParams.get('search');
        if (searchParam) {
            setSearchQuery(searchParam);
            if (!projectIdParam && projects.length > 0) {
                const matchedIdx = projects.findIndex(p =>
                    p.title.toLowerCase().includes(searchParam.toLowerCase()) ||
                    p.id.toLowerCase() === searchParam.toLowerCase()
                );
                if (matchedIdx !== -1) {
                    setCurrentProjectIndex(matchedIdx);
                }
            }
        }
    }, [searchParams, projects]);

    // Fetch global users for Edit Members prompt
    const fetchGlobalUsers = useCallback(async () => {
        setModalConfig(prev => prev.isEditMode ? { ...prev, loading: true } : prev);
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
                setGlobalUsers(formatted);
                setModalConfig(prev => prev.isEditMode ? { ...prev, users: formatted, loading: false } : prev);
            } else {
                const defaultList = [
                    { id: '1', fullname: 'KDT', username: 'KDT', image: '/ProfilePic/KDT.jpg' },
                    { id: '2', fullname: 'Khang nig', username: 'Turtlely', image: '/ProfilePic/Turtlely.jpg' },
                    { id: '3', fullname: 'Ngo Do', username: 'NgoDo', image: '/ProfilePic/NgoDo.jpg' },
                    { id: '4', fullname: 'Eternal DESTROYER', username: 'CodeMaster', image: '/ProfilePic/0.jpg' },
                    { id: '5', fullname: 'USER', username: 'user', image: '/ProfilePic/0.jpg' },
                    { id: '6', fullname: 'dds', username: 'dds', image: '/ProfilePic/dds.jpg' }
                ];
                setGlobalUsers(defaultList);
                setModalConfig(prev => prev.isEditMode ? { ...prev, users: defaultList, loading: false } : prev);
            }
        } catch (err) {
            console.error('Failed to fetch global users in Task.jsx:', err);
            const defaultList = [
                { id: '1', fullname: 'KDT', username: 'KDT', image: '/ProfilePic/KDT.jpg' },
                { id: '2', fullname: 'Khang nig', username: 'Turtlely', image: '/ProfilePic/Turtlely.jpg' },
                { id: '3', fullname: 'Ngo Do', username: 'NgoDo', image: '/ProfilePic/NgoDo.jpg' },
                { id: '4', fullname: 'Eternal DESTROYER', username: 'CodeMaster', image: '/ProfilePic/0.jpg' },
                { id: '5', fullname: 'USER', username: 'user', image: '/ProfilePic/0.jpg' },
                { id: '6', fullname: 'dds', username: 'dds', image: '/ProfilePic/dds.jpg' }
            ];
            setGlobalUsers(defaultList);
            setModalConfig(prev => prev.isEditMode ? { ...prev, users: defaultList, loading: false } : prev);
        } finally {
            setModalConfig(prev => ({ ...prev, loading: false }));
        }
    }, []);

    const handleOpenGlobalMembers = () => {
        setModalConfig({
            isOpen: true,
            title: 'Edit Members',
            users: globalUsers,
            loading: globalUsers.length === 0,
            isEditMode: true
        });
        if (globalUsers.length === 0) {
            fetchGlobalUsers();
        }
    };

    const handleOpenProjectUsers = (users, projectTitle) => {
        setModalConfig({
            isOpen: true,
            title: `${projectTitle || 'Project'} USERS:`,
            users: users || [],
            loading: false,
            isEditMode: false
        });
    };

    const currentProject = projects[currentProjectIndex] || projects[0];

    // Add or remove user from the current project via PUT /api/users/{ID}
    const handleToggleMember = async (user, isCurrentlyInProject) => {
        if (!currentProject || !currentProject.id) return;
        setActionLoadingId(String(user.id));
        try {
            // 1. Get user details from GET /api/users/{ID}
            const userRes = await request.get(`/api/users/${user.id}`);
            const userData = userRes?.data || userRes;
            const existingProjects = (userData && Array.isArray(userData.projects) ? userData.projects : [])
                .map(p => typeof p === 'object' && p !== null ? (p.id || p.projectId) : p);

            let updatedProjects;
            const pIdNum = !isNaN(Number(currentProject.id)) ? Number(currentProject.id) : currentProject.id;

            if (isCurrentlyInProject) {
                // Remove project from user's projects list
                updatedProjects = existingProjects.filter(pId => String(pId) !== String(currentProject.id));
            } else {
                // Append project ID to user's projects list
                if (!existingProjects.some(pId => String(pId) === String(currentProject.id))) {
                    updatedProjects = [...existingProjects, pIdNum];
                } else {
                    updatedProjects = existingProjects;
                }
            }

            // 2. PUT /api/users/{ID} with updated projects list
            await request.put(`/api/users/${user.id}`, {
                projects: updatedProjects
            });

            // 3. Update current project's users in local state
            setProjects(prevProjects => {
                return prevProjects.map(proj => {
                    if (String(proj.id) !== String(currentProject.id)) return proj;
                    let currentUsers = proj.users || [];
                    let newUsers;
                    if (isCurrentlyInProject) {
                        newUsers = currentUsers.filter(u => String(u.id) !== String(user.id));
                    } else {
                        if (!currentUsers.some(u => String(u.id) === String(user.id))) {
                            newUsers = [...currentUsers, user];
                        } else {
                            newUsers = currentUsers;
                        }
                    }
                    return { ...proj, users: newUsers };
                });
            });
        } catch (err) {
            console.error(`Failed to update project membership for user ${user.id}:`, err);
        } finally {
            setActionLoadingId(null);
        }
    };

    const currentProjectUserIds = (currentProject?.users || []).map(u => String(u.id));

    return (
        <div className="tasks-page-wrapper">
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
                <TasksHeader
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                />

                {/* Error State with Centered Reload Button */}
                {loadError ? (
                    <div className="tasks-reload-center-box">
                        <ReloadButton onReload={fetchUserAndTasks} isLoading={loading} />
                    </div>
                ) : loading ? (
                    <div className="tasks-reload-center-box">
                        <ReloadButton onReload={fetchUserAndTasks} isLoading={true} />
                    </div>
                ) : (
                    <React.Fragment>
                        {/* 4 Status Column Cards with Sideways Scrollbar & Vertical Scrollbars */}
                        <KanbanBoard
                            currentProject={currentProject}
                            searchQuery={searchQuery}
                            onTaskAction={handleTaskAction}
                        />

                        {/* Current Project Card & Switch Buttons */}
                        <CurrentProjectSection
                            currentProject={currentProject}
                            onPrevProject={handlePrevProject}
                            onNextProject={handleNextProject}
                            onOpenProjectUsers={handleOpenProjectUsers}
                        />

                        {/* Bottom Action Footer */}
                        <NewTaskFooter
                            onOpenMembers={handleOpenGlobalMembers}
                        />

                        {/* Users Prompt Modal (Global Edit Mode or Project Involved Users View) */}
                        <GlobalUsersModal
                            isOpen={modalConfig.isOpen}
                            onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                            users={modalConfig.users}
                            loading={modalConfig.loading}
                            title={modalConfig.title}
                            projectUserIds={currentProjectUserIds}
                            isEditMode={modalConfig.isEditMode}
                            onToggleMember={handleToggleMember}
                            actionLoadingId={actionLoadingId}
                        />
                    </React.Fragment>
                )}
            </div>
        </div>
    );
}

export default Task;
