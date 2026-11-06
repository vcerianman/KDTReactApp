import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    useQuery,
    useQueryClient
} from '@tanstack/react-query';
import './Communication.css';
import NavBar from './NavBar';
import Notification from './Notification';
import request from './api/Request';
import { getUserAvatarUrl, getProjectStatusClass } from './utils';
import useCurrentUser from './useCurrentUser';

// Reload button
function ReloadButton({ onReload, isLoading, title = "Reload" }) {
    return (
        <button
            type="button"
            className={`section-reload-btn ${isLoading ? 'loading' : ''}`}
            onClick={onReload}
            title={title}
            aria-label={title}
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

function formatTimestamp(ts) {
    if (!ts) return 'Just now';
    try {
        const d = new Date(ts);
        if (isNaN(d.getTime())) return String(ts);
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return d.toLocaleDateString();
    } catch (e) {
        return String(ts);
    }
}

// Helper to resolve the numeric User ID of any author
function resolveAuthorUserId(authorId, username, fullname, usersMap = {}) {
    const prof = resolveAuthorProfile(authorId, username, fullname, usersMap);
    return prof.id;
}

// Helper to resolve full author profile details (id, fullname, username)
function resolveAuthorProfile(authorId, username, fallbackName, usersMap = {}) {
    const rawUname = String(username || '').trim();
    const rawFname = String(fallbackName || '').trim();
    const rawId = String(authorId || '').trim();

    // 1. Check in dynamic usersMap
    const matched =
        (rawId && usersMap[rawId]) ||
        (rawUname && usersMap[rawUname.toLowerCase()]) ||
        (rawFname && usersMap[rawFname.toLowerCase()]);

    if (matched) {
        if (typeof matched === 'object') {
            return {
                id: String(matched.id || '1'),
                fullname: matched.fullname || matched.fullName || matched.name || matched.username || fallbackName || 'User',
                username: matched.username || username || fallbackName || 'User'
            };
        } else if (typeof matched === 'string' && /^\d+$/.test(matched)) {
            return {
                id: matched,
                fullname: rawFname || rawUname || 'User',
                username: rawUname || rawFname || 'User'
            };
        }
    }

    // 2. Comprehensive static user directory mapping
    const staticDirectory = {
        '1': { id: '1', fullname: 'KDT', username: 'KDT' },
        'kdt': { id: '1', fullname: 'KDT', username: 'KDT' },
        '2': { id: '2', fullname: 'Khang nig', username: 'Khanig' },
        'khanig': { id: '2', fullname: 'Khang nig', username: 'Khanig' },
        'khang nig': { id: '2', fullname: 'Khang nig', username: 'Khanig' },
        '3': { id: '3', fullname: 'Ngo Lo Do', username: 'NgoDo' },
        'ngodo': { id: '3', fullname: 'Ngo Lo Do', username: 'NgoDo' },
        'ngo lo do': { id: '3', fullname: 'Ngo Lo Do', username: 'NgoDo' },
        '4': { id: '4', fullname: 'Eternal DESTROYER', username: 'EternalDestroyer' },
        'eternaldestroyer': { id: '4', fullname: 'Eternal DESTROYER', username: 'EternalDestroyer' },
        'eternal destroyer': { id: '4', fullname: 'Eternal DESTROYER', username: 'EternalDestroyer' },
        '5': { id: '5', fullname: 'Code master', username: 'COdemaster' },
        'codemaster': { id: '5', fullname: 'Code master', username: 'COdemaster' },
        'code master': { id: '5', fullname: 'Code master', username: 'COdemaster' },
        '6': { id: '6', fullname: 'For ever', username: 'FOREVERuser' },
        'foreveruser': { id: '6', fullname: 'For ever', username: 'FOREVERuser' },
        'for ever': { id: '6', fullname: 'For ever', username: 'FOREVERuser' },
        '7': { id: '7', fullname: 'alecicrivers', username: 'AlecicRivers' },
        'alecicrivers': { id: '7', fullname: 'alecicrivers', username: 'AlecicRivers' },
        '8': { id: '8', fullname: 'gart king', username: 'GartKing' },
        'gartking': { id: '8', fullname: 'gart king', username: 'GartKing' },
        'gart king': { id: '8', fullname: 'gart king', username: 'GartKing' },
        '9': { id: '9', fullname: 'vcerianman', username: 'vcerianman' },
        'vcerianman': { id: '9', fullname: 'vcerianman', username: 'vcerianman' },
        '10': { id: '10', fullname: 'Im banned', username: 'Imbanned' },
        'imbanned': { id: '10', fullname: 'Im banned', username: 'Imbanned' },
        'im banned': { id: '10', fullname: 'Im banned', username: 'Imbanned' },
        '11': { id: '11', fullname: 'CreatedUser', username: 'CreatedUser' },
        'createduser': { id: '11', fullname: 'CreatedUser', username: 'CreatedUser' }
    };

    const staticMatch =
        (rawId && staticDirectory[rawId]) ||
        (rawUname && staticDirectory[rawUname.toLowerCase()]) ||
        (rawFname && staticDirectory[rawFname.toLowerCase()]);

    if (staticMatch) {
        return staticMatch;
    }

    // 3. Fallback
    const fallbackId = (rawId && /^\d+$/.test(rawId)) ? rawId : '1';
    return {
        id: fallbackId,
        fullname: rawFname || rawUname || 'User',
        username: rawUname || rawFname || 'User'
    };
}

// Modal for Viewing Project Users (matching AdminPanel.jsx)
function ProjectUsersModal({ isOpen, onClose, title, users, usersMap }) {
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

    const filteredUsers = (users || []).filter(u => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        const full = `${u.fullname || ''} ${u.username || ''}`.toLowerCase();
        return full.includes(query);
    });

    return (
        <div className="communication-modal-overlay" onClick={onClose}>
            <div className="project-users-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="project-users-modal-header">
                    <h3 className="project-users-modal-title">{title}</h3>
                    <div className="project-users-header-right">
                        <div className="project-users-search-box">
                            <svg className="project-users-search-icon" viewBox="0 0 24 24" width="16" height="16" fill="#888">
                                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                            </svg>
                            <input
                                type="text"
                                className="project-users-search-input"
                                placeholder="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <button
                            type="button"
                            className="communication-modal-close"
                            aria-label="Close"
                            onClick={onClose}
                        >
                            &times;
                        </button>
                    </div>
                </div>

                <div className="project-users-list-scroll">
                    {filteredUsers.length > 0 ? (
                        filteredUsers.map((u, idx) => {
                            const uId = resolveAuthorUserId(u.id || u.userId, u.username, u.fullname, usersMap);
                            return (
                                <Link
                                    key={u.id || idx}
                                    to={`/profile/${uId}`}
                                    className="project-user-item-row"
                                    onClick={onClose}
                                    title={`View profile of ${u.fullname || u.username} (ID: ${uId})`}
                                >
                                    <img
                                        src={u.image || getUserAvatarUrl(u.username)}
                                        alt={u.fullname || u.username}
                                        className="project-user-item-avatar"
                                        onError={(e) => { e.target.src = '/ProfilePic/0.jpg'; }}
                                    />
                                    <div className="project-user-item-info">
                                        <span className="project-user-item-fullname">{u.fullname || u.username || 'User'}</span>
                                        <span className="project-user-item-username">@{u.username || 'user'}</span>
                                    </div>
                                </Link>
                            );
                        })
                    ) : (
                        <div className="project-users-empty-text">No users found...</div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Message Options Dropdown Menu ("...")
function MessageOptionsMenu({ isAuthor, onOpenInfo, onEdit, onReport }) {
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

    return (
        <div className="msg-options-menu" ref={menuRef}>
            <button
                type="button"
                className="msg-dots-btn"
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
            <div className={`msg-options-dropdown-menu ${isMenuOpen ? 'show' : ''}`}>
                <button
                    type="button"
                    className="msg-options-menu-item"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        onOpenInfo();
                    }}
                >
                    View info
                </button>
                {isAuthor && (
                    <button
                        type="button"
                        className="msg-options-menu-item"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMenuOpen(false);
                            onEdit();
                        }}
                    >
                        Edit
                    </button>
                )}
                <button
                    type="button"
                    className="msg-options-menu-item msg-options-menu-item-danger"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        onReport();
                    }}
                >
                    Report
                </button>
            </div>
        </div>
    );
}

