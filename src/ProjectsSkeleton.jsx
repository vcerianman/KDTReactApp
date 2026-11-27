import React from 'react';
import './ProjectsSkeleton.css';

/**
 * Single skeleton card mimicking .project-card in Projects.jsx:
 *   [title + (id) / desc]   [status / dates]   [Tasks btn]
 */
function ProjectCardSkeleton() {
    return (
        <div className="project-card projects-skeleton-card" aria-hidden="true">
            <div className="project-info">
                <div className="projects-skeleton-title-row">
                    <span className="projects-skeleton-box projects-skeleton-title" />
                    <span className="projects-skeleton-box projects-skeleton-id" />
                </div>
                <span className="projects-skeleton-box projects-skeleton-desc" />
            </div>

            <div className="project-status-box projects-skeleton-status-col">
                <span className="projects-skeleton-box projects-skeleton-status" />
                <span className="projects-skeleton-box projects-skeleton-dates" />
            </div>

            <span className="projects-skeleton-box projects-skeleton-btn" />
        </div>
    );
}

/**
 * Renders `count` project card skeletons inside .projects-scroll-wrapper.
 */
function ProjectsSkeleton({ count = 5 }) {
    return (
        <React.Fragment>
            {Array.from({ length: count }, (_, idx) => (
                <ProjectCardSkeleton key={`project-skeleton-${idx}`} />
            ))}
        </React.Fragment>
    );
}

export default ProjectsSkeleton;
