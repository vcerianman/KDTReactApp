import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import './Profile.css';
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
            title="Reload profile"
            aria-label="Reload profile"
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

// Profile Header (Avatar, Names, Role, Actions, Options)
function ProfileHeader({ profile, onOpenStats }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('click', handleOutsideClick);
        return () => {
            document.removeEventListener('click', handleOutsideClick);
        };
    }, []);

    const avatarSrc = profile.image || getUserAvatarUrl(profile.username_viewing);

    return (
        <div className="profile-header-card">
            {/* Three dots options menu */}
            <div className="options-menu" ref={menuRef}>
                <button
                    className="dots-btn"
                    id="profileOptionsBtn"
                    title="Options"
                    aria-label="Options"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(prev => !prev);
                    }}
                >
                    <span className="dot-square"></span>
                    <span className="dot-square"></span>
                    <span className="dot-square"></span>
                </button>
                <div className={`options-dropdown-menu ${isMenuOpen ? 'show' : ''}`} id="profileOptionsMenu">
                    <button
                        type="button"
                        className="options-menu-item"
                        id="btnOpenStats"
                        onClick={() => {
                            setIsMenuOpen(false);
                            onOpenStats();
                        }}
                    >
                        Statistics
                    </button>
                    <a href="Report.html" className="options-menu-item">Report</a>
                </div>
            </div>

            {/* Avatar */}
            <div className="avatar-box">
                <img
                    src={avatarSrc}
                    alt={profile.fullname_viewing}
                    className="avatar-img"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/ProfilePic/0.jpg';
                    }}
                />
            </div>

            {/* Details */}
            <div className="profile-info">
                <h1 className="fullname">{profile.fullname_viewing}</h1>
                <div className="username">@{profile.username_viewing}</div>
                <div className="user-role">{profile.role}</div>

                <div className="profile-bottom-row">
                    <div className="user-status">{profile.status}</div>
                    <div className="header-buttons">
                        <a href="CreateProject.html" className="btn-action">Create Project</a>
                        <a href="CreateTasks.html" className="btn-action">Assign Task</a>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Tab Navigation Bar
function ProfileTabs({ activeTab, onSelectTab }) {
    return (
        <div className="tab-bar">
            <button
                type="button"
                className={`tab-item ${activeTab === 'about' ? 'active' : ''}`}
                id="tabAboutBtn"
                onClick={() => onSelectTab('about')}
            >
                About
            </button>
            <button
                type="button"
                className={`tab-item ${activeTab === 'projects' ? 'active' : ''}`}
                id="tabProjectsBtn"
                onClick={() => onSelectTab('projects')}
            >
                Projects
            </button>
        </div>
    );
}

// About Tab (Strengths, Contacts, Video)
function AboutTab({ profile }) {
    const strengths = profile.about?.strengths || [];
    const email = profile.contacts?.email || '';
    const videoUrl = profile.about?.videoUrl || '';

    return (
        <div id="profileTabAbout" className="profile-tab-panel">
            {/* Card 1: Main Strengths */}
            <div className="content-card">
                <h2 className="card-header">About me:</h2>
                {strengths.length > 0 ? (
                    <ul className="strengths-list">
                        {strengths.map((strength, index) => (
                            <li key={index}>{strength}</li>
                        ))}
                    </ul>
                ) : (
                    <p style={{ color: '#888888', fontSize: '14px' }}>No about details provided.</p>
                )}
            </div>

            {/* Card 2: Contact Info */}
            <div className="content-card">
                <div className="contact-header-row">
                    <h2 className="card-header" style={{ marginBottom: 0 }}>Contact Info:</h2>
                    <a href="Contact.html" className="btn-contact-small">Contact</a>
                </div>
                <p className="contact-text">Email: {email || 'Not specified'}</p>
            </div>

            {/* Card 3: Video about me */}
            {videoUrl && (
                <div className="content-card">
                    <h2 className="card-header">Video about me:</h2>
                    <div className="video-container">
                        <video width="320" height="240" controls loop muted>
                            <source src={videoUrl} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                </div>
            )}
        </div>
    );
}

// Single Project Card
function ProjectCard({ project }) {
    const statusClass = getProjectStatusClass(project.status);

    return (
        <div className={`project-card ${statusClass}`}>
            <div className="project-info">
                <h3 className="project-title">
                    {project.title} <span className="project-id">(id:{project.id})</span>
                </h3>
                <p className="project-desc">{project.desc}</p>
            </div>
            <div className="project-status-box">
                <div className="status-text">Status: {project.status}</div>
                <div className="project-dates">{project.dates}</div>
            </div>
        </div>
    );
}

