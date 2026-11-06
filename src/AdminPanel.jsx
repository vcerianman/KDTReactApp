import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    useQuery,
    useQueryClient
} from '@tanstack/react-query';
import './AdminPanel.css';
import NavBar from './NavBar';
import Notification from './Notification';
import request from './api/Request';
import { getUserAvatarUrl, getProjectStatusClass, getPriorityTagClass } from './utils';
import { useTheme } from './useTheme';
import { useCurrentUser } from './useCurrentUser';

// Section Reload Button Component matching the universal reload icon design
function ReloadButton({ onReload, isLoading }) {
    return (
        <button
            type="button"
            className={`section-reload-btn ${isLoading ? 'loading' : ''}`}
            onClick={onReload}
            title="Reload"
            aria-label="Reload"
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

// Action Menu with Edit, Manage Users, Archive, Delete
function ProjectActionMenu({ project, onEdit, onManageUsers, onArchive, onDelete }) {
    const [isOpen, setIsOpen] = useState(false);
    const btnRef = useRef(null);
    const bubbleRef = useRef(null);
    const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });

    const updatePosition = () => {
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPopupPos({
                top: rect.top + rect.height / 2,
                left: rect.right + 24
            });
        }
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                btnRef.current && !btnRef.current.contains(e.target) &&
                bubbleRef.current && !bubbleRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };

        const handleScrollOrResize = () => {
            if (isOpen) {
                updatePosition();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', handleScrollOrResize, true);
            window.addEventListener('resize', handleScrollOrResize);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [isOpen]);

    const handleToggle = (e) => {
        e.stopPropagation();
        if (!isOpen) {
            updatePosition();
        }
        setIsOpen((prev) => !prev);
    };

    return (
        <div className="action-popup-wrapper">
            <button
                type="button"
                ref={btnRef}
                className="btn-more-actions"
                onClick={handleToggle}
                title="Project actions"
                aria-label="Project actions"
            >
                ...
            </button>

            {isOpen && createPortal(
                <div
                    className="action-popup-bubble"
                    ref={bubbleRef}
                    style={{
                        position: 'fixed',
                        top: `${popupPos.top}px`,
                        left: `${popupPos.left}px`,
                        transform: 'translateY(-50%)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        className="popup-menu-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                            onEdit(project);
                        }}
                    >
                        Edit
                    </button>
                    <div className="popup-menu-divider"></div>
                    <button
                        type="button"
                        className="popup-menu-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                            onManageUsers(project);
                        }}
                    >
                        Manage users
                    </button>
                    <div className="popup-menu-divider"></div>
                    <button
                        type="button"
                        className="popup-menu-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                            onArchive(project);
                        }}
                    >
                        {project.status === 'ARCHIVED' ? 'Unarchive' : 'Archive'}
                    </button>
                    <div className="popup-menu-divider"></div>
                    <button
                        type="button"
                        className="popup-menu-btn delete-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                            onDelete(project);
                        }}
                    >
                        Delete
                    </button>
                </div>,
                document.body
            )}
        </div>
    );
}

// Global & Project Users Prompt Modal Component (matching Tasks.jsx GlobalUsersModal)
function GlobalUsersModal({
    isOpen,
    onClose,
    users,
    loading,
    title = "Edit Members",
    projectUserIds = [],
    isEditMode = false,
    onToggleMember,
    actionLoadingId = null,
    projectOwner = ''
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

    const ownerName = typeof projectOwner === 'object' && projectOwner !== null
        ? (projectOwner.username || projectOwner.id || projectOwner.name || projectOwner.fullname || '')
        : String(projectOwner || '');

    const isOwner = (u) => {
        if (!ownerName) return false;
        const o = ownerName.toLowerCase().trim();
        return (
            (u.username && u.username.toLowerCase().trim() === o) ||
            (u.fullname && u.fullname.toLowerCase().trim() === o) ||
            (u.name && u.name.toLowerCase().trim() === o) ||
            (u.id && String(u.id).toLowerCase().trim() === o)
        );
    };

    const filteredUsers = [...(users || [])]
        .filter(u => {
            // Exclude project owner from the list in edit mode
            if (isEditMode && isOwner(u)) {
                return false;
            }
            const query = searchQuery.toLowerCase().trim();
            if (!query) return true;
            const full = `${u.fullname || ''} ${u.username || ''}`.toLowerCase();
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

// Single Project Card Component (Detailed card matching Tasks.jsx)
function ProjectCardItem({ project, onEdit, onManageUsers, onArchive, onDelete, onOpenProjectUsers }) {
    const statusClass = typeof getProjectStatusClass === 'function'
        ? getProjectStatusClass(project.status)
        : 'status-planning';

    const projectUsers = project.users && project.users.length > 0
        ? project.users
        : (project.owner ? [{
            id: '0',
            fullname: project.owner,
            username: project.owner,
            image: getUserAvatarUrl(project.owner)
        }] : [
            { id: '0', fullname: '(no one)', username: 'N/A', image: '/ProfilePic/0.jpg' }
        ]);

    const displayedUsers = projectUsers.slice(0, 4);
    const extraCount = Math.max(0, projectUsers.length - 4);
    const userNamesString = projectUsers.map(u => u.fullname || u.name || u.username).join(', ');

    return (
        <div className={`project-card-item ${statusClass}`} data-project-id={project.id}>
            {/* Left side: Title, ID, Description */}
            <div className="project-card-left">
                <div className="project-title-row">
                    <span className="project-title-text">{project.title}</span>
                    <span className="project-id-text">(id:{project.id})</span>
                </div>
                <p className="project-desc-text">{project.desc || project.description || 'No description provided.'}</p>
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
                        onClick={() => onOpenProjectUsers(projectUsers, project.title)}
                    >
                        <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor">
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

            {/* Right side: Status, Dates, Owner & 3-dots popup */}
            <div className="project-card-right">
                <div className="project-meta-info">
                    <div className="project-status-value">Status: {project.status}</div>
                    <div className="project-owner-value">owner: @{project.owner || 'KDT'}</div>
                    {project.dates && (
                        <div className="project-dates-value">{project.dates}</div>
                    )}
                </div>

                <ProjectActionMenu
                    project={project}
                    onEdit={onEdit}
                    onManageUsers={onManageUsers}
                    onArchive={onArchive}
                    onDelete={onDelete}
                />
            </div>
        </div>
    );
}

// User Selection Modal Component (like Edit Members / Assignee in CreateTasks.jsx)
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
                    <h3 className="members-modal-title">Select User</h3>
                    <div className="members-header-right">
                        <div className="members-search-box">
                            <svg className="members-search-icon" viewBox="0 0 24 24">
                                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 14z" />
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

function toIsoDateString(val) {
    if (!val || typeof val !== 'string') return '';
    const trimmed = val.trim();
    if (!trimmed) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
        const [d, m, y] = trimmed.split('/');
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
        const [d, m, y] = trimmed.split('-');
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
    }
    return trimmed;
}

function parseStartAndDueDate(project) {
    let sDate = project?.startDate || project?.start_date || '';
    let dDate = project?.dueDate || project?.due_date || project?.endDate || project?.end_date || '';

    if ((!sDate || !dDate) && project?.dates) {
        const parts = project.dates.split(' - ');
        if (parts.length >= 1 && !sDate) sDate = parts[0];
        if (parts.length >= 2 && !dDate) dDate = parts[1];
    }

    return {
        startDate: toIsoDateString(sDate),
        dueDate: toIsoDateString(dDate)
    };
}

// Helper to convert raw list or database string format into multi-line text with \n
function parseAboutToText(about) {
    if (!about) return '';
    if (Array.isArray(about)) {
        return about.join('\n');
    }
    if (typeof about === 'string') {
        const trimmed = about.trim();
        // Handle PostgreSQL / SQL array format like {"a","b"} or {"item 1","item 2"}
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            const inner = trimmed.substring(1, trimmed.length - 1);
            const items = inner.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
                .map(s => s.trim().replace(/^"|"$/g, ''))
                .filter(Boolean);
            return items.join('\n');
        }
        // Handle JSON array format like ["a", "b"]
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    return parsed.join('\n');
                }
            } catch (e) {
                // Ignore parse error
            }
        }
        return about;
    }
    return '';
}

// Helper to convert multi-line text separated by \n into an array/list of strings for SQL/backend {"a","b"}
function compileAboutToList(aboutText) {
    if (!aboutText) return [];
    if (Array.isArray(aboutText)) {
        return aboutText.map(s => String(s).trim()).filter(Boolean);
    }
    return String(aboutText)
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);
}

