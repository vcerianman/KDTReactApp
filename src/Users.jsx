import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './Users.css';
import NavBar from './NavBar';
import request from './api/Request';
import { getUserAvatarUrl } from './utils';

// Section Reload Button Component matching the reload icon design
function ReloadButton({ onReload, isLoading }) {
    return (
        <button
            type="button"
            className={`section-reload-btn ${isLoading ? 'loading' : ''}`}
            onClick={onReload}
            title="Reload users"
            aria-label="Reload users"
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

// Header Component with Search and Category Dropdown
function UsersHeader({ searchQuery, onSearchChange, category, onCategoryChange }) {
    return (
        <div className="users-header-row">
            <h1 className="page-title">Global Users</h1>

            <div className="search-filter-group">
                <select
                    className="search-category-select"
                    id="searchCategorySelect"
                    value={category}
                    onChange={(e) => onCategoryChange(e.target.value)}
                >
                    <option value="all">All Fields</option>
                    <option value="fullname">Full Name</option>
                    <option value="username">Username</option>
                    <option value="activity">Activity / Status</option>
                    <option value="role">Role</option>
                </select>

                <div className="search-container users-search">
                    <svg className="search-icon" viewBox="0 0 24 24" width="14" height="14" fill="#999">
                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                    </svg>
                    <input
                        type="text"
                        className="top-search-input"
                        id="userSearchInput"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}

// Single User Card Component
function UserCard({ user }) {
    const avatarSrc = user.image || getUserAvatarUrl(user.username);

    return (
        <div className="user-card">
            <div className="user-avatar-box">
                <img
                    src={avatarSrc}
                    alt={user.fullname}
                    className="user-avatar-img"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/ProfilePic/0.jpg';
                    }}
                />
            </div>
            <div className="user-details">
                <Link to={`/profile/${user.id}`} className="user-fullname-link">
                    {user.fullname}
                </Link>
                <div className="user-handle">@{user.username}</div>
                <div className="user-status-role">
                    <span className="user-role">{user.role}</span> - <span className="user-status">{user.status}</span>
                </div>
            </div>
        </div>
    );
}

// Users Grid and List Container
function UsersList({ users, searchQuery, category, error, loading, onReload }) {
    if (error) {
        return (
            <div className="users-outer-card">
                <div className="users-reload-center-box">
                    <ReloadButton onReload={onReload} isLoading={loading} />
                </div>
            </div>
        );
    }

    const query = (searchQuery || '').toLowerCase().trim();

    const filteredUsers = (users || []).filter(user => {
        if (!query) return true;
        const fullName = (user.fullname || '').toLowerCase();
        const username = (user.username || '').toLowerCase();
        const role = (user.role || '').toLowerCase();
        const status = (user.status || '').toLowerCase();

        if (category === 'fullname') return fullName.includes(query);
        if (category === 'username') return username.includes(query);
        if (category === 'activity') return status.includes(query);
        if (category === 'role') return role.includes(query);

        // Default 'all'
        return fullName.includes(query) || username.includes(query) || role.includes(query) || status.includes(query);
    });

    return (
        <div className="users-outer-card">
            <div className="users-scroll-wrapper">
                <div className="users-grid" id="usersGrid">
                    {filteredUsers.length > 0 ? (
                        filteredUsers.map(user => (
                            <UserCard key={user.id} user={user} />
                        ))
                    ) : (
                        <p style={{ color: '#888888', gridColumn: 'span 2', textAlign: 'center', padding: '30px 0' }}>
                            No users found matching your search.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

// Main Users Page Component
function Users() {
    const [searchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
    const [categoryFilter, setCategoryFilter] = useState('all');

    // Current logged in user info
    const [currentUser, setCurrentUser] = useState({
        id: "?",
        fullname: "?",
        username: "?",
        image: "/ProfilePic/0.jpg"
    });

    // Users data & state
    const [users, setUsers] = useState([]);
    const [usersError, setUsersError] = useState(false);
    const [usersLoading, setUsersLoading] = useState(false);

    // Fetch logged in user
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

    // Fetch users from /api/users
    const fetchUsers = useCallback(async () => {
        setUsersLoading(true);
        try {
            const data = await request.get('/api/users');
            const userList = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : null);
            if (userList) {
                setUsers(userList.map(u => ({
                    id: String(u.id || u._id || Math.random()),
                    fullname: u.full_name || u.fullName || u.fullname || u.name || u.username || 'User',
                    username: u.username || '',
                    role: u.role || 'MEMBER',
                    status: u.status || 'Active',
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

    useEffect(() => {
        fetchCurrentUser();
        fetchUsers();
    }, [fetchCurrentUser, fetchUsers]);

    // Synchronize query parameter if changed in URL
    useEffect(() => {
        const query = searchParams.get('search');
        if (query !== null) {
            setSearchQuery(query);
        }
    }, [searchParams]);

    return (
        <div className="users-page-wrapper">
            {/* Top Navigation Bar Component */}
            <div id="navbar-root">
                <NavBar userId={currentUser.id} fullName={currentUser.fullname} userName={currentUser.username} userImg={currentUser.image} />
            </div>

            {/* Page Content Container */}
            <div className="page-container">
                <UsersHeader
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    category={categoryFilter}
                    onCategoryChange={setCategoryFilter}
                />

                <UsersList
                    users={users}
                    searchQuery={searchQuery}
                    category={categoryFilter}
                    error={usersError}
                    loading={usersLoading}
                    onReload={fetchUsers}
                />
            </div>
        </div>
    );
}

export default Users;
