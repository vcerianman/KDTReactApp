/* Taskflow Universal functions */
import { ProjectStatus, TaskPriority } from './types';

/**
 * Returns the CSS class for project border color based on status text.
 */
export function getProjectStatusClass(status?: ProjectStatus | null): string {
    const text = (status || '').toLowerCase();
    if (text.includes('active')) {
        return 'status-active';
    } else if (text.includes('on_hold') || text.includes('on hold') || text.includes('in_progress')) {
        return 'status-on-hold';
    } else if (text.includes('completed')) {
        return 'status-completed';
    } else if (text.includes('archived')) {
        return 'status-archived';
    } else {
        return 'status-planning';
    }
}

/**
 * Returns the CSS class for task priority border styling.
 */
export function getTaskPriorityClass(priority?: TaskPriority | null): string {
    const p = (priority || '').toLowerCase();
    if (p.includes('urgent')) {
        return 'priority-urgent';
    } else if (p.includes('high')) {
        return 'priority-high';
    } else if (p.includes('medium')) {
        return 'priority-medium';
    } else {
        return 'priority-low';
    }
}

/**
 * Returns the CSS class for task priority badge / tag pill styling.
 */
export function getPriorityTagClass(priority?: TaskPriority | null): string {
    const p = (priority || '').toLowerCase();
    if (p.includes('urgent')) {
        return 'priority-tag-urgent';
    } else if (p.includes('high')) {
        return 'priority-tag-high';
    } else if (p.includes('medium')) {
        return 'priority-tag-medium';
    } else {
        return 'priority-tag-low';
    }
}

/**
 * Returns the profile picture path in ProfilePic directory based on username, defaulting to 0.jpg placeholder.
 */
export function getUserAvatarUrl(username?: string | null, fallback: string = '/ProfilePic/0.jpg'): string {
    if (!username) return fallback;
    return `/ProfilePic/${username}.jpg`;
}

/**
 * Extracts a URL search query parameter value safely from the current browser URL.
 */
export function getUrlParam(param: string): string {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param) || '';
    } catch {
        return '';
    }
}

/**
 * Safely formats any date, timestamp, or date-range string into a clean DD/MM/YYYY string.
 */
export function formatTaskDueDate(rawDate?: string | Date | null): string {
    if (!rawDate) return 'No due date';
    const str = String(rawDate).trim();
    if (!str || str.toLowerCase() === 'dd/mm/yyyy') return 'No due date';

    // If it's a date range like "01/01/2026 - 31/12/2026", take the end date
    if (str.includes(' - ')) {
        const parts = str.split(' - ');
        return formatTaskDueDate(parts[1] || parts[0]);
    }

    // Attempt date parsing
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
        const day = String(parsed.getDate()).padStart(2, '0');
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const year = parsed.getFullYear();
        return `${day}/${month}/${year}`;
    }

    return str;
}

/**
 * Filters an array of objects by matching a query string across all text and numeric fields.
 */
export function filterBySearchQuery<T extends Record<string, any>>(items: T[], query?: string | null): T[] {
    const cleanQuery = (query || '').toLowerCase().trim();
    if (!cleanQuery) return items;

    return items.filter(item => {
        const fullText = Object.values(item)
            .filter(val => typeof val === 'string' || typeof val === 'number')
            .join(' ')
            .toLowerCase();
        return fullText.includes(cleanQuery);
    });
}

// Preserve window attachments for backwards compatibility
if (typeof window !== 'undefined') {
    const win = window as any;
    win.getProjectStatusClass = getProjectStatusClass;
    win.getTaskPriorityClass = getTaskPriorityClass;
    win.getPriorityTagClass = getPriorityTagClass;
    win.getUserAvatarUrl = getUserAvatarUrl;
    win.getUrlParam = getUrlParam;
    win.filterBySearchQuery = filterBySearchQuery;
}

