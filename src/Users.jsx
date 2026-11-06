import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './Users.css';
import NavBar from './NavBar';
import request from './api/Request';
import { getUserAvatarUrl } from './utils';
import { useTheme } from './useTheme';
import useCurrentUser from './useCurrentUser';

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

// Single User Card Component with Inline-Styled Reputation Bar
function UserCard({ user }) {
    const avatarSrc = user.image || getUserAvatarUrl(user.username);
    const isBlocked = String(user.status || '').toUpperCase() === 'BLOCKED';

    const upvotes = user.upvotes ?? 0;
    const downvotes = user.downvotes ?? 0;
    const total = upvotes + downvotes;

    // Default to 50% if no votes have been cast
    const upPct = total > 0 ? (upvotes / total) * 100 : 50;
    const downPct = total > 0 ? (downvotes / total) * 100 : 50;
    const displayPct = Math.round(upPct);

    // Dynamic badge & bar color thresholding
    let pctColor = '#ef4444'; // Red (0% - 40%)
    if (upPct >= 70) {
        pctColor = '#22c55e'; // Green (70% - 100%)
    } else if (upPct >= 41) {
        pctColor = '#eab308'; // Yellow (41% - 69%)
    }

    return (
        <div className={`user-card ${isBlocked ? 'user-card-blocked' : ''}`}>
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

                {/* Visible Standalone Reputation Bar */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '10px',
                        width: '100%'
                    }}
                >
                    <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 'bold' }}>
                        +{upvotes}
                    </span>

                    {/* Progress Bar Track */}
                    <div
                        style={{
                            flex: 1,
                            height: '8px',
                            backgroundColor: '#334155',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            display: 'flex'
                        }}
                        title={`${upvotes} upvotes / ${downvotes} downvotes (${displayPct}%)`}
                    >
                        <div
                            style={{
                                width: `${upPct}%`,
                                backgroundColor: '#22c55e',
                                height: '100%',
                                transition: 'width 0.3s ease'
                            }}
                        />
                        <div
                            style={{
                                width: `${downPct}%`,
                                backgroundColor: '#ef4444',
                                height: '100%',
                                transition: 'width 0.3s ease'
                            }}
                        />
                    </div>

                    <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 'bold' }}>
                        -{downvotes}
                    </span>

                    <span
                        style={{
                            color: pctColor,
                            fontWeight: 'bold',
                            fontSize: '12px',
                            minWidth: '36px',
                            textAlign: 'right'
                        }}
                    >
                        {displayPct}%
                    </span>
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

    // 1. Filter matching search query and category
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

        return fullName.includes(query) || username.includes(query) || role.includes(query) || status.includes(query);
    });

    // 2. Sort users by reputation upvote percentage descending (highest percentage top)
    const sortedUsers = [...filteredUsers].sort((a, b) => {
        const totalA = (a.upvotes || 0) + (a.downvotes || 0);
        const totalB = (b.upvotes || 0) + (b.downvotes || 0);
        const pctA = totalA > 0 ? (a.upvotes / totalA) * 100 : 50;
        const pctB = totalB > 0 ? (b.upvotes / totalB) * 100 : 50;
        return pctB - pctA;
    });

    return (
        <div className="users-outer-card">
            <div className="users-scroll-wrapper">
                <div className="users-grid" id="usersGrid">
                    {sortedUsers.length > 0 ? (
                        sortedUsers.map(user => (
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
    const { isDark } = useTheme();
    const [searchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const { currentUser } = useCurrentUser();
    const [users, setUsers] = useState([]);
    const [usersError, setUsersError] = useState(false);
    const [usersLoading, setUsersLoading] = useState(false);

    const fetchUsers = useCallback(async () => {
        setUsersLoading(true);
        try {
            const data = await request.get('/api/users');
            const userList = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : null);

            if (userList) {
                // Fetch reputation data in parallel for each user
                const usersWithRep = await Promise.all(
                    userList.map(async (u) => {
                        const uid = String(u.id || u._id || Math.random());
                        let upvotes = 0;
                        let downvotes = 0;

                        try {
                            const repRes = await request.get(`/api/users/${uid}/reputation`);
                            const rd = repRes?.data || repRes;
                            upvotes = Number(rd?.upvotes ?? rd?.likes ?? rd?.up ?? 0);
                            downvotes = Number(rd?.downvotes ?? rd?.dislikes ?? rd?.down ?? 0);
                        } catch (repErr) {
                            console.error(`Failed to fetch reputation for user ${uid}:`, repErr);
                        }

                        return {
                            id: uid,
                            fullname: u.full_name || u.fullName || u.fullname || u.name || u.username || 'User',
                            username: u.username || '',
                            role: u.role || 'MEMBER',
                            status: u.status || 'Active',
                            image: u.image || getUserAvatarUrl(u.username),
                            upvotes,
                            downvotes
                        };
                    })
                );

                setUsers(usersWithRep);
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
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        const query = searchParams.get('search');
        if (query !== null) {
            setSearchQuery(query);
        }
    }, [searchParams]);

    return (
        <div className={`users-page-wrapper${isDark ? ' dark-mode' : ''}`}>
            <div id="navbar-root">
                <NavBar userId={currentUser.id} fullName={currentUser.fullname} userName={currentUser.username} userImg={currentUser.image} theme={isDark ? 'dark' : 'light'} />
            </div>

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