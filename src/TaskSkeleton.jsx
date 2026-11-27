import React from 'react';
import './TaskSkeleton.css';

const SKELETON_COLUMNS = [
    { key: 'TODO', title: 'TODO', borderClass: 'col-todo' },
    { key: 'IN_PROGRESS', title: 'IN PROGRESS', borderClass: 'col-in-progress' },
    { key: 'COMPLETED', title: 'COMPLETED', borderClass: 'col-completed' },
    { key: 'CANCELLED', title: 'CANCELLED', borderClass: 'col-cancelled' }
];

function TaskCardSkeleton() {
    return (
        <div className="task-card task-skeleton-card" aria-hidden="true">
            <div className="task-main-content">
                <div className="task-title-row">
                    <span className="task-skeleton-box task-skeleton-title" />
                    <span className="task-skeleton-box task-skeleton-tag" />
                    <span className="task-skeleton-box task-skeleton-assigner" />
                </div>
                <span className="task-skeleton-box task-skeleton-desc" />
                <div className="task-dates-row">
                    <span className="task-skeleton-box task-skeleton-dates" />
                </div>
            </div>
        </div>
    );
}

function TaskSkeleton({ tasksPerColumn = 2 }) {
    return (
        <React.Fragment>
            <div className="kanban-board-scroll-container" aria-hidden="true">
                <div className="kanban-board-track">
                    {SKELETON_COLUMNS.map((col) => (
                        <div key={col.key} className={`status-column-card ${col.borderClass}`}>
                            <div className="column-header">
                                <h2 className="column-title task-skeleton-col-header">
                                    {col.title}
                                    <span className="task-skeleton-box task-skeleton-col-count" />
                                </h2>
                            </div>
                            <div className="column-tasks-scroll">
                                {Array.from({ length: tasksPerColumn }, (_, idx) => (
                                    <TaskCardSkeleton key={`${col.key}-skeleton-${idx}`} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="project-switch-container" aria-hidden="true">
                <div className="current-project-card task-skeleton-project-card">
                    <div className="project-card-left">
                        <div className="project-title-header">
                            <span className="task-skeleton-box task-skeleton-project-title" />
                            <span className="task-skeleton-box task-skeleton-project-id" />
                        </div>
                        <span className="task-skeleton-box task-skeleton-project-desc" />
                    </div>

                    <div className="project-card-middle">
                        <div className="project-users-header-row">
                            <span className="task-skeleton-box task-skeleton-users-text" />
                            <span className="task-skeleton-box task-skeleton-info-dot" />
                        </div>
                        <div className="project-users-avatars-row">
                            <span className="task-skeleton-box task-skeleton-avatar" />
                            <span className="task-skeleton-box task-skeleton-avatar" />
                            <span className="task-skeleton-box task-skeleton-avatar" />
                            <span className="task-skeleton-box task-skeleton-avatar" />
                        </div>
                    </div>

                    <div className="task-skeleton-project-right">
                        <span className="task-skeleton-box task-skeleton-project-status" />
                        <span className="task-skeleton-box task-skeleton-project-owner" />
                    </div>
                </div>

                <div className="project-nav-buttons">
                    <div className="btn-nav-project task-skeleton-nav-btn">
                        <span className="task-skeleton-box" style={{ width: '16px', height: '16px', borderRadius: '4px' }} />
                    </div>
                    <div className="btn-nav-project task-skeleton-nav-btn">
                        <span className="task-skeleton-box" style={{ width: '16px', height: '16px', borderRadius: '4px' }} />
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
}

export default TaskSkeleton;
