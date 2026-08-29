/*Taskflow Universal functions*/

/*Returns the CSS class for project border color based on status text.*/
export function getProjectStatusClass(status) {
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

/*Returns the CSS class for task priority border styling.*/
export function getTaskPriorityClass(priority) {
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

/*Returns the CSS class for task priority badge / tag pill styling.*/
export function getPriorityTagClass(priority) {
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

/*Returns the profile picture path in ProfilePic directory based on username, defaulting to 0.jpg placeholder*/
export function getUserAvatarUrl(username, fallback = '/ProfilePic/0.jpg') {
    if (!username) return fallback;
    return `/ProfilePic/${username}.jpg`;
}

/*Extracts a URL search query parameter value safely from the current browser URL.*/
export function getUrlParam(param) {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param) || '';
    } catch (e) {
        return '';
    }
}

/*Filters an array of objects by matching a query string across all text fields.*/
export function filterBySearchQuery(items, query) {
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

if (typeof window !== 'undefined') {
    window.getProjectStatusClass = getProjectStatusClass;
    window.getTaskPriorityClass = getTaskPriorityClass;
    window.getPriorityTagClass = getPriorityTagClass;
    window.getUserAvatarUrl = getUserAvatarUrl;
    window.getUrlParam = getUrlParam;
    window.filterBySearchQuery = filterBySearchQuery;
}