// Projects Tab Panel Component
function ProjectsTab({ projects }) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredProjects = (projects || []).filter(project => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        const fullText = `${project.title} ${project.id} ${project.desc} ${project.status} ${project.dates}`.toLowerCase();
        return fullText.includes(query);
    });

    return (
        <div id="profileTabProjects" className="profile-tab-panel">
            <div className="profile-projects-card">
                {/* Projects Header Row */}
                <div className="profile-projects-header">
                    <h2 className="card-header" style={{ marginBottom: 0 }}>Projects</h2>
                    <div className="search-container profile-projects-search">
                        <svg className="search-icon" viewBox="0 0 24 24" width="14" height="14" fill="#999">
                            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                        </svg>
                        <input
                            type="text"
                            className="top-search-input"
                            id="profileProjectSearchInput"
                            placeholder="Search projects..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Scrollable Inner Wrapper */}
                <div className="profile-projects-scroll-wrapper">
                    {filteredProjects.length > 0 ? (
                        filteredProjects.map(project => (
                            <ProjectCard key={project.id} project={project} />
                        ))
                    ) : (
                        <p style={{ color: '#888888', textAlign: 'center', padding: '20px 0' }}>
                            No projects found.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

// Statistics Modal Component
function StatsModal({ isOpen, onClose, stats }) {
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

    return (
        <div
            className={`modal-overlay ${isOpen ? 'show' : ''}`}
            id="statsModalOverlay"
            onClick={(e) => {
                if (e.target.id === 'statsModalOverlay') {
                    onClose();
                }
            }}
        >
            <div className="stats-modal-card" id="statsModalCard">
                <div className="stats-modal-header">
                    <h3 className="stats-modal-title">Statistics</h3>
                    <button
                        className="stats-modal-close"
                        id="closeStatsModalBtn"
                        title="Close"
                        aria-label="Close"
                        onClick={onClose}
                    >
                        &times;
                    </button>
                </div>
                <div className="stats-modal-body">
                    <div className="stats-item">Date joined: {stats?.dateJoined || 'N/A'}</div>
                    <div className="stats-item">Status: {stats?.accountStatus || 'ACTIVE'}</div>
                    <div className="stats-item">Role: {stats?.accountRole || 'MEMBER'}</div>
                </div>
            </div>
        </div>
    );
}

// Main Profile Component
function Profile() {
    // Read route param /profile/:id
    const { id } = useParams();
    const viewingId = id || "1";

    // 1. Logged in user: username, fullname, ID
    const [loggedInUser, setLoggedInUser] = useState({
        ID: "?",
        username: "?",
        fullname: "?",
        image: "/ProfilePic/0.jpg"
    });

    // 2. Current user viewing data & status
    const [userViewing, setUserViewing] = useState(null);
    const [userNotFound, setUserNotFound] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [loading, setLoading] = useState(true);

    // UI state
    const [activeTab, setActiveTab] = useState('about');
    const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

    // Fetch logged-in user from /api/auth/me
    const fetchLoggedInUser = useCallback(async () => {
        try {
            const data = await request.get('/api/auth/me');
            if (data) {
                const uname = data.username || "?";
                setLoggedInUser({
                    ID: String(data.id || "?"),
                    username: uname,
                    fullname: data.full_name || data.fullName || data.fullname || data.name || uname,
                    image: data.image || (uname !== '?' ? getUserAvatarUrl(uname) : '/ProfilePic/0.jpg'),
                });
            }
        } catch (err) {
            console.error('Failed to fetch logged-in user (/api/auth/me):', err);
        }
    }, []);

    // Fetch viewing user data from /api/users/{ID}
    const fetchUserViewing = useCallback(async () => {
        setLoading(true);
        setUserNotFound(false);
        setLoadError(false);
        try {
            const res = await request.get(`/api/users/${viewingId}`);
            const data = res?.data || res;

            // Check if response contains valid user data
            if (data && (data.id || data.username || data.email)) {
                const uname = data.username || `user_${viewingId}`;
                const fname = data.full_name || data.fullName || data.fullname || data.name || uname;

                // Parse about strengths
                const strengthsList = Array.isArray(data.about)
                    ? data.about
                    : (data.about?.strengths || (data.about ? [data.about] : []));

                // Parse and fetch projects by ID using GET /api/projects/{ID}
                let projectsList = [];
                if (Array.isArray(data.projects) && data.projects.length > 0) {
                    const projectPromises = data.projects.map(async (item) => {
                        // If it's already an object with full details
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
                                        : '01/01/2026 - 31/12/2027'));

                                return {
                                    id: String(p.id || projId),
                                    title: p.title || p.name || `Project ${projId}`,
                                    desc: p.description || p.desc || `Project details for @${uname}`,
                                    status: (p.status || 'ACTIVE').toUpperCase(),
                                    dates: datesFormatted
                                };
                            }
                        } catch (projErr) {
                            console.error(`Failed to fetch project details for ID ${projId} (/api/projects/${projId}):`, projErr);
                            return {
                                id: String(projId),
                                title: typeof item === 'string' ? item : `Project ${projId}`,
                                desc: `Project assignment for @${uname}`,
                                status: "ACTIVE",
                                dates: "01/01/2026 - 31/12/2027"
                            };
                        }
                        return null;
                    });

                    const results = await Promise.all(projectPromises);
                    projectsList = results.filter(Boolean);
                }

                const dateJoinedFormatted = data.created_at || data.createdAt
                    ? new Date(data.created_at || data.createdAt).toLocaleDateString('en-GB')
                    : "01/01/2026";

                setUserViewing({
                    ID: String(data.id || viewingId),
                    username_viewing: uname,
                    fullname_viewing: fname,
                    image: data.image || getUserAvatarUrl(uname),
                    role: data.role || "MEMBER",
                    status: data.status || "ACTIVE",
                    about: {
                        strengths: strengthsList,
                        videoUrl: data.videoUrl || "ProfileVid.mp4"
                    },
                    contacts: {
                        email: data.email || `${uname.toLowerCase()}@example.com`
                    },
                    stats: {
                        dateJoined: dateJoinedFormatted,
                        accountStatus: data.status || "ACTIVE",
                        accountRole: data.role || "MEMBER"
                    },
                    projects: projectsList
                });
                setUserNotFound(false);
                setLoadError(false);
            } else {
                setUserViewing(null);
                setUserNotFound(true);
            }
        } catch (err) {
            console.error(`User ID ${viewingId} failed to load (/api/users/${viewingId}):`, err);
            const status = err?.response?.status;
            setUserViewing(null);
            if (status === 404) {
                setUserNotFound(true);
                setLoadError(false);
            } else {
                setLoadError(true);
                setUserNotFound(false);
            }
        } finally {
            setLoading(false);
        }
    }, [viewingId]);

    useEffect(() => {
        fetchLoggedInUser();
        fetchUserViewing();
    }, [fetchLoggedInUser, fetchUserViewing]);

    return (
        <div className="profile-page-wrapper">
            {/* Top Navigation Bar with Logged In User Info */}
            <div id="navbar-root">
                <NavBar userId={loggedInUser.ID} fullName={loggedInUser.fullname} userName={loggedInUser.username} userImg={loggedInUser.image} />
            </div>

            {/* Loading state */}
            {loading ? (
                <div className="page-container user-not-found-container">
                    {/* Placeholder while loading */}
                </div>
            ) : loadError ? (
                /* Failed to load -> Reload Button in middle of screen */
                <div className="page-container user-not-found-container">
                    <ReloadButton onReload={fetchUserViewing} isLoading={loading} />
                </div>
            ) : userNotFound || !userViewing ? (
                /* User Not Found state */
                <div className="page-container user-not-found-container">
                    <h2 className="user-not-found-text">This user doesn't exist</h2>
                </div>
            ) : (
                /* Profile Content with Viewing User Info */
                <>
                    <div className="page-container">
                        <ProfileHeader
                            profile={userViewing}
                            onOpenStats={() => setIsStatsModalOpen(true)}
                        />
                        <ProfileTabs
                            activeTab={activeTab}
                            onSelectTab={setActiveTab}
                        />
                        {activeTab === 'about' && <AboutTab profile={userViewing} />}
                        {activeTab === 'projects' && <ProjectsTab projects={userViewing.projects} />}
                    </div>

                    {/* Statistics Modal */}
                    <StatsModal
                        isOpen={isStatsModalOpen}
                        onClose={() => setIsStatsModalOpen(false)}
                        stats={userViewing.stats}
                    />
                </>
            )}
        </div>
    );
}

export default Profile;
