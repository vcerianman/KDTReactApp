import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
    useQuery,
    useMutation,
    useQueryClient
} from '@tanstack/react-query';
import './Task.css';
import NavBar from './NavBar';
import Notification from './Notification';
import request from './api/Request';
import {
    getTaskPriorityClass,
    getPriorityTagClass,
    getProjectStatusClass,
    getUserAvatarUrl,
    formatTaskDueDate
} from './utils';
import { useTheme } from './useTheme';
import useCurrentUser from './useCurrentUser';

// Section Reload Button Component matching the reload icon design
function ReloadButton({ onReload, isLoading }) {
    return (
        <button
            type="button"
            className={`section-reload-btn ${isLoading ? 'loading' : ''}`}
            onClick={onReload}
            title="Reload tasks"
            aria-label="Reload tasks"
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

// Priority Sorting Weights: URGENT (1) -> HIGH (2) -> MEDIUM (3) -> LOW (4)
const PRIORITY_ORDER = {
    'URGENT': 1,
    'HIGH': 2,
    'MEDIUM': 3,
    'LOW': 4
};

function getPriorityRank(priority) {
    const p = (priority || '').toUpperCase();
    return PRIORITY_ORDER[p] || 5;
}

// Header Section (Title & Search Bar)
function TasksHeader({ searchQuery, onSearchChange }) {
    return (
        <div className="tasks-header-row">
            <h1 className="page-title">My Great Tasks</h1>
            <div className="search-container tasks-search">
                <svg className="search-icon" viewBox="0 0 24 24" width="14" height="14">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
                <input
                    type="text"
                    className="top-search-input"
                    id="taskSearchInput"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
        </div>
    );
}

// Definition of the 4 Kanban columns
const COLUMNS_DEF = [
    {
        key: 'TODO',
        title: 'TODO',
        borderClass: 'col-todo',
        statusValue: 'TODO',
        matcher: (status) => {
            const s = (status || '').toUpperCase();
            return s === 'TODO' || s === 'TO_DO' || s === 'PLANNING' || s === 'BACKLOG';
        }
    },
    {
        key: 'IN_PROGRESS',
        title: 'IN PROGRESS',
        borderClass: 'col-in-progress',
        statusValue: 'IN_PROGRESS',
        matcher: (status) => {
            const s = (status || '').toUpperCase();
            return s === 'IN_PROGRESS' || s === 'IN PROGRESS' || s === 'DOING' || s === 'IN_REVIEW' || s === 'ON_HOLD';
        }
    },
    {
        key: 'COMPLETED',
        title: 'COMPLETED',
        borderClass: 'col-completed',
        statusValue: 'DONE',
        matcher: (status) => {
            const s = (status || '').toUpperCase();
            return s === 'COMPLETED' || s === 'DONE' || s === 'FINISHED';
        }
    },
    {
        key: 'CANCELLED',
        title: 'CANCELLED',
        borderClass: 'col-cancelled',
        statusValue: 'CANCELLED',
        matcher: (status) => {
            const s = (status || '').toUpperCase();
            return s === 'CANCELLED' || s === 'CANCELED' || s === 'ARCHIVED';
        }
    }
];

// Helper to reorder tasks in a project when dropped into a column at a specific index
function reorderTasks({ allTasks, draggedTaskId, targetColumnKey, targetIndex, newStatus, columnsDef = COLUMNS_DEF }) {
    const draggedTask = allTasks.find(t => String(t.id) === String(draggedTaskId));
    if (!draggedTask) return allTasks;

    const updatedDraggedTask = {
        ...draggedTask,
        status: newStatus
    };

    const targetColDef = columnsDef.find(c => c.key === targetColumnKey);
    if (!targetColDef) return allTasks;

    // Remaining tasks in allTasks excluding the dragged task
    const remainingTasks = allTasks.filter(t => String(t.id) !== String(draggedTaskId));

    // Tasks currently matching the target column in remainingTasks
    const targetColTasks = remainingTasks.filter(t => targetColDef.matcher(t.status));

    // Insert updatedDraggedTask at targetIndex among targetColTasks
    const newTargetColTasks = [...targetColTasks];
    const safeIndex = Math.max(0, Math.min(targetIndex, newTargetColTasks.length));
    newTargetColTasks.splice(safeIndex, 0, updatedDraggedTask);

    // Reconstruct allTasks: for the target column, insert newTargetColTasks in place
    const result = [];
    columnsDef.forEach(col => {
        if (col.key === targetColumnKey) {
            result.push(...newTargetColTasks);
        } else {
            result.push(...remainingTasks.filter(t => col.matcher(t.status)));
        }
    });

    // Append any tasks that did not match any of the standard 4 columns (edge cases)
    const processedIds = new Set(result.map(t => String(t.id)));
    remainingTasks.forEach(t => {
        if (!processedIds.has(String(t.id))) {
            result.push(t);
        }
    });

    return result;
}

// Single Task Card Component (Draggable)
function TaskCard({
    task,
    onTaskAction,
    onTaskClick,
    onDragStart,
    onDragEnd,
    onDragOverTask,
    isDragging
}) {
    const priorityClass = getTaskPriorityClass(task.priority);
    const tagClass = getPriorityTagClass(task.priority);
    const taskDescription = task.desc || task.description || '';
    const isDraggingRef = useRef(false);

    return (
        <div
            className={`task-card ${priorityClass}${isDragging ? ' is-dragging' : ''}`}
            data-task-id={task.id}
            draggable={true}
            onDragStart={(e) => {
                isDraggingRef.current = true;
                onDragStart && onDragStart(e, task);
            }}
            onDragEnd={(e) => {
                onDragEnd && onDragEnd(e, task);
                setTimeout(() => {
                    isDraggingRef.current = false;
                }, 80);
            }}
            onDragOver={(e) => {
                onDragOverTask && onDragOverTask(e);
            }}
            onClick={() => {
                if (isDraggingRef.current) return;
                onTaskClick && onTaskClick(task);
            }}
        >
            <div className="task-main-content">
                <div className="task-title-row">
                    <span className="task-title">{task.title}</span>
                    <span className={`task-priority-tag ${tagClass}`}>{task.priority}</span>
                    <span className="task-assigner-pill">
                        {task.assigner}
                    </span>
                </div>
                {taskDescription && (
                    <div className="task-desc-row" title={taskDescription}>
                        {taskDescription}
                    </div>
                )}
                <div className="task-dates-row">
                    <span>{task.dates}</span>
                </div>
            </div>

        </div>
    );
}

// Single Status Column Component with Drag-and-Drop and Insertion Placeholder
function StatusColumnCard({
    columnKey,
    title,
    borderClass,
    tasks,
    onTaskAction,
    onTaskClick,
    draggedTask,
    draggedCardHeight,
    dragOverInfo,
    onDragStartTask,
    onDragEndTask,
    onDragOverColumn,
    onDragOverTask,
    onDropColumn
}) {
    const isTargetColumn = dragOverInfo?.columnKey === columnKey;
    const dropIndex = isTargetColumn ? dragOverInfo.index : null;

    // Filter out the dragged card from visible list so it's replaced by the outline placeholder
    const visibleTasks = draggedTask ? tasks.filter(t => String(t.id) !== String(draggedTask.id)) : tasks;

    return (
        <div
            className={`status-column-card ${borderClass}${isTargetColumn ? ' is-drag-over' : ''}`}
            onDragOver={(e) => onDragOverColumn(e, columnKey, visibleTasks)}
            onDrop={(e) => onDropColumn(e, columnKey)}
        >
            <div className="column-header">
                <h2 className="column-title">
                    {title}
                    <span className="column-count-badge">{tasks.length}</span>
                </h2>
            </div>
            <div
                className="column-tasks-scroll"
                onDragOver={(e) => onDragOverColumn(e, columnKey, visibleTasks)}
                onDrop={(e) => onDropColumn(e, columnKey)}
            >
                {visibleTasks.length > 0 ? (
                    <React.Fragment>
                        {visibleTasks.map((task, idx) => (
                            <React.Fragment key={task.id}>
                                {isTargetColumn && dropIndex === idx && (
                                    <div
                                        className="task-drop-placeholder"
                                        style={{ height: draggedCardHeight ? `${draggedCardHeight}px` : undefined }}
                                    />
                                )}
                                <TaskCard
                                    task={task}
                                    onTaskAction={onTaskAction}
                                    onTaskClick={onTaskClick}
                                    onDragStart={(e) => onDragStartTask(e, task)}
                                    onDragEnd={onDragEndTask}
                                    onDragOverTask={(e) => onDragOverTask(e, columnKey, idx)}
                                    isDragging={draggedTask && String(draggedTask.id) === String(task.id)}
                                />
                            </React.Fragment>
                        ))}
                        {isTargetColumn && dropIndex !== null && dropIndex >= visibleTasks.length && (
                            <div
                                className="task-drop-placeholder"
                                style={{ height: draggedCardHeight ? `${draggedCardHeight}px` : undefined }}
                            />
                        )}
                    </React.Fragment>
                ) : (
                    <React.Fragment>
                        {isTargetColumn ? (
                            <div
                                className="task-drop-placeholder"
                                style={{ height: draggedCardHeight ? `${draggedCardHeight}px` : undefined }}
                            />
                        ) : (
                            <div className="column-empty-state">
                                <span>No tasks in {title.toLowerCase()}</span>
                            </div>
                        )}
                    </React.Fragment>
                )}
            </div>
        </div>
    );
}

// 4 Columns Kanban Board with Drag & Drop Insertion
function KanbanBoard({ currentProject, searchQuery, onTaskAction, onTaskClick, onTaskDrop }) {
    const query = searchQuery.toLowerCase().trim();

    // Drag and drop state
    const [draggedTask, setDraggedTask] = useState(null);
    const [draggedCardHeight, setDraggedCardHeight] = useState(80);
    const [dragOverInfo, setDragOverInfo] = useState(null); // { columnKey, index }

    // Filter tasks by live search query
    const projectTasks = currentProject ? currentProject.tasks || [] : [];
    const filteredTasks = projectTasks.filter(task => {
        if (!query) return true;
        const searchCorpus = `${task.title} ${task.priority} ${task.assigner} ${task.status} ${task.dates}`.toLowerCase();
        return searchCorpus.includes(query);
    });

    const handleDragStartTask = (e, task) => {
        const height = e.currentTarget.offsetHeight || 80;
        setDraggedCardHeight(height);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(task.id));

        // Use setTimeout so the browser captures the full drag ghost before state hides the original
        setTimeout(() => {
            setDraggedTask(task);
        }, 0);
    };

    const handleDragEndTask = () => {
        setDraggedTask(null);
        setDragOverInfo(null);
    };

    const handleDragOverTask = (e, colKey, idx) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const insertIndex = e.clientY < midY ? idx : idx + 1;
        setDragOverInfo(prev => {
            if (prev?.columnKey === colKey && prev?.index === insertIndex) return prev;
            return { columnKey: colKey, index: insertIndex };
        });
    };

    const handleDragOverColumn = (e, colKey, visibleTasks) => {
        e.preventDefault();
        if (visibleTasks.length === 0) {
            setDragOverInfo(prev => {
                if (prev?.columnKey === colKey && prev?.index === 0) return prev;
                return { columnKey: colKey, index: 0 };
            });
            return;
        }

        const container = e.currentTarget.classList.contains('column-tasks-scroll')
            ? e.currentTarget
            : e.currentTarget.querySelector('.column-tasks-scroll');

        if (container) {
            const cards = container.querySelectorAll('.task-card');
            if (cards.length > 0) {
                const firstCardRect = cards[0].getBoundingClientRect();
                if (e.clientY < firstCardRect.top) {
                    setDragOverInfo(prev => {
                        if (prev?.columnKey === colKey && prev?.index === 0) return prev;
                        return { columnKey: colKey, index: 0 };
                    });
                    return;
                }
                const lastCardRect = cards[cards.length - 1].getBoundingClientRect();
                if (e.clientY > lastCardRect.bottom) {
                    setDragOverInfo(prev => {
                        if (prev?.columnKey === colKey && prev?.index === visibleTasks.length) return prev;
                        return { columnKey: colKey, index: visibleTasks.length };
                    });
                    return;
                }
            }
        }
    };

    const handleDropColumn = (e, targetColumnKey) => {
        e.preventDefault();
        e.stopPropagation();
        if (!draggedTask) return;

        const targetIndex = dragOverInfo?.index ?? 0;
        if (onTaskDrop) {
            onTaskDrop({
                taskId: draggedTask.id,
                targetColumnKey,
                targetIndex
            });
        }

        setDraggedTask(null);
        setDragOverInfo(null);
    };

    return (
        <div
            className="kanban-board-scroll-container"
            id="kanbanBoardScrollWrapper"
            onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                    setDragOverInfo(null);
                }
            }}
        >
            <div className="kanban-board-track">
                {COLUMNS_DEF.map(col => {
                    const colTasks = filteredTasks.filter(task => col.matcher(task.status));

                    return (
                        <StatusColumnCard
                            key={col.key}
                            columnKey={col.key}
                            title={col.title}
                            borderClass={col.borderClass}
                            tasks={colTasks}
                            onTaskAction={onTaskAction}
                            onTaskClick={onTaskClick}
                            draggedTask={draggedTask}
                            draggedCardHeight={draggedCardHeight}
                            dragOverInfo={dragOverInfo}
                            onDragStartTask={handleDragStartTask}
                            onDragEndTask={handleDragEndTask}
                            onDragOverColumn={handleDragOverColumn}
                            onDragOverTask={handleDragOverTask}
                            onDropColumn={handleDropColumn}
                        />
                    );
                })}
            </div>
        </div>
    );
}