// Edit User Modal Component
function EditUserModal({ user, onSave, onCancel, currentUserRole }) {
    const isGodUser = String(currentUserRole || '').toUpperCase().includes('GOD');

    const [formData, setFormData] = useState({
        fullname: user ? (user.fullname || user.full_name || user.name || '') : '',
        username: user ? (user.username || '') : '',
        email: user ? (user.email || '') : '',
        about: user ? parseAboutToText(user.about || user.bio) : '',
        status: user ? (user.status || 'ACTIVE').toUpperCase() : 'ACTIVE',
        role: user ? (user.role || 'MEMBER').toUpperCase() : 'MEMBER'
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData, user);
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">Edit User (id:{user.id})</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.fullname}
                            onChange={(e) => handleChange('fullname', e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.username}
                            onChange={(e) => handleChange('username', e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-input"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            placeholder="user@example.com"
                        />
                    </div>

                    <div className="form-row-dates">
                        <div className="form-group half-width">
                            <label className="form-label">Status</label>
                            <select
                                className="form-select"
                                value={formData.status}
                                onChange={(e) => handleChange('status', e.target.value)}
                            >
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="INACTIVE">INACTIVE</option>
                                <option value="BLOCKED">BLOCKED</option>
                            </select>
                        </div>

                        <div className="form-group half-width">
                            <label className="form-label">Role</label>
                            <select
                                className="form-select"
                                value={formData.role}
                                onChange={(e) => handleChange('role', e.target.value)}
                            >
                                <option value="MEMBER">MEMBER</option>
                                <option value="ADMIN">ADMIN</option>
                                {isGodUser && <option value="GOD">GOD</option>}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">About</label>
                        <textarea
                            className="form-textarea"
                            value={formData.about}
                            onChange={(e) => handleChange('about', e.target.value)}
                            placeholder="User bio / about info..."
                        />
                    </div>

                    <div className="modal-btn-row">
                        <button type="button" className="btn-modal-cancel" onClick={onCancel}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-modal-save">
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Edit Project Modal Component
function EditProjectModal({ project, onSave, onCancel, users, loadingUsers, onFetchUsers }) {
    const parsedDates = parseStartAndDueDate(project);

    const [formData, setFormData] = useState({
        title: project ? (project.name || project.title || '') : '',
        owner: project ? (project.owner || project.createdBy || project.ownerName || '') : '',
        status: project ? (project.status || 'ACTIVE') : 'ACTIVE',
        startDate: parsedDates.startDate,
        dueDate: parsedDates.dueDate,
        desc: project ? (project.description || project.desc || '') : ''
    });
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleOpenUserModal = () => {
        setIsUserModalOpen(true);
        if ((!users || users.length === 0) && onFetchUsers) {
            onFetchUsers();
        }
    };

    const handleSelectUser = (u) => {
        handleChange('owner', u.username || u.fullname || '');
        setIsUserModalOpen(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData, project);
    };

    return (
        <React.Fragment>
            <div className="modal-overlay" onClick={onCancel}>
                <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                    <h2 className="modal-title">Edit Project (id:{project.id})</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Project Title</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.title}
                                onChange={(e) => handleChange('title', e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Owner Tag</label>
                            <div className="input-with-button-row">
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.owner}
                                    onChange={(e) => handleChange('owner', e.target.value)}
                                    placeholder="e.g. Khanig, KDT, NgoDo"
                                    required
                                />
                                <button
                                    type="button"
                                    className="btn-search-user"
                                    onClick={handleOpenUserModal}
                                    title="Search and select user"
                                    aria-label="Search and select user"
                                >
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select
                                className="form-select"
                                value={formData.status}
                                onChange={(e) => handleChange('status', e.target.value)}
                            >
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="ON_HOLD">ON_HOLD</option>
                                <option value="PLANNING">PLANNING</option>
                                <option value="COMPLETED">COMPLETED</option>
                                <option value="ARCHIVED">ARCHIVED</option>
                            </select>
                        </div>

                        {/* Start Date & Due Date in YYYY-MM-DD */}
                        <div className="form-row-dates">
                            <div className="form-group half-width">
                                <label className="form-label">Start Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.startDate}
                                    onChange={(e) => handleChange('startDate', e.target.value)}
                                />
                            </div>

                            <div className="form-group half-width">
                                <label className="form-label">Due Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.dueDate}
                                    onChange={(e) => handleChange('dueDate', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea
                                className="form-textarea"
                                value={formData.desc}
                                onChange={(e) => handleChange('desc', e.target.value)}
                                placeholder="Project description..."
                            />
                        </div>

                        <div className="modal-btn-row">
                            <button type="button" className="btn-modal-cancel" onClick={onCancel}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-modal-save">
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* User Selection Modal Prompt */}
            <UserSelectModal
                isOpen={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
                users={users}
                loading={loadingUsers}
                onSelectUser={handleSelectUser}
            />
        </React.Fragment>
    );
}

// Delete Confirmation Modal Component
function DeleteConfirmModal({ project, onConfirm, onCancel }) {
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title" style={{ color: '#e53935' }}>Delete Project?</h2>
                <p style={{ fontSize: '14.5px', color: '#555555', lineHeight: 1.5, marginBottom: '20px' }}>
                    Are you sure you want to permanently delete <strong>{project.title}</strong> (id:{project.id})? This action cannot be undone.
                </p>
                <div className="modal-btn-row">
                    <button type="button" className="btn-modal-cancel" onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn-modal-danger"
                        onClick={() => onConfirm(project)}
                    >
                        Delete Project
                    </button>
                </div>
            </div>
        </div>
    );
}

// Edit Projects Tab Content
function ProjectsTabContent({
    projects,
    searchQuery,
    onSearchChange,
    onEditProject,
    onManageUsers,
    onArchiveProject,
    onDeleteProject,
    onOpenProjectUsers
}) {
    const filteredProjects = projects.filter(project => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        const fullText = `${project.title} ${project.id} ${project.owner || ''} ${project.desc || ''} ${project.status} ${project.dates}`.toLowerCase();
        return fullText.includes(query);
    });

    return (
        <div>
            {/* Top Right Search Bar */}
            <div className="tab-toolbar">
                <div className="tab-search-container">
                    <svg className="tab-search-icon" viewBox="0 0 24 24">
                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 14z" />
                    </svg>
                    <input
                        type="text"
                        className="tab-search-input"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
            </div>

            {/* Global Projects List */}
            <div className="projects-scroll-wrapper">
                {filteredProjects.length > 0 ? (
                    filteredProjects.map((project) => (
                        <ProjectCardItem
                            key={project.id}
                            project={project}
                            onEdit={onEditProject}
                            onManageUsers={onManageUsers}
                            onArchive={onArchiveProject}
                            onDelete={onDeleteProject}
                            onOpenProjectUsers={onOpenProjectUsers}
                        />
                    ))
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#888888' }}>
                        <p style={{ fontSize: '15px' }}>No global projects found matching "{searchQuery}".</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// User Action Menu with Edit, Temp Ban, Deactivate
function UserActionMenu({ user, onEdit, onTempBan, onDeactivate }) {
    const [isOpen, setIsOpen] = useState(false);
    const btnRef = useRef(null);
    const bubbleRef = useRef(null);
    const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });

    const updatePosition = () => {
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPopupPos({
                top: rect.top + rect.height / 2,
                left: rect.right + 24
            });
        }
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                btnRef.current && !btnRef.current.contains(e.target) &&
                bubbleRef.current && !bubbleRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };

        const handleScrollOrResize = () => {
            if (isOpen) {
                updatePosition();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', handleScrollOrResize, true);
            window.addEventListener('resize', handleScrollOrResize);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [isOpen]);

    const handleToggle = (e) => {
        e.stopPropagation();
        if (!isOpen) {
            updatePosition();
        }
        setIsOpen((prev) => !prev);
    };

    return (
        <div className="action-popup-wrapper">
            <button
                type="button"
                ref={btnRef}
                className="btn-more-actions"
                onClick={handleToggle}
                title="User actions"
                aria-label="User actions"
            >
                ...
            </button>

            {isOpen && createPortal(
                <div
                    className="action-popup-bubble user-action-popup-bubble"
                    ref={bubbleRef}
                    style={{
                        position: 'fixed',
                        top: `${popupPos.top}px`,
                        left: `${popupPos.left}px`,
                        transform: 'translateY(-50%)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        className="popup-menu-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                            onEdit(user);
                        }}
                    >
                        Edit
                    </button>
                    <div className="popup-menu-divider"></div>
                    <button
                        type="button"
                        className="popup-menu-btn delete-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                            onTempBan(user);
                        }}
                    >
                        Temp Ban
                    </button>
                    <div className="popup-menu-divider"></div>
                    <button
                        type="button"
                        className="popup-menu-btn delete-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                            onDeactivate(user);
                        }}
                    >
                        Deactivate
                    </button>
                </div>,
                document.body
            )}
        </div>
    );
}

// Outline class: GOD (gold), ADMIN (darker yellow), MEMBER (light blue), INACTIVE (dark blue), BLOCKED (dark red), DELETED (light gray bg + gray text)
function getUserOutlineClass(role, status, deleted) {
    if (deleted) {
        return 'user-card-deleted';
    }
    const s = String(status || '').toUpperCase();
    if (s === 'INACTIVE') {
        return 'user-outline-inactive';
    }
    if (s === 'BLOCKED' || s === 'BANNED' || s === 'DEACTIVATED') {
        return 'user-outline-blocked';
    }
    const r = String(role || '').toUpperCase();
    if (r.includes('GOD')) return 'user-outline-god';
    if (r.includes('ADMIN')) return 'user-outline-admin';
    return 'user-outline-member';
}

// User Card Component matching Edit Users design
function UserCardItem({ user, onEdit, onTempBan, onDeactivate, currentUserRole }) {
    const outlineClass = getUserOutlineClass(user.role, user.status, user.deleted);
    const isTargetGod = String(user.role || '').toUpperCase().includes('GOD');
    const isLoggedGod = String(currentUserRole || '').toUpperCase().includes('GOD');
    // Admin role logged in users cannot alter GOD roles -> hide "..." on GOD cards for non-GOD admins
    const canManageUser = !isTargetGod || isLoggedGod;

    return (
        <div className={`user-card-item ${outlineClass}`} data-user-id={user.id}>
            {/* Left: ID, Avatar, Fullname, Username, Role */}
            <div className="user-card-left">
                <div className="user-id-badge">{user.id}</div>
                <img
                    src={user.image || getUserAvatarUrl(user.username)}
                    alt={user.fullname || user.username}
                    className="user-avatar-thumb"
                    onError={(e) => { e.target.src = '/ProfilePic/0.jpg'; }}
                />
                <div className="user-identity-info">
                    <div className="user-name-row">
                        <span className="user-fullname">{user.fullname}</span>
                        <span className="user-username">@{user.username}</span>
                    </div>
                    <div className="user-role-label">Role: {user.role || 'MEMBER'}</div>
                </div>
            </div>

            {/* Right: Status, '...' Menu (hidden for GOD users if current user is not GOD), Join Date */}
            <div className="user-card-right">
                <div className="user-status-row">
                    <div className="user-status-label">Status: {user.status || 'ACTIVE'}</div>
                    {canManageUser && (
                        <UserActionMenu
                            user={user}
                            onEdit={onEdit}
                            onTempBan={onTempBan}
                            onDeactivate={onDeactivate}
                        />
                    )}
                </div>
                <div className="user-joindate-label">
                    Join date: {user.joinDate || '(date here)'}
                </div>
            </div>
        </div>
    );
}

// Create User Modal Component
function CreateUserModal({ onSave, onCancel, isSubmitting }) {
    const [formData, setFormData] = useState({
        username: '',
        fullname: '',
        password: '',
        email: '',
        role: 'MEMBER',
        status: 'ACTIVE'
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">Create User</h2>
                <form onSubmit={handleSubmit}>
                    {/* Username */}
                    <div className="form-group">
                        <label className="form-label">Username *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.username}
                            onChange={(e) => handleChange('username', e.target.value)}
                            placeholder="username"
                            required
                        />
                    </div>

                    {/* Full Name */}
                    <div className="form-group">
                        <label className="form-label">Full Name *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.fullname}
                            onChange={(e) => handleChange('fullname', e.target.value)}
                            placeholder="fullname"
                            required
                        />
                    </div>

                    {/* Password */}
                    <div className="form-group">
                        <label className="form-label">Password *</label>
                        <input
                            type="password"
                            className="form-input"
                            value={formData.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                            placeholder="Enter password..."
                            required
                        />
                    </div>

                    {/* Email */}
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-input"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            placeholder="username@fullname.com"
                        />
                    </div>

                    {/* Role & Status row */}
                    <div className="form-row-dates">
                        <div className="form-group half-width">
                            <label className="form-label">Role</label>
                            <select
                                className="form-select"
                                value={formData.role}
                                onChange={(e) => handleChange('role', e.target.value)}
                            >
                                <option value="MEMBER">MEMBER</option>
                                <option value="ADMIN">ADMIN</option>
                            </select>
                        </div>

                        <div className="form-group half-width">
                            <label className="form-label">Status</label>
                            <select
                                className="form-select"
                                value={formData.status}
                                onChange={(e) => handleChange('status', e.target.value)}
                            >
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="INACTIVE">INACTIVE</option>
                                <option value="BLOCKED">BLOCKED</option>
                            </select>
                        </div>
                    </div>

                    <div className="modal-btn-row">
                        <button type="button" className="btn-modal-cancel" onClick={onCancel}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-modal-save" disabled={isSubmitting}>
                            {isSubmitting ? 'Creating...' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Edit Users Tab Content
function UsersTabContent({
    users,
    searchQuery,
    onSearchChange,
    onEditUser,
    onTempBan,
    onDeactivate,
    onCreateUser,
    loading,
    currentUserRole
}) {
    const filteredUsers = (users || [])
        .filter(user => {
            const query = searchQuery.toLowerCase().trim();
            if (!query) return true;
            const fullText = `${user.id} ${user.fullname || ''} ${user.username || ''} ${user.role || ''} ${user.status || ''} ${user.joinDate || ''}`.toLowerCase();
            return fullText.includes(query);
        })
        .sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));

    return (
        <div>
            {/* Top Toolbar: Create User button + Search Bar on rightmost side */}
            <div className="tab-toolbar">
                <button
                    type="button"
                    className="btn-create-user-toolbar"
                    onClick={onCreateUser}
                >
                    + Create User
                </button>
                <div className="tab-search-container">
                    <svg className="tab-search-icon" viewBox="0 0 24 24">
                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                    </svg>
                    <input
                        type="text"
                        className="tab-search-input"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
            </div>

            {/* Global Users List (Sorted by ID) */}
            <div className="projects-scroll-wrapper">
                {loading && users.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#888888' }}>
                        <p style={{ fontSize: '15px' }}>Loading global users...</p>
                    </div>
                ) : filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                        <UserCardItem
                            key={user.id}
                            user={user}
                            onEdit={onEditUser}
                            onTempBan={onTempBan}
                            onDeactivate={onDeactivate}
                            currentUserRole={currentUserRole}
                        />
                    ))
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#888888' }}>
                        <p style={{ fontSize: '15px' }}>No users found matching "{searchQuery}".</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Task Action Menu with Edit, Cancel (or Uncancel), Delete
function TaskActionMenu({ task, onEdit, onToggleCancel, onDelete }) {
    const [isOpen, setIsOpen] = useState(false);
    const btnRef = useRef(null);
    const bubbleRef = useRef(null);
    const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });

    const updatePosition = () => {
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPopupPos({
                top: rect.top + rect.height / 2,
                left: rect.right + 24
            });
        }
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                btnRef.current && !btnRef.current.contains(e.target) &&
                bubbleRef.current && !bubbleRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };

        const handleScrollOrResize = () => {
            if (isOpen) {
                updatePosition();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', handleScrollOrResize, true);
            window.addEventListener('resize', handleScrollOrResize);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [isOpen]);

    const handleToggle = (e) => {
        e.stopPropagation();
        if (!isOpen) {
            updatePosition();
        }
        setIsOpen((prev) => !prev);
    };

    const isCancelled = (task.status || '').toUpperCase() === 'CANCELLED';

    return (
        <div className="action-popup-wrapper">
            <button
                type="button"
                ref={btnRef}
                className="btn-more-actions"
                onClick={handleToggle}
                title="Task actions"
                aria-label="Task actions"
            >
                ...
            </button>

            {isOpen && createPortal(
                <div
                    className="action-popup-bubble"
                    ref={bubbleRef}
                    style={{
                        position: 'fixed',
                        top: `${popupPos.top}px`,
                        left: `${popupPos.left}px`,
                        transform: 'translateY(-50%)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        className="popup-menu-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                            onEdit(task);
                        }}
                    >
                        Edit
                    </button>
                    <div className="popup-menu-divider"></div>
                    <button
                        type="button"
                        className="popup-menu-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                            onToggleCancel(task);
                        }}
                    >
                        {isCancelled ? 'Uncancel' : 'Cancel'}
                    </button>
                    <div className="popup-menu-divider"></div>
                    <button
                        type="button"
                        className="popup-menu-btn delete-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                            onDelete(task);
                        }}
                    >
                        Delete
                    </button>
                </div>,
                document.body
            )}
        </div>
    );
}

