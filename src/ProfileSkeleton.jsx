import React from 'react';
import './ProfileSkeleton.css';

/**
 * Full-page skeleton placeholder for Profile.jsx while the profile data loads.
 * Mirrors ProfileHeader, ProfileTabs, and AboutTab layout.
 */
function ProfileSkeleton() {
    return (
        <div className="page-container" aria-hidden="true">
            {/* Profile Header Card Skeleton */}
            <div className="profile-header-card profile-skeleton-header-card">
                <div className="avatar-box">
                    <span className="profile-skeleton-box profile-skeleton-avatar" />
                </div>

                <div className="profile-info">
                    <span className="profile-skeleton-box profile-skeleton-fullname" />
                    <span className="profile-skeleton-box profile-skeleton-username" />
                    <span className="profile-skeleton-box profile-skeleton-role" />

                    <div className="profile-bottom-row">
                        <span className="profile-skeleton-box profile-skeleton-status" />

                        <div className="vote-section">
                            <div className="vote-buttons">
                                <span className="profile-skeleton-box profile-skeleton-vote-btn" />
                                <span className="profile-skeleton-box profile-skeleton-vote-btn" />
                            </div>
                            <div className="vote-bar-row">
                                <span className="profile-skeleton-box profile-skeleton-vote-count" />
                                <span className="profile-skeleton-box profile-skeleton-vote-bar" />
                                <span className="profile-skeleton-box profile-skeleton-vote-count" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Bar Skeleton */}
            <div className="tab-bar profile-skeleton-tab-bar">
                <div className="tab-item profile-skeleton-tab-item">
                    <span className="profile-skeleton-box profile-skeleton-tab-label" />
                </div>
                <div className="tab-item profile-skeleton-tab-item">
                    <span className="profile-skeleton-box profile-skeleton-tab-label" />
                </div>
            </div>

            {/* About Tab Content Skeleton */}
            <div className="profile-tab-panel">
                <div className="content-card profile-skeleton-content-card">
                    <span className="profile-skeleton-box profile-skeleton-card-title" />
                    <span className="profile-skeleton-box profile-skeleton-line w-65" />
                    <span className="profile-skeleton-box profile-skeleton-line w-50" />
                    <span className="profile-skeleton-box profile-skeleton-line w-58" />
                </div>

                <div className="content-card profile-skeleton-content-card">
                    <div className="contact-header-row">
                        <span
                            className="profile-skeleton-box profile-skeleton-card-title"
                            style={{ marginBottom: 0 }}
                        />
                        <span className="profile-skeleton-box profile-skeleton-contact-btn" />
                    </div>
                    <span className="profile-skeleton-box profile-skeleton-contact-text" />
                </div>
            </div>
        </div>
    );
}

export default ProfileSkeleton;
