import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './Projects.css';
import NavBar from './NavBar';
import request from './api/Request';
import { getProjectStatusClass, getUserAvatarUrl } from './utils';

// Section Reload Button Component matching the reload icon design
function ReloadButton({ onReload, isLoading }) {
    return (
        <button
            type="button"
            className={`section-reload-btn ${isLoading ? 'loading' : ''}`}
            onClick={onReload}
            title="Reload projects"
            aria-label="Reload projects"
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

// Header Section (Title & Search Bar)
function ProjectsHeader({ searchQuery, onSearchChange }) {
    return (
        <div className="projects-header-row">
            <h1 className="page-title">My Great Projects</h1>
            <div className="search-container projects-search">
                <svg className="search-icon" viewBox="0 0 24 24" width="14" height="14" fill="#999">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
                <input
                    type="text"
                    className="top-search-input"
                    id="projectSearchInput"
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
        </div>
    );
}

// Single Project Card Component
function ProjectCard({ project }) {
    const statusClass = getProjectStatusClass(project.status);

    return (
        <div className={`project-card ${statusClass}`}>
            <div className="project-info">
                <h2 className="project-title">
                    {project.title} <span className="project-id">(id:{project.id})</span>
                </h2>
                <p className="project-desc">{project.desc}</p>
            </div>
            <div className="project-status-box">
                <div className="status-text">Status: {project.status}</div>
                <div className="project-dates">{project.dates}</div>
            </div>
            <Link
                to={`/tasks?projectId=${encodeURIComponent(project.id)}`}
                className="btn-tasks"
            >
                Tasks
            </Link>
        </div>
    );
}

// Projects List Container Component
function ProjectsList({ projects, searchQuery, error, loading, onReload }) {
    if (error) {
        return (
            <div className="projects-outer-card">
                <div className="projects-reload-center-box">
                    <ReloadButton onReload={onReload} isLoading={loading} />
                </div>
            </div>
        );
    }

    const query = (searchQuery || '').toLowerCase().trim();

    const filteredProjects = (projects || []).filter(project => {
        if (!query) return true;
        const fullText = `${project.title} ${project.id} ${project.desc} ${project.status} ${project.dates}`.toLowerCase();
        return fullText.includes(query);
    });

    return (
        <div className="projects-outer-card">
            <div className="projects-scroll-wrapper">
                {filteredProjects.length > 0 ? (
                    filteredProjects.map(project => (
                        <ProjectCard key={project.id} project={project} />
                    ))
                ) : (
                    <p style={{ color: '#888888', textAlign: 'center', padding: '30px 0' }}>
                        No projects found.
                    </p>
                )}
            </div>
        </div>
    );
}

// Footer Section
function NewProjectFooter() {
    return (
        <div className="new-project-row">
            <span className="new-project-label">New project?</span>
            <Link to="/create-project" className="btn-create-project">
                Create new project
            </Link>
        </div>
    );
}

// Main Projects Component
function Projects() {
    const [searchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

    // Current logged in user
    const [currentUser, setCurrentUser] = useState({
        id: "?",
        fullname: "?",
        username: "?",
        image: "/ProfilePic/0.jpg"
    });

    // Projects state & error
    const [projects, setProjects] = useState([]);
    const [projectsError, setProjectsError] = useState(false);
    const [projectsLoading, setProjectsLoading] = useState(false);

    // Fetch logged-in user profile & their assigned projects via GET /api/users/{ID}
    const fetchUserAndProjects = useCallback(async () => {
        setProjectsLoading(true);
        setProjectsError(false);
        try {
            // 1. Fetch current logged-in user info from /api/auth/me
            let userId = "?";
            let uname = "?";
            try {
                const authData = await request.get('/api/auth/me');
                if (authData) {
                    userId = String(authData.id || "?");
                    uname = authData.username || "?";
                    setCurrentUser({
                        id: userId,
                        fullname: authData.full_name || authData.fullName || authData.fullname || authData.name || uname,
                        username: uname,
                        image: authData.image || (uname !== '?' ? getUserAvatarUrl(uname) : '/ProfilePic/0.jpg'),
                    });
                }
            } catch (authErr) {
                console.error('Failed to fetch current user (/api/auth/me):', authErr);
            }

            // 2. Fetch logged-in user details to get project ID list via GET /api/users/{ID}
            const userRes = await request.get(`/api/users/${userId}`);
            const userData = userRes?.data || userRes;

            if (userData && Array.isArray(userData.projects) && userData.projects.length > 0) {
                // 3. For each project ID in the list, fetch project details via GET /api/projects/{ID}
                const projectPromises = userData.projects.map(async (item) => {
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
                                desc: p.description || p.desc || `Project details for @${uname}`,
                                status: (p.status || 'ACTIVE').toUpperCase(),
                                dates: datesFormatted
                            };
                        }
                    } catch (projErr) {
                        console.error(`Failed to fetch project ${projId} (/api/projects/${projId}):`, projErr);
                        return {
                            id: String(projId),
                            title: typeof item === 'string' ? item : `Project ${projId}`,
                            desc: `Project assignment for @${uname}`,
                            status: "ACTIVE",
                            dates: ""
                        };
                    }
                    return null;
                });

                const projectResults = await Promise.all(projectPromises);
                setProjects(projectResults.filter(Boolean));
                setProjectsError(false);
            } else if (userData && Array.isArray(userData.projects) && userData.projects.length === 0) {
                setProjects([]);
                setProjectsError(false);
            } else {
                // If user data format is unexpected
                setProjects([]);
                setProjectsError(false);
            }
        } catch (err) {
            console.error('Failed to load user projects:', err);
            setProjects([]);
            setProjectsError(true);
        } finally {
            setProjectsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUserAndProjects();
    }, [fetchUserAndProjects]);

    // Synchronize query parameter if changed in URL
    useEffect(() => {
        const query = searchParams.get('search');
        if (query !== null) {
            setSearchQuery(query);
        }
    }, [searchParams]);

    return (
        <div className="projects-page-wrapper">
            {/* Top Navigation Bar Component */}
            <div id="navbar-root">
                <NavBar userId={currentUser.id} fullName={currentUser.fullname} userName={currentUser.username} userImg={currentUser.image} />
            </div>

            {/* Page Container */}
            <div className="page-container">
                <ProjectsHeader
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                />

                <ProjectsList
                    projects={projects}
                    searchQuery={searchQuery}
                    error={projectsError}
                    loading={projectsLoading}
                    onReload={fetchUserAndProjects}
                />

                <NewProjectFooter />
            </div>
        </div>
    );
}

export default Projects;
