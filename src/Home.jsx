import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';
import NavBar from './NavBar';
import request from './api/Request';
import { getProjectStatusClass, getTaskPriorityClass, getPriorityTagClass, resolveUserAvatar } from './utils';
import { useTheme } from './useTheme';
import { useCurrentUser, DEFAULT_AVATAR_URL } from './useCurrentUser';
import { HomeUsersSkeleton, HomeTasksSkeleton, HomeProjectsSkeleton } from './HomeSkeleton';
import ReloadButton, { useReloadTimeout } from './ReloadButton';

// Users Row Component
function UsersSection({ users, error, loading, onReload }) {
    const { showReload, isReloading, handleReload } = useReloadTimeout({
        loading,
        error,
        hasData: users.length > 0,
        onReload
    });

    return (
        <div className="home-section-block">
            <div className="section-header-row">
                <Link to="/users" className="section-title-link">Users:</Link>
                {!showReload && users.length > 0 && (
                    <Link to="/users" className="see-all-link">See All &rarr;</Link>
                )}
            </div>

            {showReload ? (
                <div className="home-reload-center-box home-reload-users">
                    <ReloadButton onReload={handleReload} isLoading={isReloading} title="Reload users" />
                </div>
            ) : loading && users.length === 0 ? (
                <HomeUsersSkeleton count={10} />
            ) : (
                users.length > 0 && (
                    <div className="users-horizontal-row">
                        {users.map(user => (
                            <Link key={user.id} to={`/profile/${user.id}`} className="user-item-col">
                                <img
                                    src={resolveUserAvatar(user)}
                                    alt={user.name}
                                    className="user-avatar-circle"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = DEFAULT_AVATAR_URL;
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
    // Filter out cancelled tasks and only show up to 6 tasks
    const activeTasks = (tasks || [])
        .filter(task => !(task.status && task.status.toUpperCase().includes('CANCEL')))
        .slice(0, 6);

    const { showReload, isReloading, handleReload } = useReloadTimeout({
        loading,
        error,
        hasData: activeTasks.length > 0,
        onReload
    });

    return (
        <div className="home-section-block" id="tasks">
            <div className="section-header-row">
                <Link to="/tasks" className="section-title-link">Continue &rarr;</Link>
            </div>

            {showReload ? (
                <div className="home-reload-center-box home-reload-tasks">
                    <ReloadButton onReload={handleReload} isLoading={isReloading} title="Reload tasks" />
                </div>
            ) : loading && activeTasks.length === 0 ? (
                <HomeTasksSkeleton count={6} />
            ) : (
                activeTasks.length > 0 && (
                    <div className="tasks-home-grid">
                        {activeTasks.map(task => {
                            const priorityClass = getTaskPriorityClass(task.priority);
                            const tagClass = getPriorityTagClass(task.priority);

                            return (
                                <Link
                                    key={task.id}
                                    to={task.projectId ? `/tasks?projectId=${encodeURIComponent(task.projectId)}` : '/tasks'}
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
    const { showReload, isReloading, handleReload } = useReloadTimeout({
        loading,
        error,
        hasData: Boolean(projects && projects.length > 0),
        onReload
    });

    return (
        <div className="home-section-block">
            <div className="section-header-row">
                <Link to="/projects" className="section-title-link">Projects &rarr;</Link>
            </div>

            {showReload ? (
                <div className="home-reload-center-box home-reload-projects">
                    <ReloadButton onReload={handleReload} isLoading={isReloading} title="Reload projects" />
                </div>
            ) : loading && (!projects || projects.length === 0) ? (
                <HomeProjectsSkeleton count={6} />
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
    const { isDark } = useTheme();
    const { currentUser, isLoading: authLoading, refetch: refetchCurrentUser } = useCurrentUser();
    const targetUserId = !authLoading
        ? (currentUser?.id && currentUser.id !== '?' ? String(currentUser.id) : '1')
        : null;

    // Users data & error state
    const [users, setUsers] = useState([]);
    const [usersError, setUsersError] = useState(false);
    const [usersLoading, setUsersLoading] = useState(true);

    // Tasks data & error state
    const [tasks, setTasks] = useState([]);
    const [tasksError, setTasksError] = useState(false);
    const [tasksLoading, setTasksLoading] = useState(true);

    // Projects data & error state
    const [projects, setProjects] = useState([]);
    const [projectsError, setProjectsError] = useState(false);
    const [projectsLoading, setProjectsLoading] = useState(true);

    // 2. Fetch users from /api/users
    const fetchUsers = useCallback(async () => {
        setUsersLoading(true);
        setUsersError(false);
        try {
            const data = await request.get('/api/users');
            const userList = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : null);
            if (userList) {
                setUsers(userList.map(u => ({
                    id: String(u.id || u._id || Math.random()),
                    username: u.username || '',
                    name: u.full_name || u.fullName || u.fullname || u.name || u.username || 'User',
                    image: resolveUserAvatar(u),
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
        if (!targetUserId) return;
        setTasksLoading(true);
        setTasksError(false);
        try {
            // Priority ordering dictionary: URGENT > HIGH > MEDIUM > LOW
            const priorityOrder = {
                'URGENT': 0,
                'HIGH': 1,
                'MEDIUM': 2,
                'LOW': 3
            };

            // Status ordering dictionary: TODO > IN_PROGRESS > DONE > CANCELLED
            const statusOrder = {
                'TODO': 0,
                'TO_DO': 0,
                'IN_PROGRESS': 1,
                'IN PROGRESS': 1,
                'DOING': 1,
                'DONE': 2,
                'COMPLETED': 2,
                'CANCELLED': 3,
                'CANCELED': 3
            };

            // 1. Call GET /api/users/{ID} to get user's project IDs
            const userRes = await request.get(`/api/users/${targetUserId}`);
            const userData = userRes?.data || userRes;
            const projectIds = userData && Array.isArray(userData.projects) ? userData.projects : [];

            let allTasks = [];

            if (projectIds.length > 0) {
                let failedCount = 0;
                const validIds = projectIds
                    .map(item => (typeof item === 'object' && item !== null ? (item.id || item.projectId) : item))
                    .filter(Boolean);

                // 2. For each project ID, fetch tasks via GET /api/projects/{ID}/tasks
                const taskPromises = validIds.map(async (projId) => {
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
                                assigner: t.assigner || t.assignee || t.createdBy || t.assignedTo || 'No one',
                                desc: t.desc || t.description || '',
                                status: (t.status || 'TODO').toUpperCase(),
                                dates: datesFormatted,
                                projectId: String(t.projectId || t.project_id || projId || '')
                            };
                        });
                    } catch (taskErr) {
                        failedCount += 1;
                        console.error(`Failed to fetch tasks for project ${projId} (/api/projects/${projId}/tasks):`, taskErr);
                        return [];
                    }
                });

                const taskResults = await Promise.all(taskPromises);
                if (validIds.length > 0 && failedCount === validIds.length) {
                    throw new Error('All project task requests failed');
                }
                allTasks = taskResults.flat();
            }

            // 3. Sort tasks: 1st by priority (URGENT > HIGH > MEDIUM > LOW), 2nd by completion status (TODO > IN_PROGRESS > DONE > CANCELLED)
            allTasks.sort((a, b) => {
                const pA = priorityOrder[(a.priority || '').toUpperCase()] ?? 4;
                const pB = priorityOrder[(b.priority || '').toUpperCase()] ?? 4;
                if (pA !== pB) {
                    return pA - pB;
                }

                const sA = statusOrder[(a.status || '').toUpperCase()] ?? 4;
                const sB = statusOrder[(b.status || '').toUpperCase()] ?? 4;
                return sA - sB;
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
    }, [targetUserId]);

    // 4. Fetch projects for current logged-in user via GET /api/users/{ID} -> GET /api/projects/{ID}
    const fetchProjects = useCallback(async () => {
        if (!targetUserId) return;
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

            // 1. Call GET /api/users/{ID} to get user's project IDs
            const userRes = await request.get(`/api/users/${targetUserId}`);
            const userData = userRes?.data || userRes;
            const projectIds = userData && Array.isArray(userData.projects) ? userData.projects : [];

            let allProjects = [];

            if (projectIds.length > 0) {
                let failedCount = 0;

                // 2. For each project ID, fetch details via GET /api/projects/{ID}
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
                        failedCount += 1;
                        console.error(`Failed to fetch project ${projId} (/api/projects/${projId}):`, projErr);
                        return null;
                    }
                    return null;
                });

                const projectResults = await Promise.all(projectPromises);
                allProjects = projectResults.filter(Boolean);

                if (allProjects.length === 0 && failedCount > 0) {
                    throw new Error('All project detail requests failed');
                }
            }

            // 3. Sort projects by status: ACTIVE, ON_HOLD, PLANNING, COMPLETED, ARCHIVED
            allProjects.sort((a, b) => {
                const sA = statusOrder[(a.status || '').toUpperCase()] ?? 5;
                const sB = statusOrder[(b.status || '').toUpperCase()] ?? 5;
                return sA - sB;
            });

            // 4. Display only 6 of them (3 on each row)
            setProjects(allProjects.slice(0, 6));
            setProjectsError(false);
        } catch (err) {
            console.error('Failed to fetch user projects:', err);
            setProjects([]);
            setProjectsError(true);
        } finally {
            setProjectsLoading(false);
        }
    }, [targetUserId]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        if (!targetUserId) return;
        fetchTasks();
        fetchProjects();
    }, [targetUserId, fetchTasks, fetchProjects]);

    const handleReloadTasks = useCallback(async () => {
        if (!targetUserId) {
            await refetchCurrentUser();
            return;
        }
        return fetchTasks();
    }, [targetUserId, refetchCurrentUser, fetchTasks]);

    const handleReloadProjects = useCallback(async () => {
        if (!targetUserId) {
            await refetchCurrentUser();
            return;
        }
        return fetchProjects();
    }, [targetUserId, refetchCurrentUser, fetchProjects]);

    return (
        <div className={`home-page-wrapper${isDark ? ' dark-mode' : ''}`}>
            {/* Top Navigation Bar Component */}
            <div id="navbar-root">
                <NavBar userId={currentUser.id} fullName={currentUser.fullname} userName={currentUser.username} userImg={currentUser.image} theme={isDark ? 'dark' : 'light'} />
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
                        onReload={handleReloadTasks}
                    />
                    <ProjectsSection
                        projects={projects}
                        error={projectsError}
                        loading={projectsLoading}
                        onReload={handleReloadProjects}
                    />
                </div>
            </div>
        </div>
    );
}

export default Home;