// Current Project Card & Switch Buttons
function CurrentProjectSection({ currentProject, onPrevProject, onNextProject, onOpenProjectUsers }) {
    if (!currentProject) return null;
    const statusClass = getProjectStatusClass(currentProject.status);

    const projectUsers = currentProject.users && currentProject.users.length > 0
        ? currentProject.users
        : [
            { id: '0', fullname: '(no one)', username: 'N/A', image: '/ProfilePic/01.jpg' }
        ];

    const displayedUsers = projectUsers.slice(0, 4);
    const extraCount = Math.max(0, projectUsers.length - 4);
    const userNamesString = projectUsers.map(u => u.fullname || u.name || u.username).join(', ');

    return (
        <div className="project-switch-container">
            {/* Current Project Card */}
            <div className={`current-project-card ${statusClass}`} data-project-id={currentProject.id}>
                {/* Left side: Project Title & Desc */}
                <div className="project-card-left">
                    <h2 className="project-title-header">
                        {currentProject.title} <span className="project-id-sub">(id:{currentProject.id})</span>
                    </h2>
                    <p className="project-card-desc">{currentProject.desc}</p>
                </div>

                {/* Middle Column: Involved Users */}
                <div className="project-card-middle">
                    <div className="project-users-header-row">
                        <span className="project-users-names-text" title={`Users: ${userNamesString}`}>
                            Users: {userNamesString}
                        </span>
                        <button
                            type="button"
                            className="btn-project-info-circle"
                            title="View all involved project users"
                            aria-label="View all involved project users"
                            onClick={() => onOpenProjectUsers(projectUsers, currentProject.title)}
                        >
                            <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                            </svg>
                        </button>
                    </div>
                    <div className="project-users-avatars-row">
                        {displayedUsers.map((u, idx) => (
                            <img
                                key={u.id || idx}
                                src={u.image || getUserAvatarUrl(u.username)}
                                alt={u.fullname || u.username}
                                className="project-user-avatar-thumb"
                                title={`${u.fullname || u.username} (@${u.username})`}
                                onError={(e) => { e.target.src = '/ProfilePic/0.jpg'; }}
                            />
                        ))}
                        {extraCount > 0 && (
                            <span className="project-users-extra-badge">+{extraCount}</span>
                        )}
                    </div>
                </div>

                {/* Right side: Status & Owner */}
                <div className="project-card-right">
                    <div className="project-status-label">Status: {currentProject.status}</div>
                    <div className="project-owner-label">
                        owner: @{currentProject.owner || 'KDT'}
                    </div>
                </div>
            </div>

            {/* Switch Projects Navigation Buttons */}
            <div className="project-nav-buttons">
                <button
                    className="btn-nav-project"
                    onClick={onPrevProject}
                    title="Previous Project"
                    aria-label="Previous Project"
                >
                    <svg viewBox="0 0 24 24" width="22" height="22">
                        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                    </svg>
                </button>
                <button
                    className="btn-nav-project"
                    onClick={onNextProject}
                    title="Next Project"
                    aria-label="Next Project"
                >
                    <svg viewBox="0 0 24 24" width="22" height="22">
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

// Helper to format dates into YYYY-MM-DD for <input type="date">
function toInputDateString(val) {
    if (!val) return '';
    const str = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    if (str.includes('T')) return str.split('T')[0];
    try {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        }
    } catch (e) {
        // fallback
    }
    return '';
}

// Assignee User Picker Modal
function AssigneeSelectModal({ isOpen, onClose, users, onSelectUser }) {
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

    const filteredUsers = (users || []).filter((u) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (u.fullname && u.fullname.toLowerCase().includes(q)) ||
            (u.username && u.username.toLowerCase().includes(q))
        );
    });

    return (
        <div className="members-modal-overlay assignee-modal-overlay" onClick={onClose}>
            <div className="members-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="members-modal-header">
                    <h3 className="members-modal-title">Select Assignee</h3>
                    <div className="members-header-right">
                        <div className="members-search-box">
                            <svg className="members-search-icon" viewBox="0 0 24 24">
                                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                            </svg>
                            <input
                                type="text"
                                className="members-search-input"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <button type="button" className="btn-modal-close" onClick={onClose} aria-label="Close">
                            &times;
                        </button>
                    </div>
                </div>

                <div className="members-list-scroll">
                    {filteredUsers.length > 0 ? (
                        filteredUsers.map((u) => (
                            <div
                                key={u.id}
                                className="member-item-row"
                                style={{ cursor: 'pointer' }}
                                onClick={() => onSelectUser(u)}
                            >
                                <img
                                    src={u.image || getUserAvatarUrl(u.username)}
                                    alt={u.fullname || u.username}
                                    className="member-avatar-img"
                                    onError={(e) => {
                                        e.target.src = '/ProfilePic/0.jpg';
                                    }}
                                />
                                <div className="member-info-text">
                                    <span className="member-fullname">{u.fullname}</span>
                                    <span className="member-username">@{u.username}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="members-empty-text">No users found...</div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Task Detail Prompt Modal Component (with Edit Mode & Save Tick Button)
function TaskDetailModal({ task, onClose, onTaskUpdated, users = [], currentUser, onShowToast }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUserPickerOpen, setIsUserPickerOpen] = useState(false);

    // Form state
    const [editTitle, setEditTitle] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editAssignee, setEditAssignee] = useState('');
    const [editAssigner, setEditAssigner] = useState('');
    const [editPriority, setEditPriority] = useState('MEDIUM');
    const [editDueDate, setEditDueDate] = useState('');

    useEffect(() => {
        if (task) {
            setIsEditing(false);
            setEditTitle(task.title || '');
            setEditDesc(task.desc || task.description || '');
            setEditAssignee(task.assignedTo || task.assignee || '');
            setEditAssigner(task.assigner || currentUser?.username || 'KDT');
            setEditPriority((task.priority || 'MEDIUM').toUpperCase());
            setEditDueDate(toInputDateString(task.dueDate || task.dates));
        }
    }, [task, currentUser]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (isUserPickerOpen) {
                    setIsUserPickerOpen(false);
                } else if (isEditing) {
                    setIsEditing(false);
                } else {
                    onClose();
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose, isEditing, isUserPickerOpen]);

    if (!task) return null;

    const tagClass = getPriorityTagClass(task.priority);
    const assignedUser = task.assignedTo || task.assignee || task.assigner || 'Unassigned';
    const dueDateDisplay = formatTaskDueDate(task.dueDate || task.dates);
    const description = task.desc || task.description || 'Task Description...';

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        if (!editTitle.trim()) {
            if (onShowToast) onShowToast('Task title cannot be empty!', 'error');
            return;
        }

        setIsSaving(true);
        const payload = {
            title: editTitle.trim(),
            description: editDesc.trim(),
            desc: editDesc.trim(),
            priority: editPriority,
            assignee: editAssignee.trim(),
            assignedTo: editAssignee.trim(),
            assigner: editAssigner.trim(),
            dueDate: editDueDate
        };

        try {
            let updatedRes = null;
            try {
                updatedRes = await request.put(`/api/tasks/${task.id}`, payload);
            } catch (pErr) {
                try {
                    updatedRes = await request.patch(`/api/tasks/${task.id}`, payload);
                } catch (patchErr) {
                    throw pErr || patchErr;
                }
            }

            const updatedTask = {
                ...task,
                title: payload.title,
                desc: payload.description,
                description: payload.description,
                priority: payload.priority,
                assignee: payload.assignee,
                assignedTo: payload.assignee,
                assigner: payload.assigner,
                dueDate: payload.dueDate || task.dueDate,
                dates: payload.dueDate || task.dates,
                raw: {
                    ...(task.raw || {}),
                    ...(updatedRes?.data || updatedRes || {}),
                    ...payload
                }
            };

            if (onTaskUpdated) {
                onTaskUpdated(updatedTask);
            }

            if (onShowToast) {
                onShowToast('Task updated successfully!', 'success');
            }

            setIsEditing(false);
        } catch (err) {
            console.error(`Failed to update task ${task.id}:`, err);
            const errMsg = err?.response?.data?.message || err?.message || 'Failed to update task. Please try again.';
            if (onShowToast) {
                onShowToast(errMsg, 'error');
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <React.Fragment>
            <div
                className="members-modal-overlay task-modal-overlay"
                id="taskModalOverlay"
                onClick={(e) => {
                    if (e.target.id === 'taskModalOverlay') {
                        onClose();
                    }
                }}
            >
                <div className="members-modal-card task-detail-modal-card">
                    {/* Header */}
                    <div className="task-modal-header">
                        {!isEditing ? (
                            <React.Fragment>
                                <div className="task-modal-title-group">
                                    <h2 className="task-modal-title">{task.title || 'Task Name'}</h2>
                                    <span className={`task-priority-tag ${tagClass}`}>{task.priority || 'MEDIUM'}</span>
                                    <span className="task-assigner-pill">{task.assigner || 'KDT'}</span>
                                </div>
                                <div className="task-modal-header-actions">
                                    <button
                                        type="button"
                                        className="task-modal-edit-btn"
                                        title="Edit Task"
                                        aria-label="Edit Task"
                                        onClick={() => setIsEditing(true)}
                                    >
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        className="task-modal-close-btn"
                                        aria-label="Close"
                                        onClick={onClose}
                                    >
                                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>
                            </React.Fragment>
                        ) : (
                            <React.Fragment>
                                <input
                                    type="text"
                                    className="task-modal-title-input"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    placeholder="Task title..."
                                    required
                                    autoFocus
                                />
                                <div className="task-modal-header-actions">
                                    <button
                                        type="button"
                                        className="task-modal-save-btn"
                                        title="Save Task"
                                        aria-label="Save Task"
                                        disabled={isSaving}
                                        onClick={handleSave}
                                    >
                                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        className="task-modal-close-btn"
                                        aria-label="Close"
                                        onClick={() => setIsEditing(false)}
                                    >
                                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>
                            </React.Fragment>
                        )}
                    </div>

                    {!isEditing && <hr className="task-modal-divider" />}

                    {/* Content: Normal View vs Edit View */}
                    {!isEditing ? (
                        <React.Fragment>
                            <div className="task-modal-body">
                                <p className="task-modal-desc">{description}</p>
                            </div>
                            <div className="task-modal-footer">
                                <span className="task-modal-assigned">Assigned to: {assignedUser}</span>
                                <span className="task-modal-due">Due: {dueDateDisplay}</span>
                            </div>
                        </React.Fragment>
                    ) : (
                        <div className="task-modal-edit-body">
                            {/* Task Description */}
                            <div className="task-modal-form-group">
                                <label className="task-modal-form-label">Description:</label>
                                <textarea
                                    className="task-modal-textarea"
                                    rows={4}
                                    value={editDesc}
                                    onChange={(e) => setEditDesc(e.target.value)}
                                    placeholder="Brief description of the task..."
                                />
                            </div>

                            {/* Assignee & Assigner Row (from CreateTasks.jsx) */}
                            <div className="task-modal-form-row">
                                <div className="task-modal-form-col">
                                    <label className="task-modal-form-label">Assignee:</label>
                                    <div className="task-modal-input-with-button">
                                        <input
                                            type="text"
                                            className="task-modal-input"
                                            placeholder="Assignee username (e.g. KDT)..."
                                            value={editAssignee}
                                            onChange={(e) => setEditAssignee(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            className="task-modal-search-btn"
                                            onClick={() => setIsUserPickerOpen(true)}
                                            title="Search and select user"
                                            aria-label="Search and select user"
                                        >
                                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 11.99 14 9.5 14z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="task-modal-form-col">
                                    <label className="task-modal-form-label">Assigner:</label>
                                    <input
                                        type="text"
                                        className="task-modal-input task-modal-input-readonly"
                                        value={editAssigner}
                                        readOnly
                                        tabIndex={-1}
                                        title="Assigner cannot be changed"
                                    />
                                </div>
                            </div>

                            {/* Priority & Due Date Row (from CreateTasks.jsx) */}
                            <div className="task-modal-form-row">
                                <div className="task-modal-form-col">
                                    <label className="task-modal-form-label">Priority:</label>
                                    <select
                                        className="task-modal-select"
                                        value={editPriority}
                                        onChange={(e) => setEditPriority(e.target.value)}
                                    >
                                        <option value="URGENT">URGENT</option>
                                        <option value="HIGH">HIGH</option>
                                        <option value="MEDIUM">MEDIUM</option>
                                        <option value="LOW">LOW</option>
                                    </select>
                                </div>

                                <div className="task-modal-form-col">
                                    <label className="task-modal-form-label">Due Date:</label>
                                    <input
                                        type="date"
                                        className="task-modal-input"
                                        value={editDueDate}
                                        onChange={(e) => setEditDueDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Assignee Picker Modal */}
            {isUserPickerOpen && (
                <AssigneeSelectModal
                    isOpen={isUserPickerOpen}
                    onClose={() => setIsUserPickerOpen(false)}
                    users={users}
                    onSelectUser={(u) => {
                        setEditAssignee(u.username || u.fullname || '');
                        setIsUserPickerOpen(false);
                    }}
                />
            )}
        </React.Fragment>
    );
}

// Global & Project Users Prompt Modal Component
function GlobalUsersModal({
    isOpen,
    onClose,
    users,
    loading,
    title = "Edit Members",
    projectUserIds = [],
    isEditMode = false,
    onToggleMember,
    actionLoadingId = null,
    projectOwner = ''
}) {
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

    const ownerName = typeof projectOwner === 'object' && projectOwner !== null
        ? (projectOwner.username || projectOwner.id || projectOwner.name || projectOwner.fullname || '')
        : String(projectOwner || '');

    const isOwner = (u) => {
        if (!ownerName) return false;
        const o = ownerName.toLowerCase().trim();
        return (
            (u.username && u.username.toLowerCase().trim() === o) ||
            (u.fullname && u.fullname.toLowerCase().trim() === o) ||
            (u.name && u.name.toLowerCase().trim() === o) ||
            (u.id && String(u.id).toLowerCase().trim() === o)
        );
    };

    const filteredUsers = [...(users || [])]
        .filter(u => {
            // Exclude project owner from the list in edit mode
            if (isEditMode && isOwner(u)) {
                return false;
            }
            const query = searchQuery.toLowerCase().trim();
            if (!query) return true;
            const full = `${u.fullname || ''} ${u.username || ''}`.toLowerCase();
            return full.includes(query);
        })
        .sort((a, b) => {
            if (!isEditMode) return 0;
            const aIn = projectUserIds.includes(String(a.id));
            const bIn = projectUserIds.includes(String(b.id));
            if (aIn && !bIn) return -1;
            if (!aIn && bIn) return 1;
            return 0;
        });

    return (
        <div
            className="members-modal-overlay"
            id="membersModalOverlay"
            onClick={(e) => {
                if (e.target.id === 'membersModalOverlay') {
                    onClose();
                }
            }}
        >
            <div className="members-modal-card">
                <div className="members-modal-header">
                    <h3 className="members-modal-title">{title}</h3>
                    <div className="members-header-right">
                        <div className="members-search-box">
                            <svg className="members-search-icon" viewBox="0 0 24 24">
                                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                            </svg>
                            <input
                                type="text"
                                className="members-search-input"
                                placeholder="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <button
                            type="button"
                            className="members-modal-close-btn"
                            aria-label="Close"
                            onClick={onClose}
                        >
                            &times;
                        </button>
                    </div>
                </div>

                <div className="members-list-scroll">
                    {loading ? (
                        <div className="members-empty-text">Loading users...</div>
                    ) : filteredUsers.length > 0 ? (
                        filteredUsers.map(u => {
                            const isInProject = projectUserIds.includes(String(u.id));
                            const isActionLoading = actionLoadingId === String(u.id);

                            return (
                                <div key={u.id} className="member-item-row">
                                    <img
                                        src={u.image || getUserAvatarUrl(u.username)}
                                        alt={u.fullname}
                                        className="member-avatar-img"
                                        onError={(e) => {
                                            e.target.src = '/ProfilePic/0.jpg';
                                        }}
                                    />
                                    <div className="member-info-text">
                                        <span className="member-fullname">{u.fullname}</span>
                                        <span className="member-username">@{u.username}</span>
                                    </div>
                                    {isEditMode && (
                                        <div className="member-actions-wrapper">
                                            {isInProject ? (
                                                <button
                                                    type="button"
                                                    className="btn-member-action remove-btn"
                                                    title={`Remove ${u.fullname || u.username} from project`}
                                                    aria-label={`Remove ${u.fullname || u.username} from project`}
                                                    disabled={isActionLoading}
                                                    onClick={() => onToggleMember(u, true)}
                                                >
                                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                                        <path d="M19 13H5v-2h14v2z" />
                                                    </svg>
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="btn-member-action add-btn"
                                                    title={`Add ${u.fullname || u.username} to project`}
                                                    aria-label={`Add ${u.fullname || u.username} to project`}
                                                    disabled={isActionLoading}
                                                    onClick={() => onToggleMember(u, false)}
                                                >
                                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="members-empty-text">No users found...</div>
                    )}
                </div>
            </div>
        </div>
    );
}

// New Task Footer Action
function NewTaskFooter({ onOpenMembers, currentProjectId }) {
    return (
        <div className="new-task-footer-row">
            <span className="new-task-label">Assign new task?</span>
            <div className="new-task-buttons-group">
                <button
                    type="button"
                    className="btn-add-members"
                    onClick={onOpenMembers}
                >
                    Edit members
                </button>
                <Link
                    to={currentProjectId ? `/create-tasks?projectId=${encodeURIComponent(currentProjectId)}` : "/create-tasks"}
                    className="btn-assign-task"
                >
                    Assign new task
                </Link>
            </div>
        </div>
    );
}

// Data fetch function for TanStack Query
async function fetchTasksPageData(currentUser) {
    const userId = currentUser?.id;
    const uname = currentUser?.username;

    if (!userId || userId === "?") {
        return {
            currentUser: currentUser || { id: "?", fullname: "?", username: "?", image: "/ProfilePic/0.jpg" },
            projects: []
        };
    }

    // 2. Fetch user's project IDs via GET /api/users/{ID}
    const userRes = await request.get(`/api/users/${userId}`);
    const userData = userRes?.data || userRes;
    let projectIds = userData && Array.isArray(userData.projects) ? [...userData.projects] : [];

    // Include target projectId if specified in query params so it can be viewed directly
    const urlParams = new URLSearchParams(window.location.search);
    const targetProjectId = urlParams.get('projectId') || urlParams.get('project');
    if (targetProjectId) {
        const hasProject = projectIds.some(item => {
            const pId = typeof item === 'object' && item !== null ? (item.id || item.projectId) : item;
            return String(pId).toLowerCase() === targetProjectId.toLowerCase();
        });
        if (!hasProject) {
            projectIds.push(targetProjectId);
        }
    }

    if (projectIds.length === 0) {
        return { currentUser, projects: [] };
    }

    // 3. For each project ID, fetch project info & tasks in parallel
    const projectPromises = projectIds.map(async (item) => {
        const projId = typeof item === 'object' && item !== null ? (item.id || item.projectId) : item;
        if (!projId) return null;

        try {
            // Fetch project metadata
            let projData = null;
            try {
                const projRes = await request.get(`/api/projects/${projId}`);
                projData = projRes?.data || projRes;
            } catch (pErr) {
                console.error(`Failed to fetch project info for ${projId}:`, pErr);
            }

            // Fetch project tasks via GET /api/projects/{projId}/tasks
            let taskList = [];
            try {
                const taskRes = await request.get(`/api/projects/${projId}/tasks`);
                taskList = Array.isArray(taskRes) ? taskRes : (taskRes && Array.isArray(taskRes.data) ? taskRes.data : []);
            } catch (tErr) {
                console.error(`Failed to fetch tasks for project ${projId}:`, tErr);
            }

            const formattedTasks = taskList.map(t => {
                const datesFormatted = t.dates || (t.start_date && t.end_date
                    ? `${t.start_date} - ${t.end_date}`
                    : (t.startDate && t.endDate
                        ? `${t.startDate} - ${t.endDate}`
                        : (t.dates || '')));

                const rawDue = t.dueDate || t.due_date || t.deadline || t.endDate || t.end_date || '';

                return {
                    id: String(t.id || t._id || Math.random()),
                    title: t.title || t.name || 'Task',
                    priority: (t.priority || 'MEDIUM').toUpperCase(),
                    assigner: t.assigner || t.assignee || t.createdBy || t.assignedTo || uname || 'KDT',
                    desc: t.desc || t.description || '',
                    status: (t.status || 'TODO').toUpperCase(),
                    dates: datesFormatted,
                    assignedTo: t.assignedTo || t.assignee || t.assigner || uname || 'Unassigned',
                    dueDate: rawDue || datesFormatted || '',
                    raw: t
                };
            });

            // Initially sort tasks by priority: URGENT -> HIGH -> MEDIUM -> LOW
            formattedTasks.sort((a, b) => getPriorityRank(a.priority) - getPriorityRank(b.priority));

            const pDatesFormatted = projData?.dates || (projData?.start_date && projData?.end_date
                ? `${projData.start_date} - ${projData.end_date}`
                : (projData?.startDate && projData?.endDate
                    ? `${projData.startDate} - ${projData.endDate}`
                    : ''));

            // Fetch users involved in this project via GET /api/users?projectId={ID}
            let pUsers = [];
            try {
                const pUsersRes = await request.get(`/api/users?projectId=${projId}`);
                const uList = Array.isArray(pUsersRes) ? pUsersRes : (pUsersRes && Array.isArray(pUsersRes.data) ? pUsersRes.data : []);
                if (uList && uList.length > 0) {
                    pUsers = uList.map(u => ({
                        id: String(u.id || u._id || Math.random()),
                        fullname: u.full_name || u.fullName || u.fullname || u.name || u.username || 'User',
                        username: u.username || '',
                        image: u.image || getUserAvatarUrl(u.username)
                    }));
                }
            } catch (uErr) {
                console.error(`Failed to fetch project users for project ${projId} (/api/users?projectId=${projId}):`, uErr);
            }

            // If empty or error
            if (pUsers.length === 0) {
                if (projData?.users && Array.isArray(projData.users) && projData.users.length > 0) {
                    pUsers = projData.users;
                } else {
                    pUsers = [
                        { id: '0', fullname: 'No one', username: 'No one', image: '/ProfilePic/0.jpg' }
                    ];
                }
            }

            return {
                id: String(projData?.id || projId),
                title: projData?.title || projData?.name || `Project ${projId}`,
                desc: projData?.description || projData?.desc || '',
                status: (projData?.status || 'ACTIVE').toUpperCase(),
                dates: pDatesFormatted,
                owner: projData?.owner || projData?.createdBy || 'KDT',
                users: pUsers,
                tasks: formattedTasks
            };
        } catch (err) {
            console.error(`Failed to process project ${projId}:`, err);
            return null;
        }
    });

    const loadedProjects = (await Promise.all(projectPromises)).filter(Boolean);
    return { currentUser, projects: loadedProjects };
}

// Inner Task Content with TanStack Query
function TaskContent() {
    const { isDark } = useTheme();
    const { currentUser } = useCurrentUser();
    const [searchParams, setSearchParams] = useSearchParams();
    const client = useQueryClient();

    const taskQueryKey = useMemo(() => ['taskPageData', currentUser.id], [currentUser.id]);

    // Notification Toast State
    const [toast, setToast] = useState(null);

    // Selected Task State for Detail Prompt Modal
    const [selectedTask, setSelectedTask] = useState(null);

    // Modal State for Global or Project users prompt
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: 'Edit Members',
        users: [],
        loading: false,
        isEditMode: false
    });
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [globalUsers, setGlobalUsers] = useState([]);

    // Active Project Index & ID tracking
    const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const initialSyncDoneRef = useRef(false);

    // Live Search Query State
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

    // TanStack Query for User and Tasks
    const {
        data,
        isPending: loading,
        isError: loadError,
        refetch: fetchUserAndTasks
    } = useQuery({
        queryKey: taskQueryKey,
        queryFn: () => fetchTasksPageData(currentUser),
        enabled: Boolean(currentUser && currentUser.id !== '?'),
    });

    const projects = useMemo(() => data?.projects || [], [data?.projects]);

    // Active project determined safely by selectedProjectId or fallback index
    const currentProject = useMemo(() => {
        if (!projects || projects.length === 0) return null;
        if (selectedProjectId) {
            const found = projects.find(p => String(p.id) === String(selectedProjectId));
            if (found) return found;
        }
        return projects[currentProjectIndex] || projects[0];
    }, [projects, selectedProjectId, currentProjectIndex]);

    // Switch to Previous Project
    const handlePrevProject = () => {
        if (!projects || projects.length === 0) return;
        const currentIdx = projects.findIndex(p => String(p.id) === String(currentProject?.id));
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : projects.length - 1;
        const targetProj = projects[prevIdx];
        if (targetProj) {
            setSelectedProjectId(targetProj.id);
            setCurrentProjectIndex(prevIdx);
            setSearchParams(prev => {
                const next = new URLSearchParams(prev);
                next.set('projectId', String(targetProj.id));
                return next;
            }, { replace: true });
        }
    };

    // Switch to Next Project
    const handleNextProject = () => {
        if (!projects || projects.length === 0) return;
        const currentIdx = projects.findIndex(p => String(p.id) === String(currentProject?.id));
        const nextIdx = currentIdx < projects.length - 1 ? currentIdx + 1 : 0;
        const targetProj = projects[nextIdx];
        if (targetProj) {
            setSelectedProjectId(targetProj.id);
            setCurrentProjectIndex(nextIdx);
            setSearchParams(prev => {
                const next = new URLSearchParams(prev);
                next.set('projectId', String(targetProj.id));
                return next;
            }, { replace: true });
        }
    };

    // Mutation for updating task status with TanStack Query
    const updateTaskStatusMutation = useMutation({
        mutationFn: async ({ taskId, nextStatus }) => {
            return request.put(`/api/tasks/${taskId}`, {
                status: nextStatus
            });
        },
        onMutate: async ({ taskId, nextStatus }) => {
            // Optimistic update
            await client.cancelQueries({ queryKey: taskQueryKey });
            const previousData = client.getQueryData(taskQueryKey);

            client.setQueryData(taskQueryKey, (old) => {
                if (!old || !old.projects) return old;
                const updatedProjects = old.projects.map((proj) => {
                    if (String(proj.id) !== String(currentProject?.id)) return proj;
                    const updatedTasks = proj.tasks.map(t => {
                        if (String(t.id) !== String(taskId)) return t;
                        return { ...t, status: nextStatus };
                    });
                    return { ...proj, tasks: updatedTasks };
                });
                return { ...old, projects: updatedProjects };
            });

            return { previousData };
        },
        onError: (err, variables, context) => {
            if (context?.previousData) {
                client.setQueryData(taskQueryKey, context.previousData);
            }
            console.error(`Failed to update status for task ${variables.taskId}:`, err);
            const errMsg = err?.response?.data?.message || err?.message || 'Failed to update task status!';
            setToast({
                message: errMsg,
                type: 'error'
            });
            client.invalidateQueries({ queryKey: taskQueryKey });
        },
        onSuccess: (res, variables) => {
            setToast({
                message: `Task moved to ${variables.nextStatus}!`,
                type: 'success'
            });
        }
    });

    // Drag-and-drop task reorder and status mutation handler
    const handleTaskDrop = ({ taskId, targetColumnKey, targetIndex }) => {
        if (!currentProject) return;

        const allTasks = currentProject.tasks || [];
        const taskToMove = allTasks.find(t => String(t.id) === String(taskId));
        if (!taskToMove) return;

        const targetColDef = COLUMNS_DEF.find(c => c.key === targetColumnKey);
        if (!targetColDef) return;

        const isSameColumn = targetColDef.matcher(taskToMove.status);
        const newStatus = isSameColumn ? taskToMove.status : targetColDef.statusValue;

        const updatedTasks = reorderTasks({
            allTasks,
            draggedTaskId: taskId,
            targetColumnKey,
            targetIndex,
            newStatus,
            columnsDef: COLUMNS_DEF
        });

        // Optimistically update query cache
        client.setQueryData(taskQueryKey, (old) => {
            if (!old || !old.projects) return old;
            const updatedProjects = old.projects.map((proj) => {
                if (String(proj.id) !== String(currentProject.id)) return proj;
                return { ...proj, tasks: updatedTasks };
            });
            return { ...old, projects: updatedProjects };
        });

        // If status changed, call backend mutation to update status
        if (newStatus !== taskToMove.status) {
            updateTaskStatusMutation.mutate({ taskId, nextStatus: newStatus });
        }
    };

    // Interactive Task Action Button
    const handleTaskAction = (taskToMove) => {
        let currentStatus = (taskToMove.status || '').toUpperCase();
        let nextStatus = 'IN_PROGRESS';

        if (currentStatus === 'TODO' || currentStatus === 'TO_DO' || currentStatus === 'PLANNING' || currentStatus === 'BACKLOG') {
            nextStatus = 'IN_PROGRESS';
        } else if (currentStatus === 'IN_PROGRESS' || currentStatus === 'DOING' || currentStatus === 'IN_REVIEW' || currentStatus === 'ON_HOLD') {
            nextStatus = 'DONE';
        } else if (currentStatus === 'DONE' || currentStatus === 'FINISHED') {
            nextStatus = 'CANCELLED';
        } else if (currentStatus === 'CANCELLED' || currentStatus === 'CANCELED' || currentStatus === 'ARCHIVED') {
            nextStatus = 'TODO';
        } else {
            nextStatus = 'IN_PROGRESS';
        }

        updateTaskStatusMutation.mutate({ taskId: taskToMove.id, nextStatus });
    };

    // Update task details handler (called from TaskDetailModal)
    const handleTaskUpdated = (updatedTask) => {
        setSelectedTask(updatedTask);

        // Update task in TanStack Query cache
        client.setQueryData(taskQueryKey, (old) => {
            if (!old || !old.projects) return old;
            const updatedProjects = old.projects.map((proj) => {
                if (String(proj.id) !== String(currentProject?.id)) return proj;
                const updatedTasks = proj.tasks.map((t) => {
                    if (String(t.id) !== String(updatedTask.id)) return t;
                    return { ...t, ...updatedTask };
                });
                return { ...proj, tasks: updatedTasks };
            });
            return { ...old, projects: updatedProjects };
        });
    };

    // Handle initial search and projectId query parameters without resetting on data mutations
    useEffect(() => {
        if (!projects || projects.length === 0) return;

        const projectIdParam = searchParams.get('projectId') || searchParams.get('project');

        if (!initialSyncDoneRef.current) {
            initialSyncDoneRef.current = true;
            if (projectIdParam) {
                const target = String(projectIdParam).toLowerCase().trim();
                const matchedIdx = projects.findIndex(p =>
                    String(p.id).toLowerCase().trim() === target ||
                    String(p.title).toLowerCase().trim() === target
                );
                if (matchedIdx !== -1) {
                    setCurrentProjectIndex(matchedIdx);
                    setSelectedProjectId(projects[matchedIdx].id);
                    return;
                }
            }

            const searchParam = searchParams.get('search');
            if (searchParam) {
                setSearchQuery(searchParam);
                const searchTarget = String(searchParam).toLowerCase().trim();
                const matchedIdx = projects.findIndex(p =>
                    String(p.title).toLowerCase().includes(searchTarget) ||
                    String(p.id).toLowerCase().trim() === searchTarget
                );
                if (matchedIdx !== -1) {
                    setCurrentProjectIndex(matchedIdx);
                    setSelectedProjectId(projects[matchedIdx].id);
                    return;
                }
            }

            setSelectedProjectId(projects[0].id);
            setCurrentProjectIndex(0);
        }
    }, [searchParams, projects]);

    // Fetch global users for Edit Members prompt
    const fetchGlobalUsers = useCallback(async () => {
        setModalConfig(prev => prev.isEditMode ? { ...prev, loading: true } : prev);
        try {
            const data = await request.get('/api/users');
            const userList = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : null);
            if (userList && userList.length > 0) {
                const formatted = userList.map(u => ({
                    id: String(u.id || u._id || Math.random()),
                    fullname: u.full_name || u.fullName || u.fullname || u.name || u.username || 'User',
                    username: u.username || '',
                    image: u.image || getUserAvatarUrl(u.username)
                }));
                setGlobalUsers(formatted);
                setModalConfig(prev => prev.isEditMode ? { ...prev, users: formatted, loading: false } : prev);
            } else {
                const defaultList = [
                    { id: '1', fullname: 'KDT', username: 'KDT', image: '/ProfilePic/KDT.jpg' },
                    { id: '2', fullname: 'Khang nig', username: 'Turtlely', image: '/ProfilePic/Turtlely.jpg' },
                    { id: '3', fullname: 'Ngo Do', username: 'NgoDo', image: '/ProfilePic/NgoDo.jpg' },
                    { id: '4', fullname: 'Eternal DESTROYER', username: 'CodeMaster', image: '/ProfilePic/0.jpg' },
                    { id: '5', fullname: 'USER', username: 'user', image: '/ProfilePic/0.jpg' },
                    { id: '6', fullname: 'dds', username: 'dds', image: '/ProfilePic/dds.jpg' }
                ];
                setGlobalUsers(defaultList);
                setModalConfig(prev => prev.isEditMode ? { ...prev, users: defaultList, loading: false } : prev);
            }
        } catch (err) {
            console.error('Failed to fetch global users in Task.jsx:', err);
            const defaultList = [
                { id: '1', fullname: 'KDT', username: 'KDT', image: '/ProfilePic/KDT.jpg' },
                { id: '2', fullname: 'Khang nig', username: 'Turtlely', image: '/ProfilePic/Turtlely.jpg' },
                { id: '3', fullname: 'Ngo Do', username: 'NgoDo', image: '/ProfilePic/NgoDo.jpg' },
                { id: '4', fullname: 'Eternal DESTROYER', username: 'CodeMaster', image: '/ProfilePic/0.jpg' },
                { id: '5', fullname: 'USER', username: 'user', image: '/ProfilePic/0.jpg' },
                { id: '6', fullname: 'dds', username: 'dds', image: '/ProfilePic/dds.jpg' }
            ];
            setGlobalUsers(defaultList);
            setModalConfig(prev => prev.isEditMode ? { ...prev, users: defaultList, loading: false } : prev);
        } finally {
            setModalConfig(prev => ({ ...prev, loading: false }));
        }
    }, []);

    const handleOpenGlobalMembers = () => {
        setModalConfig({
            isOpen: true,
            title: 'Edit Members',
            users: globalUsers,
            loading: globalUsers.length === 0,
            isEditMode: true
        });
        if (globalUsers.length === 0) {
            fetchGlobalUsers();
        }
    };

    const handleOpenProjectUsers = (users, projectTitle) => {
        setModalConfig({
            isOpen: true,
            title: `${projectTitle || 'Project'} USERS:`,
            users: users || [],
            loading: false,
            isEditMode: false
        });
    };

    // Add or remove user from the current project via PUT /api/users/{ID}
    const handleToggleMember = async (user, isCurrentlyInProject) => {
        if (!currentProject || !currentProject.id) return;

        // Prevent removing the project owner
        const ownerIdentifier = typeof currentProject.owner === 'object' && currentProject.owner !== null
            ? (currentProject.owner.username || currentProject.owner.id || currentProject.owner.name || currentProject.owner.fullname || '')
            : String(currentProject.owner || '');
        const o = ownerIdentifier.toLowerCase().trim();
        const isOwnerUser = o && (
            (user.username && user.username.toLowerCase().trim() === o) ||
            (user.fullname && user.fullname.toLowerCase().trim() === o) ||
            (user.name && user.name.toLowerCase().trim() === o) ||
            (user.id && String(user.id).toLowerCase().trim() === o)
        );
        if (isCurrentlyInProject && isOwnerUser) {
            return;
        }

        setActionLoadingId(String(user.id));
        try {
            // 1. Get user details from GET /api/users/{ID}
            const userRes = await request.get(`/api/users/${user.id}`);
            const userData = userRes?.data || userRes;
            const existingProjects = (userData && Array.isArray(userData.projects) ? userData.projects : [])
                .map(p => typeof p === 'object' && p !== null ? (p.id || p.projectId) : p);

            let updatedProjects;
            const pIdNum = !isNaN(Number(currentProject.id)) ? Number(currentProject.id) : currentProject.id;

            if (isCurrentlyInProject) {
                // Remove project from user's projects list
                updatedProjects = existingProjects.filter(pId => String(pId) !== String(currentProject.id));
            } else {
                // Append project ID to user's projects list
                if (!existingProjects.some(pId => String(pId) === String(currentProject.id))) {
                    updatedProjects = [...existingProjects, pIdNum];
                } else {
                    updatedProjects = existingProjects;
                }
            }

            // 2. PUT /api/users/{ID} with updated projects list
            await request.put(`/api/users/${user.id}`, {
                projects: updatedProjects
            });

            // 3. Update current project's users in query cache
            client.setQueryData(taskQueryKey, (old) => {
                if (!old || !old.projects) return old;
                const updatedProjectsList = old.projects.map(proj => {
                    if (String(proj.id) !== String(currentProject.id)) return proj;
                    let currentUsers = proj.users || [];
                    let newUsers;
                    if (isCurrentlyInProject) {
                        newUsers = currentUsers.filter(u => String(u.id) !== String(user.id));
                    } else {
                        if (!currentUsers.some(u => String(u.id) === String(user.id))) {
                            newUsers = [...currentUsers, user];
                        } else {
                            newUsers = currentUsers;
                        }
                    }
                    return { ...proj, users: newUsers };
                });
                return { ...old, projects: updatedProjectsList };
            });
        } catch (err) {
            console.error(`Failed to update project membership for user ${user.id}:`, err);
        } finally {
            setActionLoadingId(null);
        }
    };

    const currentProjectUserIds = (currentProject?.users || []).map(u => String(u.id));

    return (
        <div className={`tasks-page-wrapper${isDark ? ' dark-mode' : ''}`}>
            {/* Top Navigation Bar Component */}
            <div id="navbar-root">
                <NavBar
                    userId={currentUser.id}
                    fullName={currentUser.fullname}
                    userName={currentUser.username}
                    userImg={currentUser.image}
                    theme={isDark ? 'dark' : 'light'}
                />
            </div>

            {/* Universal Notification Toast */}
            <Notification toast={toast} onClose={() => setToast(null)} />

            {/* Page Content Container */}
            <div className="page-container">
                <TasksHeader
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                />

                {/* Error State with Centered Reload Button */}
                {loadError ? (
                    <div className="tasks-reload-center-box">
                        <ReloadButton onReload={fetchUserAndTasks} isLoading={loading} />
                    </div>
                ) : loading ? (
                    <div className="tasks-reload-center-box">
                        <ReloadButton onReload={fetchUserAndTasks} isLoading={true} />
                    </div>
                ) : (
                    <React.Fragment>
                        {/* 4 Status Column Cards with Sideways Scrollbar & Vertical Scrollbars */}
                        <KanbanBoard
                            currentProject={currentProject}
                            searchQuery={searchQuery}
                            onTaskAction={handleTaskAction}
                            onTaskClick={setSelectedTask}
                            onTaskDrop={handleTaskDrop}
                        />

                        {/* Current Project Card & Switch Buttons */}
                        <CurrentProjectSection
                            currentProject={currentProject}
                            onPrevProject={handlePrevProject}
                            onNextProject={handleNextProject}
                            onOpenProjectUsers={handleOpenProjectUsers}
                        />

                        {/* Bottom Action Footer */}
                        <NewTaskFooter
                            onOpenMembers={handleOpenGlobalMembers}
                            currentProjectId={currentProject?.id}
                        />

                        {/* Task Detail Prompt Modal (Reference Image) */}
                        <TaskDetailModal
                            task={selectedTask}
                            onClose={() => setSelectedTask(null)}
                            onTaskUpdated={handleTaskUpdated}
                            users={globalUsers && globalUsers.length > 0 ? globalUsers : (currentProject?.users || [])}
                            currentUser={currentUser}
                            onShowToast={(msg, type) => setToast({ message: msg, type })}
                        />

                        {/* Users Prompt Modal (Global Edit Mode or Project Involved Users View) */}
                        <GlobalUsersModal
                            isOpen={modalConfig.isOpen}
                            onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                            users={modalConfig.users}
                            loading={modalConfig.loading}
                            title={modalConfig.title}
                            projectUserIds={currentProjectUserIds}
                            isEditMode={modalConfig.isEditMode}
                            onToggleMember={handleToggleMember}
                            actionLoadingId={actionLoadingId}
                            projectOwner={currentProject?.owner}
                        />
                    </React.Fragment>
                )}
            </div>
        </div>
    );
}

// Main Task / Kanban Page Component
function Task() {
    return <TaskContent />;
}

export default Task;
