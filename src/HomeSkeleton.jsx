import React from 'react';
import './HomeSkeleton.css';

export function HomeUsersSkeleton({ count = 10 }) {
    return (
        <div className="users-horizontal-row" aria-hidden="true">
            {Array.from({ length: count }, (_, idx) => (
                <div key={`home-user-skeleton-${idx}`} className="user-item-col home-skeleton-user-col">
                    <div className="user-avatar-circle home-skeleton-box home-skeleton-avatar" />
                    <span className="home-skeleton-box home-skeleton-user-name" />
                </div>
            ))}
        </div>
    );
}

export function HomeTasksSkeleton({ count = 6 }) {
    return (
        <div className="tasks-home-grid" aria-hidden="true">
            {Array.from({ length: count }, (_, idx) => (
                <div key={`home-task-skeleton-${idx}`} className="task-home-card home-skeleton-card">
                    <div>
                        <div className="task-card-header">
                            <div className="home-skeleton-task-title-group">
                                <span className="home-skeleton-box home-skeleton-task-title" />
                                <span className="home-skeleton-box home-skeleton-priority-tag" />
                            </div>
                            <span className="home-skeleton-box home-skeleton-assigner" />
                        </div>
                        <span className="home-skeleton-box home-skeleton-desc-line" />
                        <span className="home-skeleton-box home-skeleton-desc-line short" />
                    </div>
                    <div className="task-home-footer">
                        <span className="home-skeleton-box home-skeleton-footer-status" />
                        <span className="home-skeleton-box home-skeleton-footer-dates" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function HomeProjectsSkeleton({ count = 6 }) {
    return (
        <div className="projects-home-grid" aria-hidden="true">
            {Array.from({ length: count }, (_, idx) => (
                <div key={`home-project-skeleton-${idx}`} className="project-home-card home-skeleton-card">
                    <div>
                        <div className="project-home-title">
                            <span className="home-skeleton-box home-skeleton-project-title" />
                            <span className="home-skeleton-box home-skeleton-project-id" />
                        </div>
                        <span className="home-skeleton-box home-skeleton-desc-line" />
                        <span className="home-skeleton-box home-skeleton-desc-line short" />
                    </div>
                    <div className="project-home-footer">
                        <span className="home-skeleton-box home-skeleton-footer-status" />
                        <span className="home-skeleton-box home-skeleton-footer-dates" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function HomeSkeleton() {
    return (
        <React.Fragment>
            <HomeUsersSkeleton count={10} />
            <HomeTasksSkeleton count={6} />
            <HomeProjectsSkeleton count={6} />
        </React.Fragment>
    );
}

export default HomeSkeleton;
