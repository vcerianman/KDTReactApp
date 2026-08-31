import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './AdminPanel.css';
import NavBar from './NavBar';
import Notification from './Notification';
import request from './api/Request';
import { getUserAvatarUrl, getProjectStatusClass } from './utils';

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
                            placeholder="e.g. jdoe"
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
                            placeholder="e.g. John Doe"
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
                            placeholder="e.g. john@example.com"
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

// Main Admin Panel Component
function AdminPanel() {
    const [currentUser, setCurrentUser] = useState({
        id: "?",
        fullname: "?",
        username: "?",
        image: "/ProfilePic/0.jpg",
        role: ""
    });
    const [authChecking, setAuthChecking] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);

    // Active Tab State ('projects', 'tasks', 'users', 'reports')
    const [activeTab, setActiveTab] = useState('projects');

    // Search query state within projects tab, users tab & appeals tab
    const [projectSearch, setProjectSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [appealSearch, setAppealSearch] = useState('');

    // Global Projects State
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [projectsError, setProjectsError] = useState(false);

    // Admin Users State
    const [adminUsers, setAdminUsers] = useState(initialAdminUsers);
    const [usersError, setUsersError] = useState(false);

    // Appeals State
    const [appealsList, setAppealsList] = useState([]);
    const [appealsLoading, setAppealsLoading] = useState(false);
    const [appealsError, setAppealsError] = useState(false);
    const [viewingAppeal, setViewingAppeal] = useState(null);

    // Modal & Universal Toast States
    const [editingProject, setEditingProject] = useState(null);
    const [deletingProject, setDeletingProject] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
    const [creatingUser, setCreatingUser] = useState(false);
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

    // Global users for owner selection prompt & manage members
    const [usersList, setUsersList] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const usersListRef = useRef(usersList);

    useEffect(() => {
        usersListRef.current = usersList;
    }, [usersList]);

    // Fetch global users from GET /api/admin/users
    const fetchUsers = useCallback(async () => {
        setLoadingUsers(true);
        setUsersError(false);
        try {
            let data;
            try {
                data = await request.get('/api/admin/users');
            } catch (adminErr) {
                // Fallback to /api/users if /api/admin/users is not available
                data = await request.get('/api/users');
            }
            const userList = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : null);
            if (userList && userList.length > 0) {
                const formatted = userList.map(u => ({
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

                setUsersList(formatted);
                setAdminUsers(formatted);
                return formatted;
            } else {
                setUsersList([]);
                setAdminUsers([]);
                return [];
            }
        } catch (err) {
            console.error('Failed to fetch users from /api/admin/users:', err);
            setUsersList([]);
            setAdminUsers([]);
            setUsersError(true);
            return [];
        } finally {
            setLoadingUsers(false);
        }
    }, []);

    // Fetch all appeals from GET /api/appeals
    const fetchAppeals = useCallback(async () => {
        setAppealsLoading(true);
        setAppealsError(false);
        try {
            const data = await request.get('/api/appeals');
            const list = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
            if (list && list.length > 0) {
                const knownUsers = usersListRef.current || [];
                const formatted = list.map((a, idx) => {
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

                setAppealsList(formatted);
            } else {
                setAppealsList([]);
            }
        } catch (err) {
            console.error('Failed to fetch appeals (/api/appeals):', err);
            setAppealsList([]);
            setAppealsError(true);
        } finally {
            setAppealsLoading(false);
        }
    }, []);

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
            listToUse = await fetchUsers();
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

            // 3. Update project's users in local state
            setProjects(prevProjects => {
                return prevProjects.map(proj => {
                    if (String(proj.id) !== String(project.id)) return proj;
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

        const isAboutUnchanged = origAboutList.length === newAboutList.length &&
            origAboutList.every((val, idx) => val === newAboutList[idx]);

        const payload = {
            fullname: newFullname !== origFullname ? newFullname : null,
            username: newUsername !== origUsername ? newUsername : null,
            role: newRole !== origRole ? newRole : null,
            status: newStatus !== origStatus ? newStatus : null,
            about: isAboutUnchanged ? null : newAboutList,
            email: newEmail !== origEmail ? newEmail : null,
            deleted: null
        };

        try {
            await request.put(`/api/admin/users/${originalUser.id}`, payload);
            showToast(`User "${newFullname || newUsername}" updated successfully.`, 'success');
        } catch (err) {
            console.error(`Failed to update user ${originalUser.id}:`, err);
            showToast(`Failed to update user "${newFullname || newUsername}".`, 'error');
        }

        const updatedUser = {
            ...originalUser,
            fullname: newFullname,
            username: newUsername,
            email: newEmail,
            about: newAboutList,
            status: newStatus,
            role: newRole
        };

        setAdminUsers(prev => prev.map(u => u.id === originalUser.id ? updatedUser : u));
        setUsersList(prev => prev.map(u => u.id === originalUser.id ? {
            ...u,
            fullname: newFullname,
            username: newUsername,
            email: newEmail,
            about: newAboutList,
            role: newRole,
            status: newStatus
        } : u));
        setEditingUser(null);
    };

    const handleTempBan = async (user) => {
        const isBanned = user.status === 'BLOCKED';
        const newStatus = isBanned ? 'ACTIVE' : 'BLOCKED';

        try {
            await request.put(`/api/admin/users/${user.id}`, {
                fullname: null,
                username: null,
                role: null,
                status: newStatus,
                about: null,
                email: null,
                deleted: null
            });
            showToast(
                isBanned
                    ? `Removed temporary ban for ${user.fullname}.`
                    : `Temporarily banned user ${user.fullname}.`,
                isBanned ? 'success' : 'error'
            );
        } catch (err) {
            console.error(`Failed to toggle ban for user ${user.id}:`, err);
            showToast(`Failed to update status for ${user.fullname}.`, 'error');
        }

        setAdminUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
    };

    const handleDeactivate = async (user) => {
        const isDeactivated = user.status === 'INACTIVE' || user.status === 'DEACTIVATED' || user.deleted === true;
        const newStatus = isDeactivated ? 'ACTIVE' : 'INACTIVE';
        const newDeleted = !isDeactivated;

        try {
            await request.put(`/api/admin/users/${user.id}`, {
                fullname: null,
                username: null,
                role: null,
                status: newStatus,
                about: null,
                email: null,
                deleted: newDeleted
            });
            showToast(
                isDeactivated
                    ? `Reactivated user account for ${user.fullname}.`
                    : `Deactivated user account for ${user.fullname}.`,
                isDeactivated ? 'success' : 'error'
            );
        } catch (err) {
            console.error(`Failed to toggle deactivation for user ${user.id}:`, err);
            showToast(`Failed to update account status for ${user.fullname}.`, 'error');
        }

        setAdminUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus, deleted: newDeleted } : u));
    };

    // Fetch all global projects from GET /api/projects sorted by ID
    const fetchAllProjects = useCallback(async () => {
        setLoading(true);
        setProjectsError(false);
        try {
            const data = await request.get('/api/projects');
            const projList = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
            if (projList && projList.length > 0) {
                const projectPromises = projList.map(async (p) => {
                    const parsed = parseStartAndDueDate(p);
                    const datesFormatted = p.dates || (parsed.startDate && parsed.dueDate
                        ? `${parsed.startDate} - ${parsed.dueDate}`
                        : '');

                    let pUsers = [];
                    if (Array.isArray(p.users) && p.users.length > 0) {
                        pUsers = p.users.map(u => ({
                            id: String(u.id || u._id || ''),
                            fullname: u.fullname || u.full_name || u.fullName || u.name || u.username || 'User',
                            username: u.username || '',
                            image: u.image || getUserAvatarUrl(u.username)
                        }));
                    } else if (p.id) {
                        // Fetch users involved in this project via GET /api/users?projectId={ID} (matching Task.jsx)
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
                        } catch (uErr) {
                            console.error(`Failed to fetch project users for project ${p.id} (/api/users?projectId=${p.id}):`, uErr);
                        }

                        // If still empty, attempt to check project details
                        if (pUsers.length === 0) {
                            try {
                                const detail = await request.get(`/api/projects/${p.id}`);
                                const detailData = detail?.data || detail;
                                if (detailData && Array.isArray(detailData.users) && detailData.users.length > 0) {
                                    pUsers = detailData.users.map(u => ({
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
                setProjects(formatted);
            } else {
                setProjects([]);
            }
        } catch (err) {
            console.error('Failed to fetch projects (/api/projects):', err);
            setProjects([]);
            setProjectsError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch current user from /api/auth/me
    const fetchCurrentUser = useCallback(async () => {
        setAuthChecking(true);
        try {
            const data = await request.get('/api/auth/me');
            if (data) {
                const uname = data.username || "?";
                const uRole = data.role || 'MEMBER';
                setCurrentUser({
                    id: String(data.id || "?"),
                    fullname: data.full_name || data.fullName || data.fullname || data.name || uname,
                    username: uname,
                    image: data.image || (uname !== '?' ? getUserAvatarUrl(uname) : '/ProfilePic/0.jpg'),
                    role: uRole
                });

                const normRole = String(uRole).toUpperCase();
                if (normRole.includes('ADMIN') || normRole.includes('GOD')) {
                    fetchAllProjects();
                    fetchUsers();
                    fetchAppeals();
                }
            }
        } catch (err) {
            console.error('Failed to fetch auth user in AdminPanel:', err);
        } finally {
            setAuthChecking(false);
            setAuthChecked(true);
        }
    }, [fetchAllProjects, fetchUsers, fetchAppeals]);

    useEffect(() => {
        fetchCurrentUser();
    }, [fetchCurrentUser]);

    // Handlers
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
            showToast(`Project "${newName}" updated successfully.`, 'success');
        } catch (err) {
            console.error(`Failed to update project ${originalProject.id}:`, err);
            showToast(`Failed to update project "${newName}".`, 'error');
        }

        const datesDisplay = newStartDate && newDueDate
            ? `${newStartDate} - ${newDueDate}`
            : (newStartDate || newDueDate || originalProject.dates || '');

        const updatedProject = {
            ...originalProject,
            title: newName,
            name: newName,
            desc: newDescription,
            description: newDescription,
            status: newStatus,
            owner: newOwner,
            startDate: newStartDate,
            dueDate: newDueDate,
            dates: datesDisplay
        };

        setProjects(prev => prev.map(p => p.id === originalProject.id ? updatedProject : p));
        setEditingProject(null);
    };

    const handleArchiveProject = async (project) => {
        const newStatus = project.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
        try {
            await request.put(`/api/projects/${project.id}`, {
                name: null,
                description: null,
                status: newStatus,
                owner: null,
                startDate: null,
                dueDate: null
            });
            showToast(`Project "${project.title || project.name}" ${newStatus === 'ARCHIVED' ? 'archived' : 'unarchived'}.`, 'success');
        } catch (err) {
            console.error(`Failed to update project status ${project.id}:`, err);
            showToast(`Failed to update status for "${project.title || project.name}".`, 'error');
        }

        setProjects(prev => prev.map(p => {
            if (p.id === project.id) {
                return { ...p, status: newStatus };
            }
            return p;
        }));
    };

    const handleDeleteProject = (project) => {
        setDeletingProject(project);
    };

    const handleConfirmDelete = async (project) => {
        try {
            await request.delete(`/api/projects/${project.id}`);
            showToast(`Project "${project.title}" deleted.`, 'success');
        } catch (err) {
            console.error(`Failed to delete project ${project.id}:`, err);
            showToast(`Failed to delete project "${project.title}".`, 'error');
        }

        setProjects(prev => prev.filter(p => p.id !== project.id));
        setDeletingProject(null);
    };

    const handleAcceptAppeal = async (appeal) => {
        const targetUserId = appeal.userId !== 'N/A' && appeal.userId ? appeal.userId : null;
        const targetUsername = appeal.username;

        let unbannedUserId = targetUserId;
        if (!unbannedUserId && targetUsername) {
            const found = (usersListRef.current || []).find(u => u.username?.toLowerCase() === targetUsername.toLowerCase());
            if (found) unbannedUserId = found.id;
        }

        try {
            // 1. Unban user in database (status: 'ACTIVE')
            if (unbannedUserId) {
                try {
                    await request.put(`/api/admin/users/${unbannedUserId}`, {
                        fullname: null,
                        username: null,
                        role: null,
                        status: 'ACTIVE',
                        about: null,
                        email: null,
                        deleted: null
                    });
                } catch (err1) {
                    await request.put(`/api/users/${unbannedUserId}`, {
                        status: 'ACTIVE'
                    });
                }

                // Update local user state
                setAdminUsers(prev => prev.map(u => String(u.id) === String(unbannedUserId) ? { ...u, status: 'ACTIVE' } : u));
                setUsersList(prev => prev.map(u => String(u.id) === String(unbannedUserId) ? { ...u, status: 'ACTIVE' } : u));
            }

            // 2. Close/delete appeal via DELETE /api/appeals/{ID} (or /api/appeal/{ID})
            try {
                await request.delete(`/api/appeals/${appeal.id}`);
            } catch (delErr) {
                try {
                    await request.delete(`/api/appeal/${appeal.id}`);
                } catch (delErr2) {
                    // ignore
                }
            }

            // 3. Remove appeal from local state
            setAppealsList(prev => prev.filter(a => String(a.id) !== String(appeal.id)));

            showToast(`Accepted appeal and unbanned @${targetUsername || appeal.fullname || unbannedUserId}.`, 'success');
        } catch (err) {
            console.error(`Failed to accept appeal ${appeal.id}:`, err);
            showToast(`Failed to accept appeal for @${targetUsername || appeal.fullname}.`, 'error');
        }
    };

    const handleRejectAppeal = async (appeal) => {
        try {
            // Close / delete appeal via DELETE /api/appeals/{ID} (or /api/appeal/{ID})
            try {
                await request.delete(`/api/appeals/${appeal.id}`);
            } catch (delErr) {
                try {
                    await request.delete(`/api/appeal/${appeal.id}`);
                } catch (delErr2) {
                    // ignore
                }
            }

            // Remove appeal from local state
            setAppealsList(prev => prev.filter(a => String(a.id) !== String(appeal.id)));

            showToast(`Rejected appeal (id:${appeal.id}) for @${appeal.username || appeal.fullname}.`, 'error');
        } catch (err) {
            console.error(`Failed to reject appeal ${appeal.id}:`, err);
            showToast(`Failed to reject appeal (id:${appeal.id}).`, 'error');
        }
    };

    const handleCreateUser = async (formData) => {
        setCreatingUser(true);
        const payload = {
            username: (formData.username || '').trim(),
            fullname: (formData.fullname || '').trim(),
            full_name: (formData.fullname || '').trim(),
            password: formData.password || '',
            email: (formData.email || '').trim() || null,
            role: (formData.role || 'MEMBER').toUpperCase(),
            status: (formData.status || 'ACTIVE').toUpperCase()
        };

        try {
            await request.post('/api/admin/users', payload);
            showToast(`User "${payload.username}" created successfully.`, 'success');
            setIsCreateUserOpen(false);
            await fetchUsers();
        } catch (err) {
            console.error('Failed to create user (POST /api/admin/users):', err);
            const errMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to create user.';
            showToast(errMsg, 'error');
        } finally {
            setCreatingUser(false);
        }
    };

    const normalizedRole = String(currentUser.role || '').toUpperCase();
    const isAuthorized = normalizedRole.includes('ADMIN') || normalizedRole.includes('GOD');

    // 1. While auth is checking or unverified: display clean blank page with navbar, zero glimpse of admin panel
    if (authChecking || !authChecked) {
        return (
            <div className="admin-panel-page-wrapper">
                <div id="navbar-root">
                    <NavBar
                        userId={currentUser.id}
                        fullName={currentUser.fullname}
                        userName={currentUser.username}
                        userImg={currentUser.image}
                        userRole={currentUser.role}
                    />
                </div>
            </div>
        );
    }

    // 2. If user is not admin or god: render unauthorized view with "Failed To load content" and reload button
    if (!isAuthorized) {
        return (
            <div className="admin-panel-page-wrapper">
                <div id="navbar-root">
                    <NavBar
                        userId={currentUser.id}
                        fullName={currentUser.fullname}
                        userName={currentUser.username}
                        userImg={currentUser.image}
                        userRole={currentUser.role}
                    />
                </div>

                <div className="unauthorized-container">
                    <div className="unauthorized-message">Failed To load content</div>
                    <ReloadButton onReload={() => {}} isLoading={false} />
                </div>
            </div>
        );
    }

    return (
        <div className="admin-panel-page-wrapper">
            <div id="navbar-root">
                <NavBar
                    userId={currentUser.id}
                    fullName={currentUser.fullname}
                    userName={currentUser.username}
                    userImg={currentUser.image}
                    userRole={currentUser.role}
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
                        onClick={() => setActiveTab('tasks')}
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
                        onClick={() => setActiveTab('reports')}
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
                        <div className="placeholder-tab-content">
                            <h3>Edit Tasks Administration</h3>
                            <p>Manage and configure global tasks across all projects.</p>
                        </div>
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
                        <div className="placeholder-tab-content">
                            <h3 style={{ color: '#d93025' }}>User Reports Administration</h3>
                            <p>View and manage submitted user reports and moderation requests.</p>
                        </div>
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

            {/* Delete Confirmation Modal */}
            {deletingProject && (
                <DeleteConfirmModal
                    project={deletingProject}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setDeletingProject(null)}
                />
            )}

            {/* View Appeal Modal */}
            {viewingAppeal && (
                <ViewAppealModal
                    appeal={viewingAppeal}
                    onClose={() => setViewingAppeal(null)}
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

export default AdminPanel;