// Single Admin Task Card Component matching provided mockup design
function AdminTaskCardItem({ task, onEdit, onToggleCancel, onDelete }) {
    const priority = (task.priority || 'MEDIUM').toUpperCase();
    const status = (task.status || 'TODO').toUpperCase();

    // Border class calculation based on priority / status
    let borderClass = 'task-border-medium';
    if (status === 'CANCELLED') {
        borderClass = 'task-border-cancelled';
    } else if (priority === 'URGENT') {
        borderClass = 'task-border-urgent';
    } else if (priority === 'HIGH') {
        borderClass = 'task-border-high';
    } else if (priority === 'LOW') {
        borderClass = 'task-border-low';
    }

    const tagClass = getPriorityTagClass(priority);

    return (
        <div className={`admin-task-card-item ${borderClass}`} data-task-id={task.id}>
            {/* Left: ID + Title, Priority Tag, Status */}
            <div className="admin-task-left-section">
                <div className="admin-task-id-badge">{task.id}</div>
                <div className="admin-task-title-group">
                    <div className="admin-task-title-row">
                        <span className="admin-task-title">{task.title}</span>
                        <span className={`task-priority-tag ${tagClass}`}>{priority}</span>
                    </div>
                    <div className="admin-task-status-label">Status: {status}</div>
                </div>
            </div>

            {/* Middle Vertical Divider */}
            <div className="admin-task-middle-divider"></div>

            {/* Middle: Project Title (id:...) & Description */}
            <div className="admin-task-middle-section">
                <div className="admin-task-project-title">
                    {task.projectTitle || `Project ${task.projectId || 'N/A'}`}{' '}
                    <span className="admin-task-project-id">(id:{task.projectId || 'N/A'})</span>
                </div>
                <div className="admin-task-desc" title={task.description || ''}>
                    {task.description || 'No description provided.'}
                </div>
            </div>

            {/* Right: Assignee, Assigner Badges & Date Range */}
            <div className="admin-task-right-section">
                <div className="admin-task-badges-row">
                    <span className="admin-task-pill-badge">
                        Assignee: <span className="admin-task-pill-bold">{task.assignee || 'Unassigned'}</span>
                    </span>
                    <span className="admin-task-pill-badge">
                        Assigner: <span className="admin-task-pill-bold">{task.assigner || 'Admin'}</span>
                    </span>
                </div>
                <div className="admin-task-dates">
                    {task.dates || 'No dates set'}
                </div>
            </div>

            {/* Far Right: '...' Actions Menu */}
            <div className="admin-task-menu-section">
                <TaskActionMenu
                    task={task}
                    onEdit={onEdit}
                    onToggleCancel={onToggleCancel}
                    onDelete={onDelete}
                />
            </div>
        </div>
    );
}

// Tasks Tab Content
function TasksTabContent({
    tasks,
    searchQuery,
    onSearchChange,
    onEditTask,
    onToggleCancelTask,
    onDeleteTask,
    onCreateTask,
    loading
}) {
    const filteredTasks = (tasks || [])
        .filter(task => {
            const query = searchQuery.toLowerCase().trim();
            if (!query) return true;
            const fullText = `${task.id} ${task.title} ${task.projectTitle || ''} ${task.projectId || ''} ${task.assignee || ''} ${task.assigner || ''} ${task.priority || ''} ${task.status || ''} ${task.description || ''} ${task.dates || ''}`.toLowerCase();
            return fullText.includes(query);
        })
        .sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));

    return (
        <div>
            {/* Top Toolbar: Create Task button + Search Bar on rightmost side */}
            <div className="tab-toolbar">
                <button
                    type="button"
                    className="btn-create-user-toolbar"
                    onClick={onCreateTask}
                >
                    + Create Task
                </button>
                <div className="tab-search-container">
                    <svg className="tab-search-icon" viewBox="0 0 24 24">
                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                    </svg>
                    <input
                        type="text"
                        className="tab-search-input"
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
            </div>

            {/* Global Tasks List */}
            <div className="projects-scroll-wrapper">
                {loading && tasks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#888888' }}>
                        <p style={{ fontSize: '15px' }}>Loading global tasks...</p>
                    </div>
                ) : filteredTasks.length > 0 ? (
                    filteredTasks.map((task) => (
                        <AdminTaskCardItem
                            key={task.id}
                            task={task}
                            onEdit={onEditTask}
                            onToggleCancel={onToggleCancelTask}
                            onDelete={onDeleteTask}
                        />
                    ))
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#888888' }}>
                        <p style={{ fontSize: '15px' }}>No tasks found matching "{searchQuery}".</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Create Task Modal Component
function CreateTaskModal({ projects, users, loadingUsers, onFetchUsers, onSave, onCancel, isSubmitting, defaultAssigner }) {
    const [formData, setFormData] = useState({
        projectId: projects && projects.length > 0 ? String(projects[0].id) : '',
        title: '',
        description: '',
        priority: 'MEDIUM',
        status: 'TODO',
        assignee: '',
        assigner: defaultAssigner || 'Admin',
        startDate: '',
        dueDate: ''
    });
    const [userModalTarget, setUserModalTarget] = useState(null); // 'assignee' | 'assigner' | null

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleOpenUserModal = (target) => {
        setUserModalTarget(target);
        if ((!users || users.length === 0) && onFetchUsers) {
            onFetchUsers();
        }
    };

    const handleSelectUser = (u) => {
        const selectedName = typeof u === 'string' ? u : (u?.username || u?.fullname || '');
        if (userModalTarget === 'assignee') {
            handleChange('assignee', selectedName);
        } else if (userModalTarget === 'assigner') {
            handleChange('assigner', selectedName);
        }
        setUserModalTarget(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <React.Fragment>
            <div className="modal-overlay" onClick={onCancel}>
                <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                    <h2 className="modal-title">Create Task</h2>
                    <form onSubmit={handleSubmit}>
                        {/* Target Project */}
                        <div className="form-group">
                            <label className="form-label">Project *</label>
                            <select
                                className="form-select"
                                value={formData.projectId}
                                onChange={(e) => handleChange('projectId', e.target.value)}
                                required
                            >
                                {projects && projects.length > 0 ? (
                                    projects.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.title || p.name || `Project ${p.id}`} (id:{p.id})
                                        </option>
                                    ))
                                ) : (
                                    <option value="1">Default Project (id:1)</option>
                                )}
                            </select>
                        </div>

                        {/* Task Title */}
                        <div className="form-group">
                            <label className="form-label">Task Title *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.title}
                                onChange={(e) => handleChange('title', e.target.value)}
                                placeholder="e.g. Implement feature..."
                                required
                            />
                        </div>

                        {/* Assignee Selection */}
                        <div className="form-group">
                            <label className="form-label">Assignee</label>
                            <div className="input-with-button-row">
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.assignee}
                                    onChange={(e) => handleChange('assignee', e.target.value)}
                                    placeholder="e.g. Khanig, KDT"
                                />
                                <button
                                    type="button"
                                    className="btn-search-user"
                                    title="Search and select assignee"
                                    onClick={() => handleOpenUserModal('assignee')}
                                >
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Assigner Selection */}
                        <div className="form-group">
                            <label className="form-label">Assigner</label>
                            <div className="input-with-button-row">
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.assigner}
                                    onChange={(e) => handleChange('assigner', e.target.value)}
                                    placeholder="e.g. Admin, KDT"
                                />
                                <button
                                    type="button"
                                    className="btn-search-user"
                                    title="Search and select assigner"
                                    onClick={() => handleOpenUserModal('assigner')}
                                >
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Priority & Status */}
                        <div className="form-row-dates">
                            <div className="form-group half-width">
                                <label className="form-label">Priority</label>
                                <select
                                    className="form-select"
                                    value={formData.priority}
                                    onChange={(e) => handleChange('priority', e.target.value)}
                                >
                                    <option value="LOW">LOW</option>
                                    <option value="MEDIUM">MEDIUM</option>
                                    <option value="HIGH">HIGH</option>
                                    <option value="URGENT">URGENT</option>
                                </select>
                            </div>

                            <div className="form-group half-width">
                                <label className="form-label">Status</label>
                                <select
                                    className="form-select"
                                    value={formData.status}
                                    onChange={(e) => handleChange('status', e.target.value)}
                                >
                                    <option value="TODO">TODO</option>
                                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                                    <option value="DONE">DONE</option>
                                    <option value="CANCELLED">CANCELLED</option>
                                </select>
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="form-row-dates">
                            <div className="form-group half-width">
                                <label className="form-label">Start Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.startDate}
                                    onChange={(e) => handleChange('startDate', e.target.value)}
                                />
                            </div>

                            <div className="form-group half-width">
                                <label className="form-label">Due Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.dueDate}
                                    onChange={(e) => handleChange('dueDate', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea
                                className="form-textarea"
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="Task description..."
                            />
                        </div>

                        <div className="modal-btn-row">
                            <button type="button" className="btn-modal-cancel" onClick={onCancel}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-modal-save" disabled={isSubmitting}>
                                {isSubmitting ? 'Creating...' : 'Create Task'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* User Selection Modal Prompt */}
            <UserSelectModal
                isOpen={!!userModalTarget}
                onClose={() => setUserModalTarget(null)}
                users={users}
                loading={loadingUsers}
                onSelectUser={handleSelectUser}
            />
        </React.Fragment>
    );
}

