import React from 'react';
import './UsersSkeleton.css';

/**
 * Single skeleton card that mimics the .user-card layout:
 *   [80×80 avatar] [name / handle / role / rep-bar]
 */
function UserCardSkeleton() {
    return (
        <div className="users-skeleton-card" aria-hidden="true">
            {/* Left: avatar block */}
            <div className="users-skeleton-box users-skeleton-avatar" />

            {/* Right: detail lines */}
            <div className="users-skeleton-details">
                <span className="users-skeleton-box users-skeleton-name" />
                <span className="users-skeleton-box users-skeleton-handle" />
                <span className="users-skeleton-box users-skeleton-role" />

                {/* Reputation bar row: +upvotes | bar | -downvotes | pct% */}
                <div className="users-skeleton-rep">
                    <span className="users-skeleton-box users-skeleton-rep-pill" />
                    <span className="users-skeleton-box users-skeleton-rep-bar" />
                    <span className="users-skeleton-box users-skeleton-rep-pill" />
                    <span className="users-skeleton-box users-skeleton-rep-pct" />
                </div>
            </div>
        </div>
    );
}

/**
 * Full skeleton grid — renders `count` skeleton cards in the
 * same 2-column .users-grid used by the real UsersList.
 */
function UsersSkeleton({ count = 8 }) {
    return (
        <div className="users-grid" aria-hidden="true">
            {Array.from({ length: count }, (_, idx) => (
                <UserCardSkeleton key={`user-skeleton-${idx}`} />
            ))}
        </div>
    );
}

export default UsersSkeleton;
