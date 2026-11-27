import React from 'react';
import './AdminProjectCardSkeleton.css';

function AdminProjectCardSkeleton() {
    return (
        <div className="project-card-item admin-project-skeleton-card" aria-hidden="true">
            {/* Left side: Title, ID, Description */}
            <div className="project-card-left">
                <div className="project-title-row">
                    <span className="admin-skeleton-box admin-skeleton-title" />
                    <span className="admin-skeleton-box admin-skeleton-id" />
                </div>
                <span className="admin-skeleton-box admin-skeleton-desc" />
            </div>

            {/* Middle Column: Involved Users */}
            <div className="project-card-middle">
                <div className="project-users-header-row">
                    <span className="admin-skeleton-box admin-skeleton-users-text" />
                    <span className="admin-skeleton-box admin-skeleton-info-dot" />
                </div>
                <div className="project-users-avatars-row">
                    <span className="admin-skeleton-box admin-skeleton-avatar" />
                    <span className="admin-skeleton-box admin-skeleton-avatar" />
                    <span className="admin-skeleton-box admin-skeleton-avatar" />
                    <span className="admin-skeleton-box admin-skeleton-avatar" />
                </div>
            </div>

            {/* Right side: Status, Owner, Dates & Menu */}
            <div className="project-card-right">
                <div className="project-meta-info admin-skeleton-meta-col">
                    <span className="admin-skeleton-box admin-skeleton-status" />
                    <span className="admin-skeleton-box admin-skeleton-owner" />
                    <span className="admin-skeleton-box admin-skeleton-dates" />
                </div>
                <span className="admin-skeleton-box admin-skeleton-menu-btn" />
            </div>
        </div>
    );
}

export default AdminProjectCardSkeleton;