// Edit Task Modal Component
function EditTaskModal({ task, projects, users, loadingUsers, onFetchUsers, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        projectId: task.projectId || (projects && projects.length > 0 ? String(projects[0].id) : ''),
        title: task.title || '',
        description: task.description || task.desc || '',
        priority: (task.priority || 'MEDIUM').toUpperCase(),
        status: (task.status || 'TODO').toUpperCase(),
        assignee: task.assignee || '',
        assigner: task.assigner || '',
        startDate: task.startDate || '',
        dueDate: task.dueDate || ''
    });
    const [userModalTarget, setUserModalTarget] = useState(null); // 'assignee' | 'assigner' | null

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleOpenUserModal = (target) => {
        setUserModalTarget(target);
        if ((!users || users.length === 0) && onFetchUsers) {
            onFetchUsers();
        }
    };

    const handleSelectUser = (u) => {
        const selectedName = typeof u === 'string' ? u : (u?.username || u?.fullname || '');
        if (userModalTarget === 'assignee') {
            handleChange('assignee', selectedName);
        } else if (userModalTarget === 'assigner') {
            handleChange('assigner', selectedName);
        }
        setUserModalTarget(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData, task);
    };

    return (
        <React.Fragment>
            <div className="modal-overlay" onClick={onCancel}>
                <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                    <h2 className="modal-title">Edit Task (id:{task.id})</h2>
                    <form onSubmit={handleSubmit}>
                        {/* Target Project */}
                        <div className="form-group">
                            <label className="form-label">Project</label>
                            <select
                                className="form-select"
                                value={formData.projectId}
                                onChange={(e) => handleChange('projectId', e.target.value)}
                            >
                                {projects && projects.length > 0 ? (
                                    projects.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.title || p.name || `Project ${p.id}`} (id:{p.id})
                                        </option>
                                    ))
                                ) : (
                                    <option value={task.projectId || "1"}>
                                        {task.projectTitle || `Project ${task.projectId || '1'}`} (id:{task.projectId || '1'})
                                    </option>
                                )}
                            </select>
                        </div>

                        {/* Task Title */}
                        <div className="form-group">
                            <label className="form-label">Task Title</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.title}
                                onChange={(e) => handleChange('title', e.target.value)}
                                placeholder="Task title..."
                                required
                            />
                        </div>

                        {/* Assignee Selection */}
                        <div className="form-group">
                            <label className="form-label">Assignee</label>
                            <div className="input-with-button-row">
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.assignee}
                                    onChange={(e) => handleChange('assignee', e.target.value)}
                                    placeholder="e.g. Khanig, KDT"
                                />
                                <button
                                    type="button"
                                    className="btn-search-user"
                                    title="Search and select assignee"
                                    onClick={() => handleOpenUserModal('assignee')}
                                >
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Assigner Selection */}
                        <div className="form-group">
                            <label className="form-label">Assigner</label>
                            <div className="input-with-button-row">
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.assigner}
                                    onChange={(e) => handleChange('assigner', e.target.value)}
                                    placeholder="e.g. Admin, KDT"
                                />
                                <button
                                    type="button"
                                    className="btn-search-user"
                                    title="Search and select assigner"
                                    onClick={() => handleOpenUserModal('assigner')}
                                >
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Priority & Status */}
                        <div className="form-row-dates">
                            <div className="form-group half-width">
                                <label className="form-label">Priority</label>
                                <select
                                    className="form-select"
                                    value={formData.priority}
                                    onChange={(e) => handleChange('priority', e.target.value)}
                                >
                                    <option value="LOW">LOW</option>
                                    <option value="MEDIUM">MEDIUM</option>
                                    <option value="HIGH">HIGH</option>
                                    <option value="URGENT">URGENT</option>
                                </select>
                            </div>

                            <div className="form-group half-width">
                                <label className="form-label">Status</label>
                                <select
                                    className="form-select"
                                    value={formData.status}
                                    onChange={(e) => handleChange('status', e.target.value)}
                                >
                                    <option value="TODO">TODO</option>
                                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                                    <option value="DONE">DONE</option>
                                    <option value="CANCELLED">CANCELLED</option>
                                </select>
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="form-row-dates">
                            <div className="form-group half-width">
                                <label className="form-label">Start Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.startDate}
                                    onChange={(e) => handleChange('startDate', e.target.value)}
                                />
                            </div>

                            <div className="form-group half-width">
                                <label className="form-label">Due Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.dueDate}
                                    onChange={(e) => handleChange('dueDate', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea
                                className="form-textarea"
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="Task description..."
                            />
                        </div>

                        <div className="modal-btn-row">
                            <button type="button" className="btn-modal-cancel" onClick={onCancel}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-modal-save">
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* User Selection Modal Prompt */}
            <UserSelectModal
                isOpen={!!userModalTarget}
                onClose={() => setUserModalTarget(null)}
                users={users}
                loading={loadingUsers}
                onSelectUser={handleSelectUser}
            />
        </React.Fragment>
    );
}

// Delete Task Confirmation Modal
function DeleteTaskConfirmModal({ task, onConfirm, onCancel }) {
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title" style={{ color: '#e53935' }}>Delete Task?</h2>
                <p style={{ fontSize: '14.5px', color: '#555555', lineHeight: 1.5, marginBottom: '20px' }}>
                    Are you sure you want to permanently delete <strong>{task.title}</strong> (id:{task.id})? This action cannot be undone.
                </p>
                <div className="modal-btn-row">
                    <button type="button" className="btn-modal-cancel" onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn-modal-danger"
                        onClick={() => onConfirm(task)}
                    >
                        Delete Task
                    </button>
                </div>
            </div>
        </div>
    );
}

// Appeal Action Menu Component with Accept and Reject
function AppealActionMenu({ appeal, onAccept, onReject }) {
    const [isOpen, setIsOpen] = useState(false);
    const btnRef = useRef(null);
    const bubbleRef = useRef(null);
    const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });

    const updatePosition = () => {
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPopupPos({
                top: rect.top + rect.height / 2,
                left: rect.right + 24
            });
        }
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                btnRef.current && !btnRef.current.contains(e.target) &&
                bubbleRef.current && !bubbleRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };

        const handleScrollOrResize = () => {
            if (isOpen) {
                updatePosition();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', handleScrollOrResize, true);
            window.addEventListener('resize', handleScrollOrResize);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [isOpen]);

    const handleToggle = (e) => {
        e.stopPropagation();
        if (!isOpen) {
            updatePosition();
        }
        setIsOpen((prev) => !prev);
    };

    return (
        <div className="action-popup-wrapper">
            <button
                type="button"
                ref={btnRef}
                className="btn-appeal-action"
                onClick={handleToggle}
                title="Appeal actions"
                aria-label="Appeal actions"
            >
                Action
            </button>

            {isOpen && createPortal(
                <div
                    className="action-popup-bubble user-action-popup-bubble"
                    ref={bubbleRef}
                    style={{
                        position: 'fixed',
                        top: `${popupPos.top}px`,
                        left: `${popupPos.left}px`,
                        transform: 'translateY(-50%)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        className="popup-menu-btn accept-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                            onAccept(appeal);
                        }}
                    >
                        Accept
                    </button>
                    <div className="popup-menu-divider"></div>
                    <button
                        type="button"
                        className="popup-menu-btn delete-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                            onReject(appeal);
                        }}
                    >
                        Reject
                    </button>
                </div>,
                document.body
            )}
        </div>
    );
}

// Single Appeal Card Component
function AppealCardItem({ appeal, onView, onAccept, onReject }) {
    return (
        <div className="user-card-item user-outline-blocked appeal-card-item" data-appeal-id={appeal.id}>
            {/* Left side: ID, Avatar of banned user, Fullname, @username, User's ID below names */}
            <div className="user-card-left">
                <div className="user-id-badge">{appeal.id}</div>
                <img
                    src={appeal.image || getUserAvatarUrl(appeal.username)}
                    alt={appeal.fullname || appeal.username}
                    className="user-avatar-thumb"
                    onError={(e) => { e.target.src = '/ProfilePic/0.jpg'; }}
                />
                <div className="user-identity-info">
                    <div className="user-name-row">
                        <span className="user-fullname">{appeal.fullname}</span>
                        <span className="user-username">@{appeal.username}</span>
                    </div>
                    <div className="user-role-label">User ID: {appeal.userId}</div>
                </div>
            </div>

            {/* Right side: View button and Action menu */}
            <div className="user-card-right appeal-card-right">
                <button
                    type="button"
                    className="btn-view-appeal"
                    onClick={() => onView(appeal)}
                >
                    View
                </button>
                <AppealActionMenu
                    appeal={appeal}
                    onAccept={onAccept}
                    onReject={onReject}
                />
            </div>
        </div>
    );
}

