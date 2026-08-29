import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';
import NavBar from './NavBar';
import request from './api/Request';
import { getProjectStatusClass, getTaskPriorityClass, getPriorityTagClass, getUserAvatarUrl } from './utils';

// Section Reload Button Component matching the reload icon design
function ReloadButton({ onReload, isLoading }) {
    return (
        <button
            type="button"
            className={`section-reload-btn ${isLoading ? 'loading' : ''}`}
            onClick={onReload}
            title="Reload section"
            aria-label="Reload section"
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

// Users Row Component
function UsersSection({ users, error, loading, onReload }) {
    return (
        <div className="home-section-block">
            <div className="section-header-row">
                <Link to="/users" className="section-title-link">Users:</Link>
                {!error && users.length > 0 && (
                    <Link to="/users" className="see-all-link">See All &rarr;</Link>
                )}
            </div>

            {error ? (
                <ReloadButton onReload={onReload} isLoading={loading} />
            ) : (
                users.length > 0 && (
                    <div className="users-horizontal-row">
                        {users.map(user => (
                            <Link key={user.id} to={`/profile/${user.id}`} className="user-item-col">
                                <img
                                    src={user.image || getUserAvatarUrl(user.username)}
                                    alt={user.name}
                                    className="user-avatar-circle"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = '/ProfilePic/0.jpg';
                                    }}
                                />
                                <span className="user-display-name">{user.name}</span>
                            </Link>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}

// Tasks Grid Component
function TasksSection({ tasks, error, loading, onReload }) {
    // Filter out cancelled tasks
    const activeTasks = (tasks || []).filter(task => !(task.status && task.status.toUpperCase().includes('CANCEL')));

    return (
        <div className="home-section-block" id="tasks">
            <div className="section-header-row">
                <Link to="/tasks" className="section-title-link">Continue &rarr;</Link>
            </div>

            {error ? (
                <ReloadButton onReload={onReload} isLoading={loading} />
            ) : (
                activeTasks.length > 0 && (
                    <div className="tasks-home-grid">
                        {activeTasks.map(task => {
                            const priorityClass = getTaskPriorityClass(task.priority);
                            const tagClass = getPriorityTagClass(task.priority);

                            return (
                                <Link
                                    key={task.id}
                                    to={`/tasks?search=${encodeURIComponent(task.title)}`}
                                    className={`task-home-card ${priorityClass}`}
                                >
                                    <div>
                                        <div className="task-card-header">
                                            <div className="task-home-title">
                                                {task.title}
                                                <span className={`task-priority-tag ${tagClass}`}>{task.priority}</span>
                                            </div>
                                            <div className="task-assigner">
                                                Assigner: <span className="task-assigner-name">{task.assigner}</span>
                                            </div>
                                        </div>
                                        <div className="task-home-desc">{task.desc}</div>
                                    </div>
                                    <div className="task-home-footer">
                                        <span className="status-text">Status: {task.status}</span>
                                        <span className="task-dates">{task.dates}</span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )
            )}
        </div>
    );
}

// Projects Grid Component
function ProjectsSection({ projects, error, loading, onReload }) {
    return (
        <div className="home-section-block">
            <div className="section-header-row">
                <Link to="/projects" className="section-title-link">Projects &rarr;</Link>
            </div>

            {error ? (
                <ReloadButton onReload={onReload} isLoading={loading} />
            ) : (
                projects && projects.length > 0 && (
                    <div className="projects-home-grid">
                        {projects.map(project => {
                            const statusClass = getProjectStatusClass(project.status);

                            return (
                                <Link
                                    key={project.id}
                                    to="/projects"
                                    className={`project-home-card ${statusClass}`}
                                >
                                    <div>
                                        <div className="project-home-title">
                                            {project.title} <span className="project-home-id">(id:{project.id})</span>
                                        </div>
                                        <div className="project-home-desc">{project.desc}</div>
                                    </div>
                                    <div className="project-home-footer">
                                        <span className="status-text">Status: {project.status}</span>
                                        <span className="project-dates">{project.dates}</span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )
            )}
        </div>
    );
}

// Main Home Component
function Home() {
    // Current user data
    const [currentUser, setCurrentUser] = useState({
        id: "?",
        fullname: "?",
        username: "?",
        image: "/ProfilePic/0.jpg"
    });

    // Users data & error state
    const [users, setUsers] = useState([]);
    const [usersError, setUsersError] = useState(false);
    const [usersLoading, setUsersLoading] = useState(false);

    // Tasks data & error state
    const [tasks, setTasks] = useState([]);
    const [tasksError, setTasksError] = useState(false);
    const [tasksLoading, setTasksLoading] = useState(false);

    // Projects data & error state
    const [projects, setProjects] = useState([]);
    const [projectsError, setProjectsError] = useState(false);
    const [projectsLoading, setProjectsLoading] = useState(false);

    // 1. Fetch current user from /api/auth/me
    const fetchCurrentUser = useCallback(async () => {
        try {
            const data = await request.get('/api/auth/me');
            if (data) {
                const uname = data.username || "?";
                setCurrentUser((prev) => ({
                    ...prev,
                    id: String(data.id || prev.id || "?"),
                    fullname: data.full_name || data.fullName || data.fullname || data.name || prev.fullname,
                    username: uname,
                    image: data.image || (uname !== '?' ? getUserAvatarUrl(uname) : '/ProfilePic/0.jpg'),
                }));
            }
        } catch (err) {
            console.error('Failed to fetch current user (/api/auth/me):', err);
        }
    }, []);

    // 2. Fetch users from /api/users
    const fetchUsers = useCallback(async () => {
        setUsersLoading(true);
        try {
            const data = await request.get('/api/users');
            const userList = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : null);
            if (userList) {
                setUsers(userList.map(u => ({
                    id: String(u.id || u._id || Math.random()),
                    username: u.username || '',
                    name: u.full_name || u.fullName || u.fullname || u.name || u.username || 'User',
                    image: u.image || getUserAvatarUrl(u.username),
                })));
                setUsersError(false);
            } else {
                setUsers([]);
                setUsersError(true);
            }
        } catch (err) {
            console.error('Failed to fetch users (/api/users):', err);
            setUsers([]);
            setUsersError(true);
        } finally {
            setUsersLoading(false);
        }
    }, []);

    // 3. Fetch tasks for current logged-in user via GET /api/users/{ID} -> GET /api/projects/{ID}/tasks
    const fetchTasks = useCallback(async () => {
        setTasksLoading(true);
        setTasksError(false);
        try {
            // Priority ordering dictionary
            const priorityOrder = {
                'URGENT': 0,
                'HIGH': 1,
                'MEDIUM': 2,
                'LOW': 3
            };

            // 1. Get logged-in user ID
            let userId = currentUser.id || "1";
            try {
                const authData = await request.get('/api/auth/me');
                if (authData && authData.id) {
                    userId = String(authData.id);
                }
            } catch (authErr) {
                console.error('Failed to fetch auth me in fetchTasks:', authErr);
            }

            // 2. Call GET /api/users/{ID} to get user's project IDs
            const userRes = await request.get(`/api/users/${userId}`);
            const userData = userRes?.data || userRes;
            const projectIds = userData && Array.isArray(userData.projects) ? userData.projects : [];

            let allTasks = [];

            if (projectIds.length > 0) {
                // 3. For each project ID, fetch tasks via GET /api/projects/{ID}/tasks
                const taskPromises = projectIds.map(async (item) => {
                    const projId = typeof item === 'object' && item !== null ? (item.id || item.projectId) : item;
                    if (!projId) return [];

                    try {
                        const taskRes = await request.get(`/api/projects/${projId}/tasks`);
                        const taskList = Array.isArray(taskRes) ? taskRes : (taskRes && Array.isArray(taskRes.data) ? taskRes.data : []);
                        return taskList.map(t => {
                            const datesFormatted = t.dates || (t.start_date && t.end_date
                                ? `${t.start_date} - ${t.end_date}`
                                : (t.startDate && t.endDate
                                    ? `${t.startDate} - ${t.endDate}`
                                    : (t.dates || '')));

                            return {
                                id: String(t.id || t._id || Math.random()),
                                title: t.title || t.name || 'Task',
                                priority: (t.priority || 'MEDIUM').toUpperCase(),
                                assigner: t.assigner || t.assignee || t.createdBy || t.assignedTo || 'KDT',
                                desc: t.desc || t.description || '',
                                status: (t.status || 'TODO').toUpperCase(),
                                dates: datesFormatted
                            };
                        });
                    } catch (taskErr) {
                        console.error(`Failed to fetch tasks for project ${projId} (/api/projects/${projId}/tasks):`, taskErr);
                        return [];
                    }
                });

                const taskResults = await Promise.all(taskPromises);
                allTasks = taskResults.flat();
            }

            // 4. Sort tasks by priority: URGENT, HIGH, MEDIUM, LOW
            allTasks.sort((a, b) => {
                const pA = priorityOrder[(a.priority || '').toUpperCase()] ?? 4;
                const pB = priorityOrder[(b.priority || '').toUpperCase()] ?? 4;
                return pA - pB;
            });

            setTasks(allTasks);
            setTasksError(false);
        } catch (err) {
            console.error('Failed to fetch user tasks:', err);
            setTasks([]);
            setTasksError(true);
        } finally {
            setTasksLoading(false);
        }
    }, [currentUser.id]);

    // 4. Fetch projects for current logged-in user via GET /api/users/{ID} -> GET /api/projects/{ID}
    const fetchProjects = useCallback(async () => {
        setProjectsLoading(true);
        setProjectsError(false);
        try {
            // Status ordering dictionary: ACTIVE, ON_HOLD, PLANNING, COMPLETED, ARCHIVED
            const statusOrder = {
                'ACTIVE': 0,
                'ON_HOLD': 1,
                'ON HOLD': 1,
                'IN_PROGRESS': 1,
                'PLANNING': 2,
                'COMPLETED': 3,
                'ARCHIVED': 4
            };

            // 1. Get logged-in user ID
            let userId = currentUser.id || "1";
            try {
                const authData = await request.get('/api/auth/me');
                if (authData && authData.id) {
                    userId = String(authData.id);
                }
            } catch (authErr) {
                console.error('Failed to fetch auth me in fetchProjects:', authErr);
            }

            // 2. Call GET /api/users/{ID} to get user's project IDs
            const userRes = await request.get(`/api/users/${userId}`);
            const userData = userRes?.data || userRes;
            const projectIds = userData && Array.isArray(userData.projects) ? userData.projects : [];

            let allProjects = [];

            if (projectIds.length > 0) {
                // 3. For each project ID, fetch details via GET /api/projects/{ID}
                const projectPromises = projectIds.map(async (item) => {
                    if (typeof item === 'object' && item !== null && item.title) {
                        return item;
                    }

                    const projId = typeof item === 'object' && item !== null ? (item.id || item.projectId) : item;
                    if (!projId) return null;

                    try {
                        const projRes = await request.get(`/api/projects/${projId}`);
                        const p = projRes?.data || projRes;
                        if (p) {
                            const datesFormatted = p.dates || (p.start_date && p.end_date
                                ? `${p.start_date} - ${p.end_date}`
                                : (p.startDate && p.endDate
                                    ? `${p.startDate} - ${p.endDate}`
                                    : ''));

                            return {
                                id: String(p.id || projId),
                                title: p.title || p.name || `Project ${projId}`,
                                desc: p.description || p.desc || '',
                                status: (p.status || 'ACTIVE').toUpperCase(),
                                dates: datesFormatted
                            };
                        }
                    } catch (projErr) {
                        console.error(`Failed to fetch project ${projId} (/api/projects/${projId}):`, projErr);
                        return {
                            id: String(projId),
                            title: typeof item === 'string' ? item : `Project ${projId}`,
                            desc: '',
                            status: 'ACTIVE',
                            dates: ''
                        };
                    }
                    return null;
                });

                const projectResults = await Promise.all(projectPromises);
                allProjects = projectResults.filter(Boolean);
            }

            // 4. Sort projects by status: ACTIVE, ON_HOLD, PLANNING, COMPLETED, ARCHIVED
            allProjects.sort((a, b) => {
                const sA = statusOrder[(a.status || '').toUpperCase()] ?? 5;
                const sB = statusOrder[(b.status || '').toUpperCase()] ?? 5;
                return sA - sB;
            });

            // 5. Display only 6 of them (3 on each row)
            setProjects(allProjects.slice(0, 6));
            setProjectsError(false);
        } catch (err) {
            console.error('Failed to fetch user projects:', err);
            setProjects([]);
            setProjectsError(true);
        } finally {
            setProjectsLoading(false);
        }
    }, [currentUser.id]);

    useEffect(() => {
        fetchCurrentUser();
        fetchUsers();
        fetchTasks();
        fetchProjects();
    }, [fetchCurrentUser, fetchUsers, fetchTasks, fetchProjects]);

    return (
        <div className="home-page-wrapper">
            {/* Top Navigation Bar Component */}
            <div id="navbar-root">
                <NavBar userId={currentUser.id} fullName={currentUser.fullname} userName={currentUser.username} userImg={currentUser.image} />
            </div>

            {/* Page Content Container */}
            <div className="page-container">
                <h1 className="page-title">Home</h1>

                <div className="home-main-card">
                    <UsersSection
                        users={users}
                        error={usersError}
                        loading={usersLoading}
                        onReload={fetchUsers}
                    />
                    <TasksSection
                        tasks={tasks}
                        error={tasksError}
                        loading={tasksLoading}
                        onReload={fetchTasks}
                    />
                    <ProjectsSection
                        projects={projects}
                        error={projectsError}
                        loading={projectsLoading}
                        onReload={fetchProjects}
                    />
                </div>
            </div>
        </div>
    );
}

export default Home;
