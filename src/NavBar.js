import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

function NavBar({ userId = "?", fullName = "?", userName = "?", userImg = "/ProfilePic/0.jpg" }) {
    // 1. SCRIPTS
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const settingsRef = useRef(null);
    const searchRef = useRef(null);

    const profilePath = userId ? `/profile/${userId}` : '/profile';

    const handleToggleSettings = (e) => {
        e.stopPropagation();
        setIsSettingsOpen((prev) => !prev);
    };

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchQuery(val);
        if (val.trim().length > 0) {
            setIsSearchOpen(true);
        } else {
            setIsSearchOpen(false);
        }
    };

    const handleSearchFocus = () => {
        if (searchQuery.trim().length > 0) {
            setIsSearchOpen(true);
        }
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (settingsRef.current && !settingsRef.current.contains(e.target)) {
                setIsSettingsOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setIsSearchOpen(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    // 2. CSS
    const styles = {
        topNavbar: {
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            backgroundColor: '#e3e5e6',
            borderBottom: '1px solid #d6d6d6',
            padding: '8px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            marginBottom: '20px',
            fontFamily: "'GothamSSm', Helvetica Neue, Calibri, sans-serif",
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
            boxSizing: 'border-box',
        },
        navLeft: {
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            flex: 1,
        },
        navBrand: {
            fontWeight: 700,
            fontSize: '30px',
            color: '#000000',
            letterSpacing: '0.5px',
            textDecoration: 'none',
        },
        navLinks: {
            display: 'flex',
            alignItems: 'center',
            gap: '28px',
        },
        navLink: {
            fontSize: '20px',
            color: '#393b3d',
            textDecoration: 'none',
            fontWeight: 400,
            marginRight: '25px',
            marginLeft: '25px',
            transition: 'color 0.15s ease',
        },
        navCenter: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
        },
        searchContainer: {
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            maxWidth: '320px',
        },
        searchIcon: {
            position: 'absolute',
            left: '10px',
            pointerEvents: 'none',
        },
        topSearchInput: {
            width: '100%',
            padding: '5px 12px 5px 30px',
            backgroundColor: '#ffffff',
            border: '1px solid #c5c7ca',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: 500,
            fontFamily: "'GothamSSm', Helvetica Neue, Calibri, sans-serif",
            color: '#333333',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s, box-shadow 0.15s',
        },
        searchDropdownCard: {
            display: 'block',
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            border: '1px solid #d6d6d6',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
            zIndex: 1005,
            overflow: 'hidden',
            padding: '4px 0',
        },
        searchDropdownOption: {
            display: 'flex',
            alignItems: 'center',
            padding: '9px 14px',
            fontSize: '20px',
            color: '#393b3d',
            textDecoration: 'none',
            fontFamily: "'GothamSSm', Helvetica Neue, Calibri, sans-serif",
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            cursor: 'pointer',
            borderBottom: '1px solid #f2f3f5',
            transition: 'background-color 0.15s ease, color 0.15s ease',
        },
        searchOptionIcon: {
            marginRight: '10px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            color: '#888888',
            transition: 'color 0.15s ease',
        },
        searchUserInputText: {
            color: '#00a2ff',
            fontWeight: 600,
            maxWidth: '140px',
            display: 'inline-block',
            verticalAlign: 'bottom',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
        },
        navRight: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '14px',
            flex: 1,
        },
        userBadge: {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: '#393b3d',
        },
        userBadgeLink: {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            textDecoration: 'none',
            color: 'inherit',
        },
        navAvatarImg: {
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '1px solid #d0d2d4',
        },
        loggedInFullname: {
            fontWeight: 600,
            color: '#111111',
            textDecoration: 'none',
            transition: 'color 0.15s ease',
        },
        loggedInUsername: {
            color: '#666666',
        },
        navIconBtn: {
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '3px',
            transition: 'background 0.15s ease',
        },
        settingsDropdownWrapper: {
            position: 'relative',
            display: 'inline-block',
        },
        settingsMenu: {
            display: 'block',
            position: 'absolute',
            right: 0,
            top: '42px',
            backgroundColor: '#ffffff',
            border: '1px solid #d6d6d6',
            borderRadius: '6px',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
            width: '170px',
            zIndex: 1002,
            overflow: 'hidden',
        },
        settingsMenuItem: {
            display: 'block',
            padding: '10px 16px',
            fontSize: '16px',
            color: '#393b3d',
            textDecoration: 'none',
            fontFamily: "'GothamSSm', Helvetica Neue, Calibri, sans-serif",
            borderBottom: '1px solid #e8eaea',
            transition: 'background-color 0.15s ease, color 0.15s ease',
        },
        logoutItem: {
            display: 'block',
            padding: '10px 16px',
            fontSize: '16px',
            color: '#393b3d',
            textDecoration: 'none',
            fontFamily: "'GothamSSm', Helvetica Neue, Calibri, sans-serif",
            borderBottom: 'none',
            transition: 'background-color 0.15s ease, color 0.15s ease',
        },
    };

    // 3. HTML
    const trimmedSearch = searchQuery.trim();

    return (
        <nav className="top-navbar" style={styles.topNavbar}>
            {/* Left section: Brand & Navigation links */}
            <div className="nav-left" style={styles.navLeft}>
                <Link to="/home" className="nav-brand" style={styles.navBrand}>TASKFLOW</Link>
                <div className="nav-links" style={styles.navLinks}>
                    <Link to="/projects" className="nav-link" style={styles.navLink}>My Projects</Link>
                    <Link to="/tasks" className="nav-link" style={styles.navLink}>My Tasks</Link>
                    <Link to="/users" className="nav-link" style={styles.navLink}>Users</Link>
                </div>
            </div>

            {/* Center section: Search input & live suggestions */}
            <div className="nav-center" style={styles.navCenter}>
                <div className="search-container" style={styles.searchContainer} ref={searchRef}>
                    <svg className="search-icon" style={styles.searchIcon} viewBox="0 0 24 24" width="24" height="24" fill="#999">
                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                    </svg>
                    <input
                        type="text"
                        className="top-search-input"
                        id="topSearchInput"
                        style={styles.topSearchInput}
                        placeholder=" Search"
                        autoComplete="off"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onFocus={handleSearchFocus}
                    />
                    {isSearchOpen && trimmedSearch.length > 0 && (
                        <div className="search-dropdown-card show" id="searchDropdownCard" style={styles.searchDropdownCard}>
                            <Link
                                to={`/projects?search=${encodeURIComponent(trimmedSearch)}`}
                                className="search-dropdown-option"
                                id="searchOptionProjects"
                                style={styles.searchDropdownOption}
                                onClick={() => setIsSearchOpen(false)}
                            >
                                <span>Search "<span className="search-user-input-text" style={styles.searchUserInputText}>{trimmedSearch}</span>" in Projects</span>
                            </Link>
                            <Link
                                to={`/tasks?search=${encodeURIComponent(trimmedSearch)}`}
                                className="search-dropdown-option"
                                id="searchOptionTasks"
                                style={styles.searchDropdownOption}
                                onClick={() => setIsSearchOpen(false)}
                            >
                                <span>Search "<span className="search-user-input-text" style={styles.searchUserInputText}>{trimmedSearch}</span>" in Tasks</span>
                            </Link>
                            <Link
                                to={`/users?search=${encodeURIComponent(trimmedSearch)}`}
                                className="search-dropdown-option"
                                id="searchOptionUsers"
                                style={styles.searchDropdownOption}
                                onClick={() => setIsSearchOpen(false)}
                            >
                                <span>Search "<span className="search-user-input-text" style={styles.searchUserInputText}>{trimmedSearch}</span>" in Users</span>
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Right section: Profile badge, Notifications, Settings */}
            <div className="nav-right" style={styles.navRight}>
                <div className="user-badge" style={styles.userBadge}>
                    <Link to={profilePath} style={styles.userBadgeLink} title="Go to my profile">
                        <img
                            src={userImg || (userName && userName !== '?' ? `/ProfilePic/${userName}.jpg` : '/ProfilePic/0.jpg')}
                            alt={fullName || userName || "?"}
                            className="nav-avatar-img"
                            style={styles.navAvatarImg}
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/ProfilePic/0.jpg';
                            }}
                        />
                        <span className="logged-in-fullname" style={styles.loggedInFullname}>{fullName || "?"}</span>
                    </Link>
                    <span className="logged-in-username" style={styles.loggedInUsername}>@{userName || "?"}</span>
                </div>

                <button className="nav-icon-btn" style={styles.navIconBtn} title="Notifications" aria-label="Notifications">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="#000000">
                        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                    </svg>
                </button>

                <div className="settings-dropdown-wrapper" style={styles.settingsDropdownWrapper} ref={settingsRef}>
                    <button
                        className="nav-icon-btn"
                        id="topSettingsBtn"
                        style={styles.navIconBtn}
                        title="Settings"
                        aria-label="Settings"
                        onClick={handleToggleSettings}
                    >
                        <svg viewBox="0 0 24 24" width="32" height="32" fill="#393b3d">
                            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                        </svg>
                    </button>
                    {isSettingsOpen && (
                        <div className="settings-menu show" id="topSettingsMenu" style={styles.settingsMenu}>
                            <Link to="/settings" className="settings-menu-item" style={styles.settingsMenuItem} onClick={() => setIsSettingsOpen(false)}>Settings</Link>
                            <Link to="/help" className="settings-menu-item" style={styles.settingsMenuItem} onClick={() => setIsSettingsOpen(false)}>Help</Link>
                            <Link to="/terms" className="settings-menu-item" style={styles.settingsMenuItem} onClick={() => setIsSettingsOpen(false)}>Terms of service</Link>
                            <Link
                                to="/login"
                                className="settings-menu-item logout-item"
                                style={styles.logoutItem}
                                onClick={() => {
                                    setIsSettingsOpen(false);
                                    localStorage.removeItem('token');
                                }}
                            >
                                Logout
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}

// Global and module exports
if (typeof window !== 'undefined') {
    window.NavBar = NavBar;
    window.Navbar = NavBar;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavBar;
}

export default NavBar;