// Appeals Tab Content
function AppealsTabContent({
    appeals,
    searchQuery,
    onSearchChange,
    onViewAppeal,
    onAcceptAppeal,
    onRejectAppeal,
    loading
}) {
    const filteredAppeals = (appeals || [])
        .filter(appeal => {
            const query = searchQuery.toLowerCase().trim();
            if (!query) return true;
            const fullText = `${appeal.id} ${appeal.userId || ''} ${appeal.fullname || ''} ${appeal.username || ''} ${appeal.reason || ''} ${appeal.status || ''}`.toLowerCase();
            return fullText.includes(query);
        })
        .sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));

    return (
        <div>
            {/* Top Right Search Bar */}
            <div className="tab-toolbar">
                <div className="tab-search-container">
                    <svg className="tab-search-icon" viewBox="0 0 24 24">
                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                    </svg>
                    <input
                        type="text"
                        className="tab-search-input"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
            </div>

            {/* Appeals List */}
            <div className="projects-scroll-wrapper">
                {loading && appeals.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#888888' }}>
                        <p style={{ fontSize: '15px' }}>Loading appeals...</p>
                    </div>
                ) : filteredAppeals.length > 0 ? (
                    filteredAppeals.map((appeal) => (
                        <AppealCardItem
                            key={appeal.id}
                            appeal={appeal}
                            onView={onViewAppeal}
                            onAccept={onAcceptAppeal}
                            onReject={onRejectAppeal}
                        />
                    ))
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#888888' }}>
                        <p style={{ fontSize: '15px' }}>No appeals found matching "{searchQuery}".</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// View Appeal Details Modal Prompt
function ViewAppealModal({ appeal, onClose }) {
    if (!appeal) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card appeal-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="members-modal-header" style={{ marginBottom: '16px', paddingBottom: '12px' }}>
                    <h2 className="modal-title" style={{ margin: 0 }}>Appeal Details (id:{appeal.id})</h2>
                    <button
                        type="button"
                        className="members-modal-close-btn"
                        aria-label="Close"
                        onClick={onClose}
                    >
                        &times;
                    </button>
                </div>

                <div className="appeal-modal-user-header">
                    <img
                        src={appeal.image || getUserAvatarUrl(appeal.username)}
                        alt={appeal.fullname || appeal.username}
                        className="appeal-modal-avatar"
                        onError={(e) => { e.target.src = '/ProfilePic/0.jpg'; }}
                    />
                    <div className="appeal-modal-user-info">
                        <div className="appeal-modal-name-row">
                            <span className="appeal-modal-fullname">{appeal.fullname}</span>
                            <span className="appeal-modal-username">@{appeal.username}</span>
                        </div>
                        <div className="appeal-modal-meta-row">
                            <span>User ID: <strong>{appeal.userId}</strong></span>
                            {appeal.createdAt && (
                                <span>Date: <strong>{appeal.createdAt}</strong></span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="form-group" style={{ marginTop: '16px' }}>
                    <label className="form-label">Appeal Reason</label>
                    <div className="appeal-modal-reason-box">
                        {appeal.reason || 'No appeal reason provided.'}
                    </div>
                </div>

                <div className="modal-btn-row">
                    <button type="button" className="btn-modal-save" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// Single User Report Card Component
function ReportCardItem({ report, onView }) {
    return (
        <div className="report-card-item">
            {/* Left side: ID (simple number), Author Avatar, Author Fullname, (id:{id}) & @username */}
            <div className="report-card-left">
                <span className="report-card-id-number">{report.id}</span>
                <img
                    src={report.authorImage || getUserAvatarUrl(report.author)}
                    alt={report.authorFullname || report.author}
                    className="report-card-avatar"
                    onError={(e) => { e.target.src = '/ProfilePic/0.jpg'; }}
                />
                <div className="report-card-user-info">
                    <div className="report-user-name-row">
                        <span className="report-card-fullname">{report.authorFullname || report.author}</span>
                        {report.authorId && <span className="report-user-id-text">(id:{report.authorId})</span>}
                    </div>
                    <span className="report-card-username">@{report.author}</span>
                </div>
            </div>

            {/* Right side: reporting user, target avatar, target fullname, (id:{id}) & @username (slightly red), view button in light blue */}
            <div className="report-card-right">
                <div className="report-target-group">
                    <span className="report-target-label">reporting user:</span>
                    <img
                        src={report.targetImage || getUserAvatarUrl(report.targetUsername)}
                        alt={report.targetFullname || report.targetUsername}
                        className="report-card-avatar"
                        onError={(e) => { e.target.src = '/ProfilePic/0.jpg'; }}
                    />
                    <div className="report-card-user-info">
                        <div className="report-user-name-row">
                            <span className="report-card-fullname">{report.targetFullname || report.targetUsername}</span>
                            {report.targetId && <span className="report-user-id-text">(id:{report.targetId})</span>}
                        </div>
                        <span className="report-card-username">@{report.targetUsername}</span>
                    </div>
                </div>
                <button
                    type="button"
                    className="btn-view-report"
                    onClick={() => onView(report)}
                >
                    View
                </button>
            </div>
        </div>
    );
}

// User Reports Tab Content Component
function ReportsTabContent({
    reports,
    searchQuery,
    onSearchChange,
    onViewReport,
    loading
}) {
    const filteredReports = (reports || [])
        .filter(r => {
            const query = searchQuery.toLowerCase().trim();
            if (!query) return true;
            const fullText = `${r.id} ${r.type || ''} ${r.author || ''} ${r.authorFullname || ''} ${r.authorId || ''} ${r.targetUsername || ''} ${r.targetFullname || ''} ${r.targetId || ''} ${r.reason || ''} ${r.explanation || ''}`.toLowerCase();
            return fullText.includes(query);
        })
        .sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));

    return (
        <div>
            {/* Top Search Bar */}
            <div className="tab-toolbar">
                <div className="tab-search-container">
                    <svg className="tab-search-icon" viewBox="0 0 24 24">
                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                    </svg>
                    <input
                        type="text"
                        className="tab-search-input"
                        placeholder="Search reports..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
            </div>

            {/* Reports List */}
            <div className="projects-scroll-wrapper">
                {loading && reports.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#888888' }}>
                        <p style={{ fontSize: '15px' }}>Loading reports...</p>
                    </div>
                ) : filteredReports.length > 0 ? (
                    filteredReports.map((report) => (
                        <ReportCardItem
                            key={report.id}
                            report={report}
                            onView={onViewReport}
                        />
                    ))
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#888888' }}>
                        <p style={{ fontSize: '15px' }}>No reports found matching "{searchQuery}".</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// View Report Details Modal Prompt
function ViewReportModal({ report, onClose, onBlock, onDismiss }) {
    if (!report) return null;

    // Helper to parse PostgreSQL list string e.g. {"line 1","line 2"} or array
    const parseExplanationLines = (exp) => {
        if (!exp) return [];
        if (Array.isArray(exp)) return exp;
        if (typeof exp === 'string') {
            const trimmed = exp.trim();
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                const inner = trimmed.slice(1, -1);
                const matched = inner.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
                if (matched) {
                    return matched.map(item => item.replace(/^"|"$/g, '').replace(/\\"/g, '"').trim());
                }
            }
            return trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        }
        return [String(exp)];
    };

    const explanationLines = parseExplanationLines(report.explanation);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card report-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="members-modal-header" style={{ marginBottom: '16px', paddingBottom: '12px' }}>
                    <h2 className="modal-title" style={{ margin: 0 }}>Report Details (id:{report.id})</h2>
                    <button
                        type="button"
                        className="members-modal-close-btn"
                        aria-label="Close"
                        onClick={onClose}
                    >
                        &times;
                    </button>
                </div>

                <div className="report-modal-users-grid">
                    {/* Reporter User Box */}
                    <div className="report-modal-user-box">
                        <div className="report-modal-box-title">Submitted By</div>
                        <div className="report-modal-user-row">
                            <img
                                src={report.authorImage || getUserAvatarUrl(report.author)}
                                alt={report.authorFullname || report.author}
                                className="report-card-avatar"
                                onError={(e) => { e.target.src = '/ProfilePic/0.jpg'; }}
                            />
                            <div className="report-card-user-info">
                                <div className="report-user-name-row">
                                    <span className="report-card-fullname">{report.authorFullname || report.author}</span>
                                    {report.authorId && <span className="report-user-id-text">(id:{report.authorId})</span>}
                                </div>
                                <span className="report-card-username">@{report.author}</span>
                            </div>
                        </div>
                    </div>

                    {/* Reported Target Box */}
                    <div className="report-modal-user-box target-user-box">
                        <div className="report-modal-box-title">Reported User (Target)</div>
                        <div className="report-modal-user-row">
                            <img
                                src={report.targetImage || getUserAvatarUrl(report.targetUsername)}
                                alt={report.targetFullname || report.targetUsername}
                                className="report-card-avatar"
                                onError={(e) => { e.target.src = '/ProfilePic/0.jpg'; }}
                            />
                            <div className="report-card-user-info">
                                <div className="report-user-name-row">
                                    <span className="report-card-fullname">{report.targetFullname || report.targetUsername}</span>
                                    {report.targetId && <span className="report-user-id-text">(id:{report.targetId})</span>}
                                </div>
                                <span className="report-card-username">@{report.targetUsername}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
                    <span className="report-modal-meta-tag">Category: {report.type ? String(report.type).toUpperCase() : 'POST'}</span>
                    {report.createdAt && (
                        <span className="report-modal-meta-tag" style={{ backgroundColor: '#fafafa', color: '#777' }}>
                            Created: {report.createdAt}
                        </span>
                    )}
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label className="form-label">Violation Reason</label>
                    <div style={{ fontSize: '14.5px', fontWeight: '600', color: '#d93025' }}>
                        {report.reason || 'Inappropriate Content'}
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Explanation</label>
                    <div className="report-modal-explanation-box">
                        {explanationLines.length > 1 ? (
                            <ul className="report-explanation-list">
                                {explanationLines.map((line, idx) => (
                                    <li key={idx}>{line}</li>
                                ))}
                            </ul>
                        ) : (
                            <p style={{ margin: 0 }}>{explanationLines[0] || 'No detailed explanation provided.'}</p>
                        )}
                    </div>
                </div>

                <div className="modal-btn-row" style={{ marginTop: '20px' }}>
                    <button type="button" className="btn-modal-cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn-modal-dismiss"
                        onClick={() => onDismiss(report)}
                    >
                        DISMISS
                    </button>
                    <button
                        type="button"
                        className="btn-modal-block"
                        onClick={() => onBlock(report)}
                    >
                        BLOCK
                    </button>
                </div>
            </div>
        </div>
    );
}

// Initial Sample Admin Users
const initialAdminUsers = [
    {
        id: "1",
        fullname: "KDT",
        username: "KDT",
        role: "GOD",
        status: "ACTIVE",
        image: "/ProfilePic/KDT.jpg",
        joinDate: "(date here)"
    },
    {
        id: "2",
        fullname: "Khang nig",
        username: "Turtlely",
        role: "ADMIN",
        status: "ACTIVE",
        image: "/ProfilePic/Turtlely.jpg",
        joinDate: "(date here)"
    },
    {
        id: "3",
        fullname: "Ngo Do",
        username: "NgoDo",
        role: "MEMBER",
        status: "ACTIVE",
        image: "/ProfilePic/NgoDo.jpg",
        joinDate: "(date here)"
    },
    {
        id: "4",
        fullname: "Eternal DESTROYER",
        username: "CodeMaster",
        role: "MEMBER",
        status: "BLOCKED",
        image: "/ProfilePic/0.jpg",
        joinDate: "(date here)"
    },
    {
        id: "5",
        fullname: "dds",
        username: "dds",
        role: "MEMBER",
        status: "ACTIVE",
        image: "/ProfilePic/dds.jpg",
        joinDate: "(date here)"
    }
];

// Inner Admin Panel Content with TanStack Query
function AdminPanelContent() {
    const { isDark } = useTheme();
    const client = useQueryClient();

    // Active Tab State ('projects', 'tasks', 'users', 'reports')
    const [activeTab, setActiveTab] = useState('projects');

    // Search query state within projects tab, users tab, appeals tab & reports tab
    const [projectSearch, setProjectSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [appealSearch, setAppealSearch] = useState('');
    const [reportSearch, setReportSearch] = useState('');
    const [taskSearch, setTaskSearch] = useState('');

    // Modal & Universal Toast States
    const [editingProject, setEditingProject] = useState(null);
    const [deletingProject, setDeletingProject] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
    const [creatingUser, setCreatingUser] = useState(false);
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [creatingTask, setCreatingTask] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [deletingTask, setDeletingTask] = useState(null);
    const [viewingAppeal, setViewingAppeal] = useState(null);
    const [viewingReport, setViewingReport] = useState(null);
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [membersModalConfig, setMembersModalConfig] = useState({
        isOpen: false,
        title: 'Edit Members',
        users: [],
        projectUserIds: [],
        isEditMode: false,
        projectOwner: '',
        targetProject: null
    });
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    // 1. Shared Cached Current Authenticated User
    const {
        currentUser,
        isAuthorizedAdmin,
        isLoading: authChecking
    } = useCurrentUser();

    // 2. TanStack Query: Global Users List
    const {
        data: usersList = [],
        isLoading: loadingUsers,
        isError: usersError,
        refetch: fetchUsers
    } = useQuery({
        queryKey: ['adminUsers'],
        queryFn: async () => {
            let data;
            try {
                data = await request.get('/api/admin/users');
            } catch (adminErr) {
                data = await request.get('/api/users');
            }
            const userList = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : null);
            if (userList && userList.length > 0) {
                return userList.map(u => ({
                    id: String(u.id || u._id || ''),
                    fullname: u.fullname || u.full_name || u.fullName || u.name || u.username || 'User',
                    username: u.username || '',
                    email: u.email || '',
                    about: u.about || u.bio || '',
                    role: (u.role || 'MEMBER').toUpperCase(),
                    status: (u.status || (u.deleted ? 'INACTIVE' : 'ACTIVE')).toUpperCase(),
                    image: u.image || getUserAvatarUrl(u.username),
                    joinDate: u.joinDate || u.createdAt || u.created_at || '(date here)',
                    deleted: !!u.deleted
                })).sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
            }
            return initialAdminUsers;
        },
        enabled: isAuthorizedAdmin
    });

    const adminUsers = usersList;

    // 3. TanStack Query: Global Projects List
    const {
        data: projects = [],
        isLoading: loading,
        isError: projectsError,
        refetch: fetchAllProjects
    } = useQuery({
        queryKey: ['adminProjects'],
        queryFn: async () => {
            const pData = await request.get('/api/projects');
            const pList = Array.isArray(pData) ? pData : (pData && Array.isArray(pData.data) ? pData.data : []);
            if (pList && pList.length > 0) {
                const projectPromises = pList.map(async (p) => {
                    const parsed = parseStartAndDueDate(p);
                    const datesFormatted = p.dates || (parsed.startDate && parsed.dueDate
                        ? `${parsed.startDate} - ${parsed.dueDate}`
                        : (parsed.startDate || parsed.dueDate || ''));

                    let pUsers = [];
                    if (p.users && Array.isArray(p.users) && p.users.length > 0) {
                        pUsers = p.users.map(u => ({
                            id: String(u.id || u._id || ''),
                            fullname: u.fullname || u.full_name || u.fullName || u.name || u.username || 'User',
                            username: u.username || '',
                            image: u.image || getUserAvatarUrl(u.username)
                        }));
                    } else {
                        try {
                            const pUsersRes = await request.get(`/api/users?projectId=${p.id}`);
                            const uList = Array.isArray(pUsersRes) ? pUsersRes : (pUsersRes && Array.isArray(pUsersRes.data) ? pUsersRes.data : []);
                            if (uList && uList.length > 0) {
                                pUsers = uList.map(u => ({
                                    id: String(u.id || u._id || ''),
                                    fullname: u.fullname || u.full_name || u.fullName || u.name || u.username || 'User',
                                    username: u.username || '',
                                    image: u.image || getUserAvatarUrl(u.username)
                                }));
                            }
                        } catch (dErr) {
                            // ignore error
                        }
                    }

                    if (pUsers.length === 0 && (p.owner || p.createdBy || p.ownerName)) {
                        const oName = p.owner || p.createdBy || p.ownerName;
                        pUsers = [{
                            id: 'owner-1',
                            fullname: oName,
                            username: oName,
                            image: getUserAvatarUrl(oName)
                        }];
                    }

                    return {
                        id: String(p.id || p._id || ''),
                        title: p.title || p.name || `Project ${p.id}`,
                        name: p.name || p.title || `Project ${p.id}`,
                        owner: p.owner || p.createdBy || p.ownerName || 'KDT',
                        desc: p.description || p.desc || '',
                        description: p.description || p.desc || '',
                        status: (p.status || 'ACTIVE').toUpperCase(),
                        startDate: parsed.startDate,
                        dueDate: parsed.dueDate,
                        dates: datesFormatted,
                        users: pUsers
                    };
                });

                const formatted = (await Promise.all(projectPromises)).sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
                return formatted;
            }
            return [];
        },
        enabled: isAuthorizedAdmin
    });

    // 4. TanStack Query: Global Tasks List
    const {
        data: adminTasks = [],
        isLoading: tasksLoading,
        isError: tasksError,
        refetch: fetchAllTasks
    } = useQuery({
        queryKey: ['adminTasks'],
        queryFn: async () => {
            let projs = [];
            try {
                const pData = await request.get('/api/projects');
                projs = Array.isArray(pData) ? pData : (pData && Array.isArray(pData.data) ? pData.data : []);
            } catch (pErr) {
                console.error('Failed to get projects for task fetching:', pErr);
            }

            let allTasks = [];
            if (projs && projs.length > 0) {
                const taskPromises = projs.map(async (p) => {
                    const projId = p.id;
                    const projTitle = p.title || p.name || `Project ${projId}`;
                    try {
                        const taskRes = await request.get(`/api/projects/${projId}/tasks`);
                        const tList = Array.isArray(taskRes) ? taskRes : (taskRes && Array.isArray(taskRes.data) ? taskRes.data : []);
                        return tList.map(t => {
                            const parsed = parseStartAndDueDate(t);
                            const datesFormatted = t.dates || (parsed.startDate && parsed.dueDate
                                ? `${parsed.startDate} - ${parsed.dueDate}`
                                : (parsed.startDate || parsed.dueDate || ''));

                            return {
                                id: String(t.id || t._id || ''),
                                title: t.title || t.name || 'Task',
                                priority: (t.priority || 'MEDIUM').toUpperCase(),
                                status: (t.status || 'TODO').toUpperCase(),
                                projectId: String(projId),
                                projectTitle: projTitle,
                                description: t.description || t.desc || '',
                                assignee: t.assignee || t.assignedTo || t.userName || t.username || 'Unassigned',
                                assigner: t.assigner || t.createdBy || t.owner || 'Admin',
                                startDate: parsed.startDate,
                                dueDate: parsed.dueDate,
                                dates: datesFormatted
                            };
                        });
                    } catch (tErr) {
                        console.error(`Failed to fetch tasks for project ${projId}:`, tErr);
                        return [];
                    }
                });

                const results = await Promise.all(taskPromises);
                allTasks = results.flat().sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
            }
            return allTasks;
        },
        enabled: isAuthorizedAdmin
    });

    // 5. TanStack Query: Appeals List
    const {
        data: appealsList = [],
        isLoading: appealsLoading,
        isError: appealsError,
        refetch: fetchAppeals
    } = useQuery({
        queryKey: ['adminAppeals'],
        queryFn: async () => {
            const data = await request.get('/api/appeals');
            const list = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
            if (list && list.length > 0) {
                const knownUsers = usersList || [];
                return list.map((a, idx) => {
                    const appealId = String(a.id || a._id || idx + 1);
                    const uname = a.username || a.userName || a.user?.username || '';
                    const uMatch = knownUsers.find(u =>
                        (a.userId && String(u.id) === String(a.userId)) ||
                        (uname && u.username && u.username.toLowerCase() === uname.toLowerCase())
                    );
                    return {
                        id: appealId,
                        userId: String(a.userId || a.user_id || a.user?.id || (uMatch ? uMatch.id : 'N/A')),
                        username: uname || (uMatch ? uMatch.username : 'Unknown'),
                        fullname: a.fullname || a.full_name || a.name || (uMatch ? uMatch.fullname : (uname || 'User')),
                        image: a.image || (uMatch ? uMatch.image : (uname ? getUserAvatarUrl(uname) : '/ProfilePic/0.jpg')),
                        reason: a.reason || a.appealReason || a.description || a.message || '',
                        status: (a.status || 'PENDING').toUpperCase(),
                        createdAt: a.createdAt || a.created_at || a.date || ''
                    };
                }).sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
            }
            return [];
        },
        enabled: isAuthorizedAdmin
    });

    // 6. TanStack Query: User Reports List
    const {
        data: reportsList = [],
        isLoading: reportsLoading,
        isError: reportsError,
        refetch: fetchReports
    } = useQuery({
        queryKey: ['adminReports'],
        queryFn: async () => {
            let data;
            try {
                data = await request.get('/api/reports');
            } catch (err1) {
                data = await request.get('/api/report');
            }
            const list = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
            if (list && list.length > 0) {
                const knownUsers = usersList || [];
                return list.map((r, idx) => {
                    const reportId = String(r.id || r._id || idx + 1);
                    const authorName = r.author || r.authorUsername || r.userName || '';
                    const targetName = r.targetUsername || r.target_username || r.target || '';

                    const authorMatch = knownUsers.find(u =>
                        (authorName && u.username && u.username.toLowerCase() === authorName.toLowerCase()) ||
                        (r.authorId && String(u.id) === String(r.authorId))
                    );
                    const targetMatch = knownUsers.find(u =>
                        (targetName && u.username && u.username.toLowerCase() === targetName.toLowerCase()) ||
                        (r.targetId && String(u.id) === String(r.targetId))
                    );

                    return {
                        id: reportId,
                        type: r.type || 'post',
                        authorId: String(r.authorId || r.author_id || (authorMatch ? authorMatch.id : '')),
                        author: authorName || (authorMatch ? authorMatch.username : 'Unknown'),
                        authorFullname: r.authorFullname || r.author_fullname || (authorMatch ? authorMatch.fullname : authorName),
                        authorImage: r.authorImage || (authorMatch ? authorMatch.image : (authorName ? getUserAvatarUrl(authorName) : '/ProfilePic/0.jpg')),
                        targetId: String(r.targetId || r.target_id || (targetMatch ? targetMatch.id : '')),
                        targetUsername: targetName || (targetMatch ? targetMatch.username : 'Unknown'),
                        targetFullname: r.targetFullname || r.target_fullname || (targetMatch ? targetMatch.fullname : targetName),
                        targetImage: r.targetImage || (targetMatch ? targetMatch.image : (targetName ? getUserAvatarUrl(targetName) : '/ProfilePic/0.jpg')),
                        reason: r.reason || '',
                        explanation: r.explanation || '',
                        createdAt: r.createdAt || r.created_at || r.date || ''
                    };
                }).sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
            }
            return [];
        },
        enabled: isAuthorizedAdmin
    });

    const handleOpenProjectUsers = (users, projectTitle) => {
        setMembersModalConfig({
            isOpen: true,
            title: `${projectTitle || 'Project'} USERS:`,
            users: users || [],
            projectUserIds: (users || []).map(u => String(u.id)),
            isEditMode: false,
            projectOwner: '',
            targetProject: null
        });
    };

    const handleOpenManageUsers = async (project) => {
        let pUsers = project.users || [];
        if (pUsers.length === 0 || pUsers.some(u => u.id === 'owner-1' || u.id === '0')) {
            try {
                const pUsersRes = await request.get(`/api/users?projectId=${project.id}`);
                const uList = Array.isArray(pUsersRes) ? pUsersRes : (pUsersRes && Array.isArray(pUsersRes.data) ? pUsersRes.data : []);
                if (uList && uList.length > 0) {
                    pUsers = uList.map(u => ({
                        id: String(u.id || u._id || ''),
                        fullname: u.fullname || u.full_name || u.fullName || u.name || u.username || 'User',
                        username: u.username || '',
                        image: u.image || getUserAvatarUrl(u.username)
                    }));
                }
            } catch (err) {
                // ignore
            }
        }
        const pUserIds = pUsers.map(u => String(u.id));
        let listToUse = usersList;
        if (listToUse.length === 0) {
            const fetched = await fetchUsers();
            listToUse = fetched.data || [];
        }
        setMembersModalConfig({
            isOpen: true,
            title: 'Edit Members',
            users: listToUse,
            projectUserIds: pUserIds,
            isEditMode: true,
            projectOwner: project.owner || '',
            targetProject: { ...project, users: pUsers }
        });
    };

    // Add or remove user from a project via PUT /api/users/{ID}
    const handleToggleMember = async (user, isCurrentlyInProject) => {
        const project = membersModalConfig.targetProject;
        if (!project || !project.id) return;

        // Prevent removing the project owner
        const ownerIdentifier = typeof project.owner === 'object' && project.owner !== null
            ? (project.owner.username || project.owner.id || project.owner.name || project.owner.fullname || '')
            : String(project.owner || '');
        const o = ownerIdentifier.toLowerCase().trim();
        const isOwnerUser = o && (
            (user.username && user.username.toLowerCase().trim() === o) ||
            (user.fullname && user.fullname.toLowerCase().trim() === o) ||
            (user.name && user.name.toLowerCase().trim() === o) ||
            (user.id && String(user.id).toLowerCase().trim() === o)
        );
        if (isCurrentlyInProject && isOwnerUser) {
            return;
        }

        setActionLoadingId(String(user.id));
        try {
            // 1. Get user details from GET /api/users/{ID}
            const userRes = await request.get(`/api/users/${user.id}`);
            const userData = userRes?.data || userRes;
            const existingProjects = (userData && Array.isArray(userData.projects) ? userData.projects : [])
                .map(p => typeof p === 'object' && p !== null ? (p.id || p.projectId) : p);

            let updatedProjects;
            const pIdNum = !isNaN(Number(project.id)) ? Number(project.id) : project.id;

            if (isCurrentlyInProject) {
                updatedProjects = existingProjects.filter(pId => String(pId) !== String(project.id));
            } else {
                if (!existingProjects.some(pId => String(pId) === String(project.id))) {
                    updatedProjects = [...existingProjects, pIdNum];
                } else {
                    updatedProjects = existingProjects;
                }
            }

            // 2. PUT /api/users/{ID} with updated projects list
            await request.put(`/api/users/${user.id}`, {
                projects: updatedProjects
            });

            // 3. Invalidate TanStack query cache for projects
            client.invalidateQueries({ queryKey: ['adminProjects'] });

            // Update modal state
            setMembersModalConfig(prev => {
                const currentIds = prev.projectUserIds || [];
                const updatedIds = isCurrentlyInProject
                    ? currentIds.filter(id => id !== String(user.id))
                    : [...currentIds, String(user.id)];
                return {
                    ...prev,
                    projectUserIds: updatedIds,
                    targetProject: {
                        ...prev.targetProject,
                        users: isCurrentlyInProject
                            ? (prev.targetProject?.users || []).filter(u => String(u.id) !== String(user.id))
                            : [...(prev.targetProject?.users || []), user]
                    }
                };
            });

            showToast(
                isCurrentlyInProject
                    ? `Removed ${user.fullname || user.username} from "${project.title || project.name}".`
                    : `Added ${user.fullname || user.username} to "${project.title || project.name}".`,
                'success'
            );
        } catch (err) {
            console.error(`Failed to update project membership for user ${user.id}:`, err);
            showToast(`Failed to update project membership for ${user.fullname || user.username}.`, 'error');
        } finally {
            setActionLoadingId(null);
        }
    };

    // User Tab action handlers
    const handleEditUser = async (user) => {
        try {
            let uData;
            try {
                uData = await request.get(`/api/admin/users/${user.id}`);
            } catch (adminErr) {
                uData = await request.get(`/api/users/${user.id}`);
            }
            const u = uData?.data || uData || user;
            setEditingUser({
                ...user,
                fullname: u.fullname || u.full_name || u.fullName || u.name || user.fullname,
                username: u.username || user.username,
                email: u.email !== undefined ? u.email : (user.email || ''),
                about: u.about !== undefined ? u.about : (user.about || ''),
                status: (u.status || user.status || 'ACTIVE').toUpperCase(),
                role: (u.role || user.role || 'MEMBER').toUpperCase(),
                deleted: u.deleted !== undefined ? u.deleted : user.deleted
            });
        } catch (err) {
            console.error(`Failed to fetch user details for ${user.id}:`, err);
            setEditingUser(user);
        }
    };

    const handleSaveUser = async (formData, originalUser) => {
        const origFullname = (originalUser.fullname || originalUser.full_name || '').trim();
        const origUsername = (originalUser.username || '').trim();
        const origEmail = (originalUser.email || '').trim();
        const origStatus = (originalUser.status || 'ACTIVE').toUpperCase();
        const origRole = (originalUser.role || 'MEMBER').toUpperCase();
        const origAboutList = compileAboutToList(originalUser.about);

        const newFullname = (formData.fullname || '').trim();
        const newUsername = (formData.username || '').trim();
        const newEmail = (formData.email || '').trim();
        const newStatus = (formData.status || 'ACTIVE').toUpperCase();
        const newRole = (formData.role || 'MEMBER').toUpperCase();
        const newAboutList = compileAboutToList(formData.about);

        const payload = {
            fullname: newFullname !== origFullname ? newFullname : null,
            username: newUsername !== origUsername ? newUsername : null,
            email: newEmail !== origEmail ? newEmail : null,
            status: newStatus !== origStatus ? newStatus : null,
            role: newRole !== origRole ? newRole : null,
            about: JSON.stringify(newAboutList) !== JSON.stringify(origAboutList) ? newAboutList : null
        };

        try {
            await request.put(`/api/admin/users/${originalUser.id}`, payload);
            client.invalidateQueries({ queryKey: ['adminUsers'] });
            showToast(`User "${newUsername || newFullname}" updated successfully.`, 'success');
        } catch (err) {
            console.error(`Failed to update user ${originalUser.id}:`, err);
            showToast(`Failed to update user "${newUsername || newFullname}".`, 'error');
        }
        setEditingUser(null);
    };

    const handleTempBanUser = async (user) => {
        const isBanned = (user.status || '').toUpperCase() === 'BLOCKED' || (user.status || '').toUpperCase() === 'BANNED';
        const nextStatus = isBanned ? 'ACTIVE' : 'BLOCKED';

        try {
            await request.put(`/api/admin/users/${user.id}`, { status: nextStatus });
            client.invalidateQueries({ queryKey: ['adminUsers'] });
            showToast(
                isBanned
                    ? `User "${user.username || user.fullname}" has been unblocked.`
                    : `User "${user.username || user.fullname}" has been temporarily banned/blocked.`,
                'success'
            );
        } catch (err) {
            console.error(`Failed to update status for user ${user.id}:`, err);
            showToast(`Failed to update status for "${user.username || user.fullname}".`, 'error');
        }
    };

    const handleDeactivateUser = async (user) => {
        const nextDeleted = !user.deleted;
        const nextStatus = nextDeleted ? 'INACTIVE' : 'ACTIVE';

        try {
            await request.put(`/api/admin/users/${user.id}`, {
                status: nextStatus,
                deleted: nextDeleted
            });
            client.invalidateQueries({ queryKey: ['adminUsers'] });
            showToast(
                nextDeleted
                    ? `User "${user.username || user.fullname}" has been deactivated.`
                    : `User "${user.username || user.fullname}" has been reactivated.`,
                'success'
            );
        } catch (err) {
            console.error(`Failed to deactivate user ${user.id}:`, err);
            showToast(`Failed to update account status for "${user.username || user.fullname}".`, 'error');
        }
    };

    const handleCreateUser = async (newUserForm) => {
        setCreatingUser(true);
        try {
            const payload = {
                fullname: (newUserForm.fullname || '').trim(),
                username: (newUserForm.username || '').trim(),
                email: (newUserForm.email || '').trim(),
                password: (newUserForm.password || '').trim(),
                role: (newUserForm.role || 'MEMBER').toUpperCase(),
                status: (newUserForm.status || 'ACTIVE').toUpperCase(),
                about: compileAboutToList(newUserForm.about)
            };

            await request.post('/api/admin/users', payload);
            client.invalidateQueries({ queryKey: ['adminUsers'] });
            showToast(`User "${payload.username}" created successfully.`, 'success');
            setIsCreateUserOpen(false);
        } catch (err) {
            console.error('Failed to create user:', err);
            const errMsg = err?.response?.data?.message || err?.message || 'Failed to create user.';
            showToast(errMsg, 'error');
        } finally {
            setCreatingUser(false);
        }
    };

    // Project Tab action handlers
    const handleEditProject = (project) => {
        setEditingProject(project);
    };

    const handleSaveProject = async (formData, originalProject) => {
        const origDates = parseStartAndDueDate(originalProject);
        const origName = (originalProject.name || originalProject.title || '').trim();
        const origDescription = (originalProject.description || originalProject.desc || '').trim();
        const origStatus = (originalProject.status || 'ACTIVE').toUpperCase();
        const origOwner = (originalProject.owner || originalProject.createdBy || originalProject.ownerName || '').trim();
        const origStartDate = origDates.startDate;
        const origDueDate = origDates.dueDate;

        const newName = (formData.title !== undefined ? formData.title : (formData.name || '')).trim();
        const newDescription = (formData.desc !== undefined ? formData.desc : (formData.description || '')).trim();
        const newStatus = (formData.status || 'ACTIVE').toUpperCase();
        const newOwner = (formData.owner || '').trim();
        const newStartDate = toIsoDateString(formData.startDate);
        const newDueDate = toIsoDateString(formData.dueDate);

        const payload = {
            name: newName !== origName ? newName : null,
            description: newDescription !== origDescription ? newDescription : null,
            status: newStatus !== origStatus ? newStatus : null,
            owner: newOwner !== origOwner ? newOwner : null,
            startDate: newStartDate !== origStartDate ? (newStartDate || null) : null,
            dueDate: newDueDate !== origDueDate ? (newDueDate || null) : null
        };

        try {
            await request.put(`/api/projects/${originalProject.id}`, payload);
            client.invalidateQueries({ queryKey: ['adminProjects'] });
            showToast(`Project "${newName}" updated successfully.`, 'success');
        } catch (err) {
            console.error(`Failed to update project ${originalProject.id}:`, err);
            showToast(`Failed to update project "${newName}".`, 'error');
        }
        setEditingProject(null);
    };

    const handleArchiveProject = async (project) => {
        const isArchived = (project.status || '').toUpperCase() === 'ARCHIVED';
        const nextStatus = isArchived ? 'ACTIVE' : 'ARCHIVED';

        try {
            await request.put(`/api/projects/${project.id}`, { status: nextStatus });
            client.invalidateQueries({ queryKey: ['adminProjects'] });
            showToast(
                isArchived
                    ? `Project "${project.title || project.name}" unarchived successfully.`
                    : `Project "${project.title || project.name}" archived successfully.`,
                'success'
            );
        } catch (err) {
            console.error(`Failed to toggle archive on project ${project.id}:`, err);
            showToast(`Failed to archive project "${project.title || project.name}".`, 'error');
        }
    };

    const handleDeleteProject = (project) => {
        setDeletingProject(project);
    };

    const handleConfirmDelete = async (project) => {
        const targetProj = project || deletingProject;
        if (!targetProj) return;

        try {
            await request.delete(`/api/projects/${targetProj.id}`);
            client.invalidateQueries({ queryKey: ['adminProjects'] });
            client.invalidateQueries({ queryKey: ['adminTasks'] });
            showToast(`Project "${targetProj.title || targetProj.name}" deleted successfully.`, 'success');
        } catch (err) {
            console.error(`Failed to delete project ${targetProj.id}:`, err);
            showToast(`Failed to delete project "${targetProj.title || targetProj.name}".`, 'error');
        }
        setDeletingProject(null);
    };

    // Task Tab Handlers
    const handleEditTask = (task) => {
        setEditingTask(task);
    };

    const handleSaveTask = async (formData, originalTask) => {
        const targetProjId = formData.projectId || originalTask.projectId;
        const newStartDate = toIsoDateString(formData.startDate);
        const newDueDate = toIsoDateString(formData.dueDate);

        const payload = {
            title: (formData.title || '').trim() || null,
            description: (formData.description || '').trim() || null,
            priority: (formData.priority || 'MEDIUM').toUpperCase(),
            status: (formData.status || 'TODO').toUpperCase(),
            assignee: (formData.assignee || '').trim() || null,
            assigner: (formData.assigner || '').trim() || null,
            startDate: newStartDate || null,
            dueDate: newDueDate || null,
            projectId: String(targetProjId)
        };

        try {
            try {
                await request.put(`/api/projects/${targetProjId}/tasks/${originalTask.id}`, payload);
            } catch (putErr1) {
                await request.put(`/api/tasks/${originalTask.id}`, payload);
            }
            client.invalidateQueries({ queryKey: ['adminTasks'] });
            showToast(`Task "${formData.title}" updated successfully.`, 'success');
        } catch (err) {
            console.error(`Failed to update task ${originalTask.id}:`, err);
            showToast(`Failed to update task "${formData.title}".`, 'error');
        }
        setEditingTask(null);
    };

    const handleToggleCancelTask = async (task) => {
        const isCancelled = (task.status || '').toUpperCase() === 'CANCELLED' || (task.status || '').toUpperCase() === 'CANCELED';
        const nextStatus = isCancelled ? 'TODO' : 'CANCELLED';

        try {
            try {
                await request.put(`/api/projects/${task.projectId}/tasks/${task.id}`, { status: nextStatus });
            } catch (putErr1) {
                await request.put(`/api/tasks/${task.id}`, { status: nextStatus });
            }
            client.invalidateQueries({ queryKey: ['adminTasks'] });
            showToast(
                isCancelled
                    ? `Restored task "${task.title}".`
                    : `Cancelled task "${task.title}".`,
                isCancelled ? 'success' : 'error'
            );
        } catch (err) {
            console.error(`Failed to toggle cancel for task ${task.id}:`, err);
            showToast(`Failed to update status for task "${task.title}".`, 'error');
        }
    };

    const handleDeleteTask = (task) => {
        setDeletingTask(task);
    };

    const handleConfirmDeleteTask = async (task) => {
        const targetTask = task || deletingTask;
        if (!targetTask) return;

        try {
            try {
                await request.delete(`/api/projects/${targetTask.projectId}/tasks/${targetTask.id}`);
            } catch (delErr1) {
                await request.delete(`/api/tasks/${targetTask.id}`);
            }
            client.invalidateQueries({ queryKey: ['adminTasks'] });
            showToast(`Task "${targetTask.title}" deleted.`, 'success');
        } catch (err) {
            console.error(`Failed to delete task ${targetTask.id}:`, err);
            showToast(`Failed to delete task "${targetTask.title}".`, 'error');
        }
        setDeletingTask(null);
    };

    const handleCreateTask = async (formData) => {
        setCreatingTask(true);
        const targetProjId = formData.projectId || (projects[0]?.id || '1');
        const startDateIso = toIsoDateString(formData.startDate);
        const dueDateIso = toIsoDateString(formData.dueDate);

        const payload = {
            title: (formData.title || '').trim(),
            description: (formData.description || '').trim(),
            priority: (formData.priority || 'MEDIUM').toUpperCase(),
            status: (formData.status || 'TODO').toUpperCase(),
            assignee: (formData.assignee || '').trim() || null,
            assigner: (formData.assigner || currentUser.username || 'Admin').trim() || null,
            startDate: startDateIso || null,
            dueDate: dueDateIso || null,
            projectId: String(targetProjId)
        };

        try {
            try {
                await request.post(`/api/projects/${targetProjId}/tasks`, payload);
            } catch (postErr1) {
                await request.post('/api/tasks', payload);
            }
            client.invalidateQueries({ queryKey: ['adminTasks'] });
            showToast(`Task "${payload.title}" created successfully.`, 'success');
            setIsCreateTaskOpen(false);
        } catch (err) {
            console.error('Failed to create task:', err);
            const errMsg = err?.response?.data?.message || err?.message || 'Failed to create task.';
            showToast(errMsg, 'error');
        } finally {
            setCreatingTask(false);
        }
    };

    // Appeal Tab Handlers
    const handleAcceptAppeal = async (appeal) => {
        try {
            await request.put(`/api/appeals/${appeal.id}`, { status: 'ACCEPTED' });
            if (appeal.userId && appeal.userId !== 'N/A') {
                try {
                    await request.put(`/api/admin/users/${appeal.userId}`, { status: 'ACTIVE' });
                    client.invalidateQueries({ queryKey: ['adminUsers'] });
                } catch (uErr) {
                    console.error(`Failed to unblock user ${appeal.userId}:`, uErr);
                }
            }
            client.invalidateQueries({ queryKey: ['adminAppeals'] });
            showToast(`Accepted appeal and unblocked user.`, 'success');
        } catch (err) {
            console.error(`Failed to accept appeal ${appeal.id}:`, err);
            showToast(`Failed to accept appeal.`, 'error');
        }
    };

    const handleRejectAppeal = async (appeal) => {
        try {
            await request.put(`/api/appeals/${appeal.id}`, { status: 'REJECTED' });
            client.invalidateQueries({ queryKey: ['adminAppeals'] });
            showToast(`Rejected appeal for @${appeal.username || appeal.fullname}.`, 'error');
        } catch (err) {
            console.error(`Failed to reject appeal ${appeal.id}:`, err);
            showToast(`Failed to reject appeal.`, 'error');
        }
    };

    // Report Tab Handlers
    const handleBlockReportUser = async (report) => {
        const targetId = report.targetId;
        const targetName = report.targetFullname || report.targetUsername || 'user';

        try {
            if (targetId) {
                try {
                    await request.put(`/api/admin/users/${targetId}`, { status: 'BLOCKED' });
                } catch (err1) {
                    await request.put(`/api/users/${targetId}`, { status: 'BLOCKED' });
                }
            }
            try {
                await request.delete(`/api/reports/${report.id}`);
            } catch (dErr) {
                try {
                    await request.delete(`/api/report/${report.id}`);
                } catch (dErr2) {
                    // ignore
                }
            }
            client.invalidateQueries({ queryKey: ['adminUsers'] });
            client.invalidateQueries({ queryKey: ['adminReports'] });
            showToast(`Blocked user "${targetName}" and resolved report.`, 'error');
            setViewingReport(null);
        } catch (err) {
            console.error(`Failed to block user:`, err);
            showToast(`Failed to block user "${targetName}".`, 'error');
        }
    };

    const handleDismissReport = async (report) => {
        try {
            try {
                await request.delete(`/api/reports/${report.id}`);
            } catch (dErr) {
                await request.delete(`/api/report/${report.id}`);
            }
            client.invalidateQueries({ queryKey: ['adminReports'] });
            showToast(`Report dismissed.`, 'success');
            setViewingReport(null);
        } catch (err) {
            console.error(`Failed to dismiss report ${report.id}:`, err);
            showToast(`Failed to dismiss report.`, 'error');
        }
    };

    // Aliases for users tab handlers
    const handleTempBan = handleTempBanUser;
    const handleDeactivate = handleDeactivateUser;

    const normalizedRole = String(currentUser.role || '').toUpperCase();
    const isAuthorized = normalizedRole.includes('ADMIN') || normalizedRole.includes('GOD');

    // 1. While auth is checking: display clean blank page with navbar
    if (authChecking) {
        return (
            <div className={`admin-panel-page-wrapper${isDark ? ' dark-mode' : ''}`}>
                <div id="navbar-root">
                    <NavBar
                        userId={currentUser.id}
                        fullName={currentUser.fullname}
                        userName={currentUser.username}
                        userImg={currentUser.image}
                        userRole={currentUser.role}
                        theme={isDark ? 'dark' : 'light'}
                    />
                </div>
            </div>
        );
    }

    // 2. If user is not admin or god: render unauthorized view with "Failed To load content" and reload button
    if (!isAuthorized) {
        return (
            <div className={`admin-panel-page-wrapper${isDark ? ' dark-mode' : ''}`}>
                <div id="navbar-root">
                    <NavBar
                        userId={currentUser.id}
                        fullName={currentUser.fullname}
                        userName={currentUser.username}
                        userImg={currentUser.image}
                        userRole={currentUser.role}
                        theme={isDark ? 'dark' : 'light'}
                    />
                </div>

                <div className="unauthorized-container">
                    <div className="unauthorized-message">Failed To load content</div>
                    <ReloadButton onReload={() => { }} isLoading={false} />
                </div>
            </div>
        );
    }

    return (
        <div className={`admin-panel-page-wrapper${isDark ? ' dark-mode' : ''}`}>
            <div id="navbar-root">
                <NavBar
                    userId={currentUser.id}
                    fullName={currentUser.fullname}
                    userName={currentUser.username}
                    userImg={currentUser.image}
                    userRole={currentUser.role}
                    theme={isDark ? 'dark' : 'light'}
                />
            </div>

            {/* Universal Notification Toast */}
            <Notification toast={toast} onClose={() => setToast(null)} />

            <div className="page-container">
                <h1 className="page-title">Admin Panel</h1>

                {/* Folder-style Tab Navigation Bar */}
                <div className="admin-tabs-nav">
                    <button
                        type="button"
                        className={`admin-tab ${activeTab === 'projects' ? 'active' : ''}`}
                        onClick={() => setActiveTab('projects')}
                    >
                        Edit Projects
                    </button>
                    <button
                        type="button"
                        className={`admin-tab ${activeTab === 'tasks' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('tasks');
                            fetchAllTasks();
                        }}
                    >
                        Edit Tasks
                    </button>
                    <button
                        type="button"
                        className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        Edit Users
                    </button>
                    <button
                        type="button"
                        className={`admin-tab tab-reports ${activeTab === 'reports' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('reports');
                            fetchReports();
                        }}
                    >
                        User Reports
                    </button>
                    <button
                        type="button"
                        className={`admin-tab tab-appeals ${activeTab === 'appeals' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('appeals');
                            fetchAppeals();
                        }}
                    >
                        Appeals
                    </button>
                </div>

                {/* Main White Content Card */}
                <div className="admin-main-card">
                    {activeTab === 'projects' && (
                        projectsError ? (
                            <div className="admin-reload-center-box">
                                <ReloadButton onReload={fetchAllProjects} isLoading={loading} />
                            </div>
                        ) : loading && projects.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px 0', color: '#888888' }}>
                                <p style={{ fontSize: '16px' }}>Loading global projects...</p>
                            </div>
                        ) : (
                            <ProjectsTabContent
                                projects={projects}
                                searchQuery={projectSearch}
                                onSearchChange={setProjectSearch}
                                onEditProject={handleEditProject}
                                onManageUsers={handleOpenManageUsers}
                                onArchiveProject={handleArchiveProject}
                                onDeleteProject={handleDeleteProject}
                                onOpenProjectUsers={handleOpenProjectUsers}
                            />
                        )
                    )}

                    {activeTab === 'tasks' && (
                        tasksError ? (
                            <div className="admin-reload-center-box">
                                <ReloadButton onReload={fetchAllTasks} isLoading={tasksLoading} />
                            </div>
                        ) : (
                            <TasksTabContent
                                tasks={adminTasks}
                                searchQuery={taskSearch}
                                onSearchChange={setTaskSearch}
                                onEditTask={handleEditTask}
                                onToggleCancelTask={handleToggleCancelTask}
                                onDeleteTask={handleDeleteTask}
                                onCreateTask={() => setIsCreateTaskOpen(true)}
                                loading={tasksLoading}
                            />
                        )
                    )}

                    {activeTab === 'users' && (
                        usersError ? (
                            <div className="admin-reload-center-box">
                                <ReloadButton onReload={fetchUsers} isLoading={loadingUsers} />
                            </div>
                        ) : (
                            <UsersTabContent
                                users={adminUsers}
                                searchQuery={userSearch}
                                onSearchChange={setUserSearch}
                                onEditUser={handleEditUser}
                                onTempBan={handleTempBan}
                                onDeactivate={handleDeactivate}
                                onCreateUser={() => setIsCreateUserOpen(true)}
                                loading={loadingUsers}
                                currentUserRole={currentUser.role}
                            />
                        )
                    )}

                    {activeTab === 'reports' && (
                        reportsError ? (
                            <div className="admin-reload-center-box">
                                <ReloadButton onReload={fetchReports} isLoading={reportsLoading} />
                            </div>
                        ) : (
                            <ReportsTabContent
                                reports={reportsList}
                                searchQuery={reportSearch}
                                onSearchChange={setReportSearch}
                                onViewReport={(report) => setViewingReport(report)}
                                loading={reportsLoading}
                            />
                        )
                    )}

                    {activeTab === 'appeals' && (
                        appealsError ? (
                            <div className="admin-reload-center-box">
                                <ReloadButton onReload={fetchAppeals} isLoading={appealsLoading} />
                            </div>
                        ) : (
                            <AppealsTabContent
                                appeals={appealsList}
                                searchQuery={appealSearch}
                                onSearchChange={setAppealSearch}
                                onViewAppeal={(appeal) => setViewingAppeal(appeal)}
                                onAcceptAppeal={handleAcceptAppeal}
                                onRejectAppeal={handleRejectAppeal}
                                loading={appealsLoading}
                            />
                        )
                    )}
                </div>
            </div>

            {/* Edit Project Modal */}
            {editingProject && (
                <EditProjectModal
                    project={editingProject}
                    users={usersList}
                    loadingUsers={loadingUsers}
                    onFetchUsers={fetchUsers}
                    onSave={handleSaveProject}
                    onCancel={() => setEditingProject(null)}
                />
            )}

            {/* Edit Task Modal */}
            {editingTask && (
                <EditTaskModal
                    task={editingTask}
                    projects={projects}
                    users={usersList}
                    loadingUsers={loadingUsers}
                    onFetchUsers={fetchUsers}
                    onSave={handleSaveTask}
                    onCancel={() => setEditingTask(null)}
                />
            )}

            {/* Edit User Modal */}
            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    currentUserRole={currentUser.role}
                    onSave={handleSaveUser}
                    onCancel={() => setEditingUser(null)}
                />
            )}

            {/* Create User Modal */}
            {isCreateUserOpen && (
                <CreateUserModal
                    onSave={handleCreateUser}
                    onCancel={() => setIsCreateUserOpen(false)}
                    isSubmitting={creatingUser}
                />
            )}

            {/* Create Task Modal */}
            {isCreateTaskOpen && (
                <CreateTaskModal
                    projects={projects}
                    users={usersList}
                    loadingUsers={loadingUsers}
                    onFetchUsers={fetchUsers}
                    onSave={handleCreateTask}
                    onCancel={() => setIsCreateTaskOpen(false)}
                    isSubmitting={creatingTask}
                    defaultAssigner={currentUser.username || 'Admin'}
                />
            )}

            {/* Delete Project Confirmation Modal */}
            {deletingProject && (
                <DeleteConfirmModal
                    project={deletingProject}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setDeletingProject(null)}
                />
            )}

            {/* Delete Task Confirmation Modal */}
            {deletingTask && (
                <DeleteTaskConfirmModal
                    task={deletingTask}
                    onConfirm={handleConfirmDeleteTask}
                    onCancel={() => setDeletingTask(null)}
                />
            )}

            {/* View Appeal Modal */}
            {viewingAppeal && (
                <ViewAppealModal
                    appeal={viewingAppeal}
                    onClose={() => setViewingAppeal(null)}
                />
            )}

            {/* View Report Modal */}
            {viewingReport && (
                <ViewReportModal
                    report={viewingReport}
                    onClose={() => setViewingReport(null)}
                    onBlock={handleBlockReportUser}
                    onDismiss={handleDismissReport}
                />
            )}

            {/* Global & Project Members Modal */}
            <GlobalUsersModal
                isOpen={membersModalConfig.isOpen}
                onClose={() => setMembersModalConfig(prev => ({ ...prev, isOpen: false }))}
                title={membersModalConfig.title}
                users={membersModalConfig.isEditMode ? usersList : membersModalConfig.users}
                loading={membersModalConfig.isEditMode ? loadingUsers : false}
                projectUserIds={membersModalConfig.projectUserIds}
                isEditMode={membersModalConfig.isEditMode}
                onToggleMember={handleToggleMember}
                actionLoadingId={actionLoadingId}
                projectOwner={membersModalConfig.projectOwner}
            />
        </div>
    );
}

// Main Admin Panel Component (Participates in root QueryClientProvider)
function AdminPanel() {
    return <AdminPanelContent />;
}

export default AdminPanel;