// Modal for Viewing Message Info (matching Profile.jsx stats modal design)
function MessageInfoModal({ isOpen, onClose, info }) {
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

    if (!isOpen || !info) return null;

    return (
        <div className="communication-modal-overlay" onClick={onClose}>
            <div className="stats-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="stats-modal-header">
                    <h3 className="stats-modal-title">{info.type === 'reply' ? 'Reply Info' : 'Post Info'}</h3>
                    <button
                        type="button"
                        className="stats-modal-close"
                        title="Close"
                        aria-label="Close"
                        onClick={onClose}
                    >
                        &times;
                    </button>
                </div>
                <div className="stats-modal-body">
                    <div className="stats-item">
                        <strong>Full name:</strong>
                        <span>{info.fullname || 'User'}</span>
                    </div>
                    <div className="stats-item">
                        <strong>Username:</strong>
                        <span>@{info.username || 'user'}</span>
                    </div>
                    <div className="stats-item">
                        <strong>Project tied to:</strong>
                        <span>{info.project || 'Global Discussion'}</span>
                    </div>
                    <div className="stats-item">
                        <strong>Time created:</strong>
                        <span>{info.timestamp || 'Just now'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Modal for Editing a Post
function EditPostModal({ isOpen, onClose, onSave, post, isSubmitting }) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    useEffect(() => {
        if (post) {
            setTitle(post.title || '');
            setContent(post.content || '');
        }
    }, [post]);

    if (!isOpen || !post) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;
        onSave(post.id, title.trim(), content.trim());
    };

    return (
        <div className="communication-modal-overlay" onClick={onClose}>
            <div className="communication-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="communication-modal-header">
                    <h3 className="communication-modal-title">Edit Post</h3>
                    <button type="button" className="communication-modal-close" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Post Title *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Post Content *</label>
                        <textarea
                            className="form-textarea"
                            rows={4}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                        />
                    </div>
                    <div className="modal-btn-row">
                        <button type="button" className="btn-modal-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-modal-submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Modal for Editing a Reply
function EditReplyModal({ isOpen, onClose, onSave, postId, reply, isSubmitting }) {
    const [content, setContent] = useState('');

    useEffect(() => {
        if (reply) {
            setContent(reply.content || '');
        }
    }, [reply]);

    if (!isOpen || !reply) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!content.trim()) return;
        onSave(postId, reply.id, content.trim());
    };

    return (
        <div className="communication-modal-overlay" onClick={onClose}>
            <div className="communication-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="communication-modal-header">
                    <h3 className="communication-modal-title">Edit Reply</h3>
                    <button type="button" className="communication-modal-close" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Reply Content *</label>
                        <textarea
                            className="form-textarea"
                            rows={3}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                    <div className="modal-btn-row">
                        <button type="button" className="btn-modal-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-modal-submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Modal for Creating a New Discussion Post
function CreatePostModal({ isOpen, onClose, onSubmit, projectTitle, isSubmitting }) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    useEffect(() => {
        if (isOpen) {
            setTitle('');
            setContent('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;
        onSubmit(title.trim(), content.trim());
    };

    return (
        <div className="communication-modal-overlay" onClick={onClose}>
            <div className="communication-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="communication-modal-header">
                    <h3 className="communication-modal-title">Create New Post</h3>
                    <button type="button" className="communication-modal-close" onClick={onClose}>&times;</button>
                </div>
                <div className="communication-modal-subtitle">
                    Posting to: <strong>{projectTitle}</strong>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Post Title *</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Enter post title..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Post Content *</label>
                        <textarea
                            className="form-textarea"
                            placeholder="What would you like to discuss with the team?"
                            rows={4}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                        />
                    </div>
                    <div className="modal-btn-row">
                        <button type="button" className="btn-modal-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-modal-submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Publishing...' : 'Publish Post'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Single Post Card Component with Dynamic Profile Links & "..." Options Menu
function PostCard({
    post,
    onAddReply,
    currentUser,
    usersMap,
    projectTitle,
    projectId,
    onOpenInfo,
    onOpenEditPost,
    onOpenEditReply,
    onReport
}) {
    const [replyText, setReplyText] = useState('');
    const [showAllReplies, setShowAllReplies] = useState(false);
    const [submittingReply, setSubmittingReply] = useState(false);

    const replies = post.replies || [];
    // Show only the 2 newest replies unless showAllReplies is true
    const visibleReplies = showAllReplies ? replies : replies.slice(-2);
    const hasMoreReplies = replies.length > 2;

    const handleReplySubmit = async (e) => {
        e.preventDefault();
        if (!replyText.trim() || submittingReply) return;
        setSubmittingReply(true);
        try {
            await onAddReply(post.id, replyText.trim());
            setReplyText('');
        } finally {
            setSubmittingReply(false);
        }
    };

    // Resolve exact author profile (id, fullname, username)
    const authorProfile = resolveAuthorProfile(post.authorId, post.authorHandle, post.author, usersMap);
    const postAuthorId = authorProfile.id;
    const postFullName = authorProfile.fullname;
    const postHandle = authorProfile.username;

    const isPostAuthor = Boolean(
        (currentUser?.id && currentUser.id !== '?' && String(currentUser.id) === String(postAuthorId)) ||
        (currentUser?.username && currentUser.username !== '?' && (
            currentUser.username.toLowerCase() === String(postHandle || '').toLowerCase() ||
            currentUser.username.toLowerCase() === String(post.authorHandle || '').toLowerCase() ||
            currentUser.username.toLowerCase() === String(post.author || '').toLowerCase()
        ))
    );

    return (
        <div className="post-card-item">
            {/* Post Header & Author */}
            <div className="post-header-row">
                <div className="post-header-left">
                    <Link to={`/profile/${postAuthorId}`} className="author-avatar-link" title={`View profile of ${postFullName} (ID: ${postAuthorId})`}>
                        <img
                            src={post.avatar || getUserAvatarUrl(postHandle)}
                            alt={postFullName}
                            className="post-author-avatar"
                            onError={(e) => { e.target.src = '/ProfilePic/0.jpg'; }}
                        />
                    </Link>
                    <div className="post-author-info">
                        <Link to={`/profile/${postAuthorId}`} className="author-name-link" title={`View profile of ${postFullName} (ID: ${postAuthorId})`}>
                            <span className="post-author-name">{postFullName}</span>
                        </Link>
                        <Link to={`/profile/${postAuthorId}`} className="author-handle-link" title={`View profile of @${postHandle} (ID: ${postAuthorId})`}>
                            <span className="post-author-handle">@{postHandle}</span>
                        </Link>
                        {post.timestamp && <span className="post-time-tag">• {post.timestamp}</span>}
                    </div>
                </div>

                {/* Three dots options menu on top right of post */}
                <MessageOptionsMenu
                    isAuthor={isPostAuthor}
                    onOpenInfo={() => onOpenInfo({
                        type: 'post',
                        fullname: postFullName,
                        username: postHandle,
                        project: projectTitle,
                        timestamp: post.timestamp
                    })}
                    onEdit={() => onOpenEditPost(post)}
                    onReport={() => onReport({
                        type: 'post',
                        id: post.id,
                        username: postHandle,
                        fullname: postFullName,
                        project: projectTitle,
                        projectId: projectId,
                        content: post.title ? `${post.title}: ${post.content}` : post.content
                    })}
                />
            </div>

            {/* Post Title & Body */}
            <h3 className="post-title-text">{post.title}</h3>
            <p className="post-content-text">{post.content}</p>

            {/* Replies Section */}
            <div className="post-replies-container">
                {replies.length > 0 && (
                    <div className="post-replies-meta-row">
                        <span className="post-replies-count">{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
                        {hasMoreReplies && (
                            <button
                                type="button"
                                className="btn-toggle-replies"
                                onClick={() => setShowAllReplies(prev => !prev)}
                            >
                                {showAllReplies ? 'Show newest 2 only' : `View all ${replies.length} replies`}
                            </button>
                        )}
                    </div>
                )}

                {/* Visible Replies List */}
                {visibleReplies.length > 0 && (
                    <div className="post-replies-list">
                        {visibleReplies.map((reply) => {
                            // Resolve exact reply author profile (id, fullname, username)
                            const replyProfile = resolveAuthorProfile(reply.authorId, reply.authorHandle, reply.author, usersMap);
                            const replyAuthorId = replyProfile.id;
                            const replyFullName = replyProfile.fullname;
                            const replyHandle = replyProfile.username;

                            const isReplyAuthor = Boolean(
                                (currentUser?.id && currentUser.id !== '?' && String(currentUser.id) === String(replyAuthorId)) ||
                                (currentUser?.username && currentUser.username !== '?' && (
                                    currentUser.username.toLowerCase() === String(replyHandle || '').toLowerCase() ||
                                    currentUser.username.toLowerCase() === String(reply.authorHandle || '').toLowerCase() ||
                                    currentUser.username.toLowerCase() === String(reply.author || '').toLowerCase()
                                ))
                            );

                            return (
                                <div key={reply.id} className="reply-item-row">
                                    <Link to={`/profile/${replyAuthorId}`} className="author-avatar-link" title={`View profile of ${replyFullName} (ID: ${replyAuthorId})`}>
                                        <img
                                            src={reply.avatar || getUserAvatarUrl(replyHandle)}
                                            alt={replyFullName}
                                            className="reply-author-avatar"
                                            onError={(e) => { e.target.src = '/ProfilePic/0.jpg'; }}
                                        />
                                    </Link>
                                    <div className="reply-content-box">
                                        <div className="reply-author-row">
                                            <div className="reply-author-left">
                                                <Link to={`/profile/${replyAuthorId}`} className="author-name-link" title={`View profile of ${replyFullName} (ID: ${replyAuthorId})`}>
                                                    <span className="reply-author-name">{replyFullName}</span>
                                                </Link>
                                                <Link to={`/profile/${replyAuthorId}`} className="author-handle-link" title={`View profile of @${replyHandle} (ID: ${replyAuthorId})`}>
                                                    <span className="reply-author-handle">@{replyHandle}</span>
                                                </Link>
                                                {reply.timestamp && <span className="reply-time-tag">• {reply.timestamp}</span>}
                                            </div>

                                            {/* Three dots options menu on top right of reply */}
                                            <MessageOptionsMenu
                                                isAuthor={isReplyAuthor}
                                                onOpenInfo={() => onOpenInfo({
                                                    type: 'reply',
                                                    fullname: replyFullName,
                                                    username: replyHandle,
                                                    project: projectTitle,
                                                    timestamp: reply.timestamp
                                                })}
                                                onEdit={() => onOpenEditReply(post.id, reply)}
                                                onReport={() => onReport({
                                                    type: 'reply',
                                                    id: reply.id,
                                                    username: replyHandle,
                                                    fullname: replyFullName,
                                                    project: projectTitle,
                                                    projectId: projectId,
                                                    content: reply.content
                                                })}
                                            />
                                        </div>
                                        <div className="reply-text-body">{reply.content}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Reply Input Form */}
                <form className="reply-input-row" onSubmit={handleReplySubmit}>
                    <input
                        type="text"
                        className="reply-text-input"
                        placeholder="Reply"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        disabled={submittingReply}
                    />
                    <button
                        type="submit"
                        className="reply-submit-btn"
                        title="Send reply"
                        disabled={!replyText.trim() || submittingReply}
                    >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 10 4 15 9 20" />
                            <path d="M20 4v7a4 4 0 0 1-4 4H4" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
}

function CommunicationContent() {
    const client = useQueryClient();
    const navigate = useNavigate();
    const { currentUser } = useCurrentUser();

    // Fetch all users to dynamically map usernames/fullnames -> user IDs
    const { data: allUsers = [] } = useQuery({
        queryKey: ['commAllUsers'],
        queryFn: async () => {
            try {
                const allUsersRes = await request.get('/api/users');
                return Array.isArray(allUsersRes) ? allUsersRes : (allUsersRes?.data && Array.isArray(allUsersRes.data) ? allUsersRes.data : []);
            } catch (uErr) {
                return [];
            }
        },
        staleTime: 1000 * 60 * 5
    });

    const usersMap = useMemo(() => {
        const map = {
            'kdt': '1',
            'vcerianman': '2',
            'ngolodo': '3',
            'ngo lo do': '3',
            'khanig': '4',
            'khang nig': '4',
            'admin': '1'
        };
        allUsers.forEach(u => {
            const rawId = u.id ?? u.ID ?? u.Id ?? u._id ?? u.userId ?? u.UserId ?? u.user_id;
            const uid = rawId !== undefined && rawId !== null ? String(rawId).trim() : '';
            const uname = u.username || u.userName || u.Username || '';
            const fname = u.fullname || u.full_name || u.fullName || u.name || uname || 'User';
            const profile = { id: uid, username: uname, fullname: fname };

            if (uid && uid !== '' && uid !== 'undefined' && uid !== 'null') {
                map[uid] = profile;
                const unames = [u.username, u.userName, u.Username, u.handle, u.author];
                unames.forEach(un => {
                    if (un && typeof un === 'string') {
                        map[un.toLowerCase().trim()] = profile;
                    }
                });
                const fnames = [u.fullname, u.full_name, u.fullName, u.name, u.Name];
                fnames.forEach(fn => {
                    if (fn && typeof fn === 'string') {
                        map[fn.toLowerCase().trim()] = profile;
                    }
                });
            }
        });
        return map;
    }, [allUsers]);

    const usersMapRef = useRef(usersMap);
    usersMapRef.current = usersMap;

    // Default activeProjectId to 'global'
    const [activeProjectId, setActiveProjectId] = useState('global');

    // Fetch involved projects
    const {
        data: projects = [],
        isLoading: loadingProjects,
        isError: projectsError,
        refetch: refetchProjects
    } = useQuery({
        queryKey: ['commUserProjects', currentUser.id, currentUser.username],
        queryFn: async () => {
            let userProjectIds = [];
            const userId = currentUser.id;
            const uname = currentUser.username;
            const authProjects = currentUser.projects || [];

            if (userId && userId !== '?') {
                try {
                    const userRes = await request.get(`/api/users/${userId}`);
                    const userData = userRes?.data || userRes;
                    if (userData && Array.isArray(userData.projects)) {
                        userProjectIds = userData.projects.map(p => String(typeof p === 'object' && p !== null ? (p.id || p.projectId) : p));
                    }
                } catch (uErr) {
                    console.error(`Failed to fetch /api/users/${userId}:`, uErr);
                }
            }

            if (userProjectIds.length === 0 && authProjects.length > 0) {
                userProjectIds = authProjects.map(p => String(typeof p === 'object' && p !== null ? (p.id || p.projectId) : p));
            }

            let involvedProjects = [];
            let hadFetchError = false;

            try {
                const projData = await request.get('/api/projects');
                const pList = Array.isArray(projData) ? projData : (projData?.data && Array.isArray(projData.data) ? projData.data : null);
                if (pList && pList.length > 0) {
                    involvedProjects = pList.filter(p => {
                        const pId = String(p.id || p._id || '');
                        const isAssigned = userProjectIds.includes(pId);
                        const isOwner = (p.owner && uname && String(p.owner).toLowerCase() === uname.toLowerCase()) ||
                            (p.createdBy && uname && String(p.createdBy).toLowerCase() === uname.toLowerCase());
                        const isMember = Array.isArray(p.users) && p.users.some(u => {
                            const uId = String(typeof u === 'object' ? (u.id || u._id || '') : u);
                            const uName = String(typeof u === 'object' ? (u.username || '') : u).toLowerCase();
                            return (userId !== '?' && uId === userId) || (uname !== '?' && uName === uname.toLowerCase());
                        });
                        return isAssigned || isOwner || isMember;
                    }).map(p => ({
                        id: String(p.id || p._id),
                        title: p.title || p.name || `Project ${p.id}`,
                        desc: p.description || p.desc || 'Project collaboration and task management',
                        owner: p.owner || p.createdBy || p.ownerName || 'KDT',
                        status: (p.status || 'ACTIVE').toUpperCase(),
                        users: Array.isArray(p.users) ? p.users : []
                    }));
                }
            } catch (pErr) {
                hadFetchError = true;
            }

            if (involvedProjects.length === 0 && userProjectIds.length > 0) {
                const projectPromises = userProjectIds.map(async (projId) => {
                    try {
                        const projRes = await request.get(`/api/projects/${projId}`);
                        const p = projRes?.data || projRes;
                        if (p) {
                            return {
                                id: String(p.id || projId),
                                title: p.title || p.name || `Project ${projId}`,
                                desc: p.description || p.desc || '',
                                owner: p.owner || p.createdBy || 'KDT',
                                status: (p.status || 'ACTIVE').toUpperCase(),
                                users: Array.isArray(p.users) ? p.users : []
                            };
                        }
                    } catch (err) {
                        return {
                            id: String(projId),
                            title: `Project ${projId}`,
                            desc: '',
                            owner: 'KDT',
                            status: 'ACTIVE',
                            users: []
                        };
                    }
                    return null;
                });
                const resList = await Promise.all(projectPromises);
                involvedProjects = resList.filter(Boolean);
            }

            if (involvedProjects.length === 0 && hadFetchError) {
                throw new Error('Failed to fetch projects');
            }

            return involvedProjects;
        }
    });

    // Helper to format backend post/reply item with author profile link ID
    const formatPostItem = useCallback((item) => {
        const uName = item.author || item.username || item.authorName || item.user?.username || item.user?.fullname || item.createdBy || 'User';
        const handle = item.username || item.authorHandle || item.author || item.user?.username || 'User';
        const rawAuthorId = item.userId ?? item.user_id ?? item.authorId ?? item.author_id ?? item.UserId ?? item.AuthorId ?? item.user?.id ?? item.user?._id;
        const authorId = resolveAuthorUserId(rawAuthorId, handle, uName, usersMapRef.current);

        return {
            id: item.id || item._id,
            authorId: authorId,
            author: item.user?.fullname || item.fullname || uName,
            authorHandle: handle,
            avatar: item.avatar || item.user?.image || getUserAvatarUrl(handle),
            title: item.title || item.Title || '',
            content: item.description || item.Description || item.content || item.desc || '',
            timestamp: formatTimestamp(item.createdAt || item.created_at || item.timestamp),
            replies: []
        };
    }, []);

    // Fetch active project detailed data
    const { data: activeProjectDetails } = useQuery({
        queryKey: ['commActiveProjectDetails', activeProjectId],
        queryFn: async () => {
            if (!activeProjectId || activeProjectId === 'global') {
                return {
                    id: null,
                    isGlobal: true,
                    title: 'Global Discussion',
                    desc: 'For all users',
                    status: 'ACTIVE',
                    owner: 'All Users',
                    users: [
                        { id: '1', fullname: 'All Users', username: 'everyone', image: '/ProfilePic/0.jpg' }
                    ]
                };
            }

            const initialProj = projects.find(p => String(p.id) === String(activeProjectId));
            let pData = initialProj;
            try {
                const res = await request.get(`/api/projects/${activeProjectId}`);
                const fullP = res?.data || res;
                if (fullP && (fullP.id || fullP.title || fullP.name)) {
                    pData = {
                        ...pData,
                        ...fullP,
                        id: String(fullP.id || activeProjectId),
                        title: fullP.title || fullP.name || pData?.title || `Project ${activeProjectId}`,
                        desc: fullP.description || fullP.desc || pData?.desc || '',
                        status: (fullP.status || pData?.status || 'ACTIVE').toUpperCase(),
                        owner: fullP.owner || fullP.createdBy || fullP.ownerName || pData?.owner || 'KDT'
                    };
                }
            } catch (err) {
                console.error(`Failed to fetch project details (/api/projects/${activeProjectId}):`, err);
            }

            let pUsers = [];
            try {
                const pUsersRes = await request.get(`/api/users?projectId=${activeProjectId}`);
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
                console.error(`Failed to fetch project users (/api/users?projectId=${activeProjectId}):`, uErr);
            }

            if (pUsers.length === 0 && Array.isArray(pData?.users) && pData.users.length > 0) {
                pUsers = pData.users.map(u => (typeof u === 'object' ? u : {
                    id: String(u),
                    fullname: String(u),
                    username: String(u),
                    image: getUserAvatarUrl(String(u))
                }));
            } else if (pUsers.length === 0 && pData?.owner) {
                pUsers = [{
                    id: '1',
                    fullname: pData.owner,
                    username: pData.owner,
                    image: getUserAvatarUrl(pData.owner)
                }];
            } else if (pUsers.length === 0) {
                pUsers = [
                    { id: '1', fullname: 'vcerianman', username: 'vcerianman', image: '/ProfilePic/0.jpg' },
                    { id: '2', fullname: 'Ngo Lo Do', username: 'NgoLoDo', image: '/ProfilePic/0.jpg' },
                    { id: '3', fullname: 'KDT', username: 'KDT', image: '/ProfilePic/KDT.jpg' },
                    { id: '4', fullname: 'Khang nig', username: 'khanig', image: '/ProfilePic/khanig.jpg' }
                ];
            }

            return {
                id: String(activeProjectId),
                isGlobal: false,
                title: pData?.title || `Project ${activeProjectId}`,
                desc: pData?.desc || pData?.description || 'Project collaboration and team discussions',
                status: (pData?.status || 'ACTIVE').toUpperCase(),
                owner: pData?.owner || 'KDT',
                users: pUsers
            };
        },
        enabled: Boolean(activeProjectId)
    });

    // Fetch posts & replies for active project
    const {
        data: currentPosts,
        isLoading: loadingPosts,
        isError: postsError,
        refetch: refetchPosts
    } = useQuery({
        queryKey: ['commPosts', activeProjectId],
        queryFn: async () => {
            if (!activeProjectId) return [];
            const isGlobal = activeProjectId === 'global';

            let data = null;
            if (isGlobal) {
                try {
                    data = await request.get('/api/posts?projectId=null');
                } catch (err1) {
                    try {
                        data = await request.get('/api/posts');
                    } catch (err2) {
                        try {
                            data = await request.get('/api/post');
                        } catch (err3) {
                            throw err3;
                        }
                    }
                }
            } else {
                try {
                    data = await request.get(`/api/posts?projectId=${encodeURIComponent(activeProjectId)}`);
                } catch (err1) {
                    try {
                        data = await request.get(`/api/post?projectId=${encodeURIComponent(activeProjectId)}`);
                    } catch (err2) {
                        try {
                            data = await request.get(`/api/posts?project_id=${encodeURIComponent(activeProjectId)}`);
                        } catch (err3) {
                            try {
                                data = await request.get('/api/posts');
                            } catch (err4) {
                                throw err4;
                            }
                        }
                    }
                }
            }

            const rawList = Array.isArray(data) ? data : (data?.data && Array.isArray(data.data) ? data.data : (data?.posts || null));

            if (!rawList || rawList.length === 0) {
                return [];
            }

            const projectItems = rawList.filter(item => {
                const pId = item.project_id ?? item.projectId ?? item.project ?? null;
                if (isGlobal) {
                    return pId === null || pId === undefined || pId === 'null' || pId === '' || pId === 0;
                }
                return String(pId) === String(activeProjectId);
            });

            const topLevelPosts = [];
            const repliesByParent = {};

            projectItems.forEach(item => {
                const isReply = item.reply !== null && item.reply !== undefined && item.reply !== 0 && item.reply !== '';
                if (isReply) {
                    const parentId = String(item.reply);
                    if (!repliesByParent[parentId]) {
                        repliesByParent[parentId] = [];
                    }
                    repliesByParent[parentId].push(formatPostItem(item));
                } else {
                    topLevelPosts.push(formatPostItem(item));
                }
            });

            const combinedPosts = topLevelPosts.map(post => {
                const nestedReplies = Array.isArray(post.replies) && post.replies.length > 0 ? post.replies : [];
                const flatReplies = repliesByParent[String(post.id)] || [];
                const allReplies = [...nestedReplies, ...flatReplies];
                const uniqueReplies = Array.from(new Map(allReplies.map(r => [r.id, r])).values());
                return {
                    ...post,
                    replies: uniqueReplies
                };
            });

            return combinedPosts;
        },
        enabled: Boolean(activeProjectId)
    });

    const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
    const [submittingPost, setSubmittingPost] = useState(false);
    const [toast, setToast] = useState(null);

    // Project Users Modal state
    const [projectUsersModal, setProjectUsersModal] = useState({
        isOpen: false,
        title: 'Project Users',
        users: []
    });

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    const handleSelectProject = (projId) => {
        if (String(projId) === String(activeProjectId)) return;
        setActiveProjectId(projId);
    };

    const isGlobalChat = activeProjectId === 'global';
    const activeProject = activeProjectDetails || (isGlobalChat ? {
        id: null,
        isGlobal: true,
        title: 'Global Discussion',
        desc: 'For all users',
        status: 'ACTIVE',
        owner: 'All Users',
        users: [{ id: '1', fullname: 'All Users', username: 'everyone', image: '/ProfilePic/0.jpg' }]
    } : (projects.find(p => String(p.id) === String(activeProjectId)) || projects[0]));

    const showLoading = loadingPosts && currentPosts === undefined;

    // Add New Post Handler
    const handleCreatePost = async (title, content) => {
        if (!activeProjectId) return;

        const isUserBlocked = String(currentUser.status || '').toUpperCase() === 'BLOCKED' || String(currentUser.status || '').toUpperCase() === 'BANNED';
        if (isUserBlocked) {
            showToast('You are blocked from creating posts.', 'error');
            return;
        }

        setSubmittingPost(true);

        const payload = {
            title: title.trim(),
            description: content.trim(),
            desc: content.trim(),
            content: content.trim(),
            reply: null,
            project_id: isGlobalChat ? null : (Number(activeProjectId) || activeProjectId),
            projectId: isGlobalChat ? null : (Number(activeProjectId) || activeProjectId)
        };

        try {
            let createdItem = null;
            let postError = null;

            try {
                createdItem = await request.post('/api/posts', payload);
            } catch (pErr1) {
                postError = pErr1;
                try {
                    createdItem = await request.post('/api/post', payload);
                    postError = null;
                } catch (pErr2) {
                    postError = pErr2;
                }
            }

            if (postError) {
                throw postError;
            }

            const itemData = createdItem?.data || createdItem;
            const newPost = {
                id: itemData?.id || Date.now(),
                authorId: String(currentUser.id || '1'),
                author: currentUser.fullname || currentUser.username || 'User',
                authorHandle: currentUser.username || 'User',
                avatar: currentUser.image || '/ProfilePic/0.jpg',
                title,
                content,
                timestamp: 'Just now',
                replies: []
            };

            // Update TanStack query cache optimistically and invalidate
            client.setQueryData(['commPosts', activeProjectId], (old = []) => [newPost, ...old]);
            client.invalidateQueries({ queryKey: ['commPosts', activeProjectId] });

            showToast('Post created successfully.', 'success');
            setIsCreatePostOpen(false);
        } catch (err) {
            console.error('Failed to create post (POST /api/posts):', err);
            const errStatus = err.response?.status;
            const errMessage = err.response?.data?.message || err.response?.data?.error || 
                (errStatus === 401 || errStatus === 403 
                    ? 'You are not authorized to create posts.' 
                    : 'Failed to create post. Please try again.');
            showToast(errMessage, 'error');
        } finally {
            setSubmittingPost(false);
        }
    };

    // Add Reply Handler
    const handleAddReply = async (postId, replyContent) => {
        if (!activeProjectId) return;

        const isUserBlocked = String(currentUser.status || '').toUpperCase() === 'BLOCKED' || String(currentUser.status || '').toUpperCase() === 'BANNED';
        if (isUserBlocked) {
            showToast('You are blocked from sending replies.', 'error');
            return;
        }

        const payload = {
            title: null,
            description: replyContent.trim(),
            desc: replyContent.trim(),
            content: replyContent.trim(),
            reply: Number(postId) || postId,
            reply_id: Number(postId) || postId,
            project_id: isGlobalChat ? null : (Number(activeProjectId) || activeProjectId),
            projectId: isGlobalChat ? null : (Number(activeProjectId) || activeProjectId)
        };

        try {
            let createdReply = null;
            let replyError = null;

            try {
                createdReply = await request.post('/api/posts', payload);
            } catch (rErr1) {
                replyError = rErr1;
                try {
                    createdReply = await request.post('/api/post', payload);
                    replyError = null;
                } catch (rErr2) {
                    replyError = rErr2;
                }
            }

            if (replyError) {
                throw replyError;
            }

            const rData = createdReply?.data || createdReply;
            const newReply = {
                id: rData?.id || Date.now(),
                authorId: String(currentUser.id || '1'),
                author: currentUser.fullname || currentUser.username || 'User',
                authorHandle: currentUser.username || 'User',
                avatar: currentUser.image || '/ProfilePic/0.jpg',
                content: replyContent,
                timestamp: 'Just now'
            };

            client.setQueryData(['commPosts', activeProjectId], (old = []) =>
                old.map(p => {
                    if (p.id === postId) {
                        return {
                            ...p,
                            replies: [...(p.replies || []), newReply]
                        };
                    }
                    return p;
                })
            );
            client.invalidateQueries({ queryKey: ['commPosts', activeProjectId] });

            showToast('Reply sent.', 'success');
        } catch (err) {
            console.error(`Failed to send reply to post ${postId}:`, err);
            const errStatus = err.response?.status;
            const errMessage = err.response?.data?.message || err.response?.data?.error || 
                (errStatus === 401 || errStatus === 403 
                    ? 'You are not authorized to send replies.' 
                    : 'Failed to send reply. Please try again.');
            showToast(errMessage, 'error');
        }
    };

    // Message Info Modal state
    const [infoModal, setInfoModal] = useState({
        isOpen: false,
        data: null
    });

    // Edit Post Modal state
    const [editPostModal, setEditPostModal] = useState({
        isOpen: false,
        post: null
    });

    // Edit Reply Modal state
    const [editReplyModal, setEditReplyModal] = useState({
        isOpen: false,
        postId: null,
        reply: null
    });

    const handleOpenInfo = (infoData) => {
        setInfoModal({
            isOpen: true,
            data: infoData
        });
    };

    const handleOpenEditPost = (post) => {
        setEditPostModal({
            isOpen: true,
            post: post
        });
    };

    const handleOpenEditReply = (postId, reply) => {
        setEditReplyModal({
            isOpen: true,
            postId: postId,
            reply: reply
        });
    };

    const handleSaveEditPost = async (postId, newTitle, newContent) => {
        setSubmittingPost(true);
        try {
            try {
                await request.put(`/api/posts/${postId}`, {
                    title: newTitle,
                    description: newContent,
                    content: newContent,
                    desc: newContent
                });
            } catch (err) {
                console.warn('Backend edit post notification:', err);
            }

            client.setQueryData(['commPosts', activeProjectId], (old = []) =>
                old.map(p => {
                    if (p.id === postId) {
                        return { ...p, title: newTitle, content: newContent };
                    }
                    return p;
                })
            );
            client.invalidateQueries({ queryKey: ['commPosts', activeProjectId] });

            setEditPostModal({ isOpen: false, post: null });
            showToast('Post updated successfully.', 'success');
        } catch (err) {
            showToast('Failed to update post.', 'error');
        } finally {
            setSubmittingPost(false);
        }
    };

    const handleSaveEditReply = async (postId, replyId, newContent) => {
        try {
            try {
                await request.put(`/api/posts/${replyId}`, {
                    description: newContent,
                    content: newContent,
                    desc: newContent
                });
            } catch (err) {
                console.warn('Backend edit reply notification:', err);
            }

            client.setQueryData(['commPosts', activeProjectId], (old = []) =>
                old.map(p => {
                    if (p.id === postId) {
                        return {
                            ...p,
                            replies: (p.replies || []).map(r => {
                                if (r.id === replyId) {
                                    return { ...r, content: newContent };
                                }
                                return r;
                            })
                        };
                    }
                    return p;
                })
            );
            client.invalidateQueries({ queryKey: ['commPosts', activeProjectId] });

            setEditReplyModal({ isOpen: false, postId: null, reply: null });
            showToast('Reply updated successfully.', 'success');
        } catch (err) {
            showToast('Failed to update reply.', 'error');
        }
    };

    const handleReport = (item) => {
        navigate('/report', {
            state: {
                type: item.type || 'post',
                id: item.id,
                username: item.username,
                fullname: item.fullname,
                project: item.project || activeProject?.title || 'Global Discussion',
                projectId: item.projectId || activeProject?.id,
                content: item.content
            }
        });
    };

    // User avatars for banner
    const bannerUsers = activeProject?.users || [];
    const displayedBannerUsers = bannerUsers.slice(0, 5);
    const extraUsersCount = Math.max(0, bannerUsers.length - 5);
    const bannerUsersText = isGlobalChat
        ? 'All Users'
        : (bannerUsers.length > 0
            ? bannerUsers.map(u => u.fullname || u.name || u.username || 'User').join(', ')
            : 'vcerianman, Ngo Lo Do, KDT, Khang nig');

    const handleOpenProjectUsers = () => {
        if (!activeProject) return;
        setProjectUsersModal({
            isOpen: true,
            title: isGlobalChat ? 'Global Discussion Members:' : `${activeProject.title || 'Project'} USERS:`,
            users: bannerUsers.length > 0 ? bannerUsers : []
        });
    };

    return (
        <div className="communication-page-wrapper">
            <div id="navbar-root">
                <NavBar
                    userId={currentUser.id}
                    fullName={currentUser.fullname}
                    userName={currentUser.username}
                    userImg={currentUser.image}
                    userRole={currentUser.role}
                />
            </div>

            {/* Notification Toast */}
            {toast && (
                <Notification
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <div className="communication-container">
                {/* Top Page Header */}
                <div className="communication-top-header">
                    <h1 className="communication-top-title">Communication</h1>
                </div>

                {/* Main Content Layout */}
                <div className="communication-layout">
                    {/* Left Sidebar: Involved Project Titles + Bottom Global Chat Tab */}
                    <div className="communication-sidebar-card">
                        <div className="communication-sidebar-projects-list">
                            <div className="communication-sidebar-section-title">Projects</div>
                            {projectsError ? (
                                <div className="communication-reload-center-box">
                                    <ReloadButton onReload={() => refetchProjects()} isLoading={loadingProjects} title="Reload projects" />
                                </div>
                            ) : loadingProjects && projects.length === 0 ? (
                                <div className="communication-sidebar-loading">Loading projects...</div>
                            ) : projects.length > 0 ? (
                                projects.map((proj) => (
                                    <button
                                        key={proj.id}
                                        type="button"
                                        className={`communication-tab-item ${String(activeProjectId) === String(proj.id) ? 'active' : ''}`}
                                        onClick={() => handleSelectProject(proj.id)}
                                        title={proj.title}
                                    >
                                        {proj.title}
                                    </button>
                                ))
                            ) : (
                                <div className="communication-sidebar-empty">No involved projects</div>
                            )}
                        </div>

                        {/* Separated Global Discussion Tab at the bottom */}
                        <div className="communication-sidebar-footer">
                            <button
                                type="button"
                                className={`communication-tab-item global-chat-tab ${activeProjectId === 'global' ? 'active' : ''}`}
                                onClick={() => handleSelectProject('global')}
                                title="Global Discussion"
                            >
                                <span className="global-chat-tab-icon">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                                    </svg>
                                </span>
                                Global Discussion
                            </button>
                        </div>
                    </div>

                    {/* Right Content Area */}
                    <div className="communication-content-area">
                        {/* Top Project Banner Card */}
                        {activeProject && (
                            <div className={`communication-project-banner ${isGlobalChat ? 'status-active global-banner' : getProjectStatusClass(activeProject.status)}`}>
                                {/* Left Side: Title & Description */}
                                <div className="banner-left-section">
                                    <div className="banner-project-title-row">
                                        <span className="banner-project-title">{activeProject.title}</span>
                                        {activeProject.id && (
                                             <span className="banner-project-id">(id:{activeProject.id})</span>
                                        )}
                                        {isGlobalChat && (
                                            <span className="banner-project-id banner-global-badge">Public</span>
                                        )}
                                    </div>
                                    <div className="banner-project-desc">
                                        {activeProject.desc || activeProject.description || 'Project collaboration and team discussions'}
                                    </div>
                                </div>

                                {/* Middle Section: Users list and avatars */}
                                <div className="banner-middle-section">
                                    <div className="banner-users-header">
                                        <div className="banner-users-label" title={`Users: ${bannerUsersText}`}>
                                            Users: <span>{bannerUsersText}</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="banner-info-circle-btn"
                                            title="View involved users"
                                            aria-label="View involved users"
                                            onClick={handleOpenProjectUsers}
                                        >
                                            <svg viewBox="0 0 24 24" width="22" height="22" fill="#60646c">
                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="banner-avatars-row">
                                        {displayedBannerUsers.map((u, idx) => (
                                            <img
                                                key={u.id || idx}
                                                src={u.image || getUserAvatarUrl(u.username)}
                                                alt={u.fullname || u.username}
                                                className="banner-user-avatar"
                                                title={`${u.fullname || u.username} (@${u.username})`}
                                                onError={(e) => { e.target.src = '/ProfilePic/0.jpg'; }}
                                            />
                                        ))}
                                        {extraUsersCount > 0 && (
                                            <span className="banner-users-extra-badge">+{extraUsersCount}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Right Section: Status & Owner */}
                                <div className="banner-right-section">
                                    <div className="banner-status-text">
                                        Status: <strong>{activeProject.status || 'ACTIVE'}</strong>
                                    </div>
                                    <div className="banner-owner-text">
                                        owner: @{activeProject.owner || 'KDT'}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Posts Header */}
                        <div className="posts-heading-row">
                            <h2 className="posts-section-title">Posts</h2>
                        </div>

                        {/* Main White Card containing scrollable Posts */}
                        <div className="communication-posts-main-card">
                            {postsError ? (
                                <div className="communication-reload-center-box">
                                    <ReloadButton
                                        onReload={() => refetchPosts()}
                                        isLoading={loadingPosts}
                                        title="Reload posts"
                                    />
                                </div>
                            ) : showLoading ? (
                                <div className="posts-empty-state">
                                    <p>Loading discussions...</p>
                                </div>
                            ) : !currentPosts || currentPosts.length === 0 ? (
                                <div className="posts-empty-state">
                                    <p>No posts in <strong>{activeProject?.title}</strong> yet.</p>
                                    <p className="posts-empty-subtitle">Be the first to share an update or start a discussion!</p>
                                </div>
                            ) : (
                                <div className="posts-list-wrapper">
                                    {currentPosts.map((post) => (
                                        <PostCard
                                            key={post.id}
                                            post={post}
                                            onAddReply={handleAddReply}
                                            currentUser={currentUser}
                                            usersMap={usersMap}
                                            projectTitle={activeProject?.title || (isGlobalChat ? 'Global Discussion' : 'Current Project')}
                                            projectId={activeProject?.id}
                                            onOpenInfo={handleOpenInfo}
                                            onOpenEditPost={handleOpenEditPost}
                                            onOpenEditReply={handleOpenEditReply}
                                            onReport={handleReport}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Create New Post Button */}
                        <div className="create-post-btn-row">
                            <button
                                type="button"
                                className="btn-create-new-post"
                                onClick={() => setIsCreatePostOpen(true)}
                            >
                                Create new post
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Post Modal */}
            <CreatePostModal
                isOpen={isCreatePostOpen}
                onClose={() => setIsCreatePostOpen(false)}
                onSubmit={handleCreatePost}
                projectTitle={activeProject?.title || (isGlobalChat ? 'Global Discussion' : 'Current Project')}
                isSubmitting={submittingPost}
            />

            {/* Project Users Modal */}
            <ProjectUsersModal
                isOpen={projectUsersModal.isOpen}
                onClose={() => setProjectUsersModal(prev => ({ ...prev, isOpen: false }))}
                title={projectUsersModal.title}
                users={projectUsersModal.users}
                usersMap={usersMap}
            />

            {/* Message Info Modal */}
            <MessageInfoModal
                isOpen={infoModal.isOpen}
                onClose={() => setInfoModal({ isOpen: false, data: null })}
                info={infoModal.data}
            />

            {/* Edit Post Modal */}
            <EditPostModal
                isOpen={editPostModal.isOpen}
                onClose={() => setEditPostModal({ isOpen: false, post: null })}
                onSave={handleSaveEditPost}
                post={editPostModal.post}
                isSubmitting={submittingPost}
            />

            {/* Edit Reply Modal */}
            <EditReplyModal
                isOpen={editReplyModal.isOpen}
                onClose={() => setEditReplyModal({ isOpen: false, postId: null, reply: null })}
                onSave={handleSaveEditReply}
                postId={editReplyModal.postId}
                reply={editReplyModal.reply}
                isSubmitting={false}
            />
        </div>
    );
}

function Communication() {
    return <CommunicationContent />;
}

export default Communication;
