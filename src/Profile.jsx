import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    useQuery,
    useMutation,
    useQueryClient
} from '@tanstack/react-query';
import './Profile.css';
import NavBar from './NavBar';
import request from './api/Request';
import { getProjectStatusClass, getUserAvatarUrl } from './utils';
import { useTheme } from './useTheme';
import { useCurrentUser } from './useCurrentUser';

// Section Reload Button Component
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

// Profile Header (Avatar, Names, Role, Actions, Reputation Votes)
function ProfileHeader({ profile, onOpenStats, targetUserId, loggedInUserId }) {
    const client = useQueryClient();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    const [localVoteState, setLocalVoteState] = useState({
        upvotes: 0,
        downvotes: 0,
        myVote: null
    });

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

    // ── GET /api/users/{targetUserId}/reputation ─────────────────────────────
    const { data: repData } = useQuery({
        queryKey: ['profileReputation', targetUserId],
        queryFn: async () => {
            const res = await request.get(`/api/users/${targetUserId}/reputation`);
            const d = res?.data || res;
            return {
                upvotes: Number(d?.upvotes ?? d?.likes ?? d?.up ?? 0),
                downvotes: Number(d?.downvotes ?? d?.dislikes ?? d?.down ?? 0),
                myVote: d?.myVote ?? d?.my_vote ?? d?.vote_type ?? null
            };
        },
        enabled: Boolean(targetUserId),
        staleTime: 1000 * 30
    });

    useEffect(() => {
        if (repData) {
            setLocalVoteState({
                upvotes: repData.upvotes,
                downvotes: repData.downvotes,
                myVote: repData.myVote
            });
        }
    }, [repData]);

    const upvotes = localVoteState.upvotes;
    const downvotes = localVoteState.downvotes;
    const userVote = localVoteState.myVote === 1 ? 'up' : localVoteState.myVote === -1 ? 'down' : null;

    const total = upvotes + downvotes;
    const upPct = total > 0 ? (upvotes / total) * 100 : 50;
    const downPct = total > 0 ? (downvotes / total) * 100 : 50;

    const applyVoteLocally = (newVoteType) => {
        setLocalVoteState((prev) => {
            let u = prev.upvotes;
            let d = prev.downvotes;
            const currentVote = prev.myVote;

            if (currentVote === 1) u = Math.max(0, u - 1);
            if (currentVote === -1) d = Math.max(0, d - 1);

            if (newVoteType === 1) u += 1;
            if (newVoteType === -1) d += 1;

            return {
                upvotes: u,
                downvotes: d,
                myVote: newVoteType
            };
        });
    };

    // ── POST /api/users/{targetUserId}/vote ──────────────────────────────────
    const voteMutation = useMutation({
        mutationFn: (voteType) =>
            request.post(`/api/users/${targetUserId}/vote`, { voteType: Number(voteType) }),
        onSettled: () => client.invalidateQueries({ queryKey: ['profileReputation', targetUserId] })
    });

    // ── DELETE /api/users/{targetUserId}/vote ────────────────────────────────
    const unvoteMutation = useMutation({
        mutationFn: () => request.delete(`/api/users/${targetUserId}/vote`),
        onSettled: () => client.invalidateQueries({ queryKey: ['profileReputation', targetUserId] })
    });

    const isBusy = voteMutation.isPending || unvoteMutation.isPending;
    const isSelf = loggedInUserId && targetUserId && String(loggedInUserId) === String(targetUserId);

    const handleUpvote = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isBusy || isSelf) return;

        if (userVote === 'up') {
            applyVoteLocally(null);
            unvoteMutation.mutate();
        } else {
            applyVoteLocally(1);
            voteMutation.mutate(1);
        }
    };

    const handleDownvote = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isBusy || isSelf) return;

        if (userVote === 'down') {
            applyVoteLocally(null);
            unvoteMutation.mutate();
        } else {
            applyVoteLocally(-1);
            voteMutation.mutate(-1);
        }
    };

    return (
        <div className="profile-header-card">
            {/* Options menu */}
            <div className="options-menu" ref={menuRef}>
                <button
                    className="dots-btn"
                    id="profileOptionsBtn"
                    title="Options"
                    aria-label="Options"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen((prev) => !prev);
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
                    <Link
                        to={`/report?username=${encodeURIComponent(profile.username_viewing || '')}&type=user`}
                        state={{
                            username: profile.username_viewing || '',
                            type: 'user',
                            fullname: profile.fullname_viewing || ''
                        }}
                        className="options-menu-item"
                        onClick={() => setIsMenuOpen(false)}
                    >
                        Report
                    </Link>
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

                    {/* Upvote / Downvote reputation section */}
                    <div className="vote-section">
                        {/* Hide only the voting buttons on self profile */}
                        {!isSelf && (
                            <div className="vote-buttons">
                                <button
                                    type="button"
                                    className={`vote-btn vote-btn-up ${userVote === 'up' ? 'active' : ''}`}
                                    onClick={handleUpvote}
                                    title="Upvote"
                                    aria-label="Upvote"
                                    disabled={isBusy}
                                >
                                    &#9650;
                                </button>
                                <button
                                    type="button"
                                    className={`vote-btn vote-btn-down ${userVote === 'down' ? 'active' : ''}`}
                                    onClick={handleDownvote}
                                    title="Downvote"
                                    aria-label="Downvote"
                                    disabled={isBusy}
                                >
                                    &#9660;
                                </button>
                            </div>
                        )}

                        {/* Always visible: reputation bar & counts */}
                        <div className="vote-bar-row">
                            <span className="vote-count vote-count-up">+{upvotes}</span>
                            <div className="vote-bar" title={`${upvotes} upvotes / ${downvotes} downvotes`}>
                                <div className="vote-bar-up" style={{ width: `${upPct}%` }} />
                                <div className="vote-bar-down" style={{ width: `${downPct}%` }} />
                            </div>
                            <span className="vote-count vote-count-down">-{downvotes}</span>
                        </div>
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

// About Tab
function AboutTab({ profile }) {
    const strengths = profile.about?.strengths || [];
    const email = profile.contacts?.email || '';
    const videoUrl = profile.about?.videoUrl || '';

    return (
        <div id="profileTabAbout" className="profile-tab-panel">
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

            <div className="content-card">
                <div className="contact-header-row">
                    <h2 className="card-header" style={{ marginBottom: 0 }}>Contact Info:</h2>
                    <a href="Contact.html" className="btn-contact-small">Contact</a>
                </div>
                <p className="contact-text">Email: {email || 'Not specified'}</p>
            </div>

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

    const filteredProjects = (projects || []).filter((project) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        const fullText = `${project.title} ${project.id} ${project.desc} ${project.status} ${project.dates}`.toLowerCase();
        return fullText.includes(query);
    });

    return (
        <div id="profileTabProjects" className="profile-tab-panel">
            <div className="profile-projects-card">
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

                <div className="profile-projects-scroll-wrapper">
                    {filteredProjects.length > 0 ? (
                        filteredProjects.map((project) => (
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
    const { isDark } = useTheme();
    const { id } = useParams();
    const viewingId = id || "1";

    const { currentUser: loggedInUser } = useCurrentUser();
    const [userViewing, setUserViewing] = useState(null);
    const [userNotFound, setUserNotFound] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState('about');
    const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

    const fetchUserViewing = useCallback(async () => {
        setLoading(true);
        setUserNotFound(false);
        setLoadError(false);
        try {
            const res = await request.get(`/api/users/${viewingId}`);
            const data = res?.data || res;

            if (data && (data.id || data.username || data.email)) {
                const uname = data.username || `user_${viewingId}`;
                const fname = data.full_name || data.fullName || data.fullname || data.name || uname;

                const strengthsList = Array.isArray(data.about)
                    ? data.about
                    : (data.about?.strengths || (data.about ? [data.about] : []));

                let projectsList = [];
                if (Array.isArray(data.projects) && data.projects.length > 0) {
                    const projectPromises = data.projects.map(async (item) => {
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
                            console.error(`Failed to fetch project details for ID ${projId}:`, projErr);
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
            console.error(`User ID ${viewingId} failed to load:`, err);
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
        fetchUserViewing();
    }, [fetchUserViewing]);

    return (
        <div className={`profile-page-wrapper${isDark ? ' dark-mode' : ''}`}>
            <div id="navbar-root">
                <NavBar
                    userId={loggedInUser.id || loggedInUser.ID}
                    fullName={loggedInUser.fullname}
                    userName={loggedInUser.username}
                    userImg={loggedInUser.image}
                    theme={isDark ? 'dark' : 'light'}
                />
            </div>

            {loading ? (
                <div className="page-container user-not-found-container" />
            ) : loadError ? (
                <div className="page-container user-not-found-container">
                    <ReloadButton onReload={fetchUserViewing} isLoading={loading} />
                </div>
            ) : userNotFound || !userViewing ? (
                <div className="page-container user-not-found-container">
                    <h2 className="user-not-found-text">This user doesn't exist</h2>
                </div>
            ) : (
                <>
                    <div className="page-container">
                        <ProfileHeader
                            profile={userViewing}
                            onOpenStats={() => setIsStatsModalOpen(true)}
                            targetUserId={userViewing.ID}
                            loggedInUserId={loggedInUser.id || loggedInUser.ID}
                        />
                        <ProfileTabs activeTab={activeTab} onSelectTab={setActiveTab} />
                        {activeTab === 'about' && <AboutTab profile={userViewing} />}
                        {activeTab === 'projects' && <ProjectsTab projects={userViewing.projects} />}
                    </div>

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