import request from './Request';

export const DUMMY_NOTIFICATIONS = [

];

/**
 * Normalizes backend notification object to the format expected by UI
 */
export function formatNotificationItem(item, usersMap = {}) {
    if (!item) return null;
    const id = item.id ?? item._id ?? Date.now();
    const isRead = Boolean(item.is_read || item.is_seen || item.seenAt || item.read || item.seen);

    // Map type to user-facing title
    let title = item.title;
    if (!title) {
        const typeStr = String(item.type || '').toLowerCase();
        if (typeStr.includes('task')) {
            title = "New changes in tasks' statuses.";
        } else if (typeStr.includes('appeal')) {
            title = "Appeal submitted";
        } else if (typeStr.includes('memberadd') || typeStr.includes('member_add')) {
            title = "Added to project";
        } else if (typeStr.includes('memberremove') || typeStr.includes('member_remove')) {
            title = "Removed from project";
        } else if (typeStr.includes('discussion') || typeStr.includes('post') || typeStr.includes('comment') || typeStr.includes('comm')) {
            title = "New discussion";
        } else if (typeStr.includes('project')) {
            title = "Project update";
        } else {
            title = item.type ? `${item.type} update` : "Notification";
        }
    }

    // Map actorId to author handle
    let author = item.author;
    if (!author) {
        const rawActor = item.actor;
        let actorHandle = typeof rawActor === 'object' && rawActor !== null
            ? (rawActor.username || rawActor.authorHandle || rawActor.name)
            : (item.actorUsername || item.authorHandle || item.authorName);

        if (!actorHandle && item.actorId) {
            const mappedUser = usersMap[String(item.actorId)];
            if (mappedUser) {
                actorHandle = mappedUser.username || mappedUser.fullname;
            } else if (String(item.actorId) === '1') {
                actorHandle = 'KDT';
            } else if (String(item.actorId) === '2') {
                actorHandle = 'vcerianman';
            } else if (String(item.actorId) === '3') {
                actorHandle = 'ngolodo';
            } else if (String(item.actorId) === '4') {
                actorHandle = 'khanig';
            } else {
                actorHandle = `User ${item.actorId}`;
            }
        }

        if (actorHandle) {
            author = actorHandle.startsWith('By ') ? actorHandle : (actorHandle.startsWith('@') ? `By ${actorHandle}` : `By @${actorHandle}`);
        } else {
            author = 'By @KDT';
        }
    }

    return {
        id: String(id),
        recipientId: item.recipientId,
        actorId: item.actorId,
        type: item.type || 'Task',
        title: title,
        message: item.message || item.content || item.desc || '[message]',
        link: item.link ?? (String(item.type || '').includes('MemberRemove') ? null : '/tasks'),
        read: isRead,
        createdAt: item.createdAt || item.created_at || 'Just now',
        raw: item
    };
}

/**
 * GET /api/notifications/{userId}
 * Fetch user's notifications (ordered newest first)
 * Supports query params ?limit=20 or ?unreadOnly=true
 */
export const getUserNotifications = async (userId, options = {}, usersMap = {}) => {
    if (!userId || userId === '?') {
        return DUMMY_NOTIFICATIONS;
    }

    const { limit = 20, unreadOnly = false } = options;
    const queryParams = [];
    if (limit) queryParams.push(`limit=${encodeURIComponent(limit)}`);
    if (unreadOnly) queryParams.push('unreadOnly=true');
    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    try {
        let res;
        try {
            res = await request.get(`/api/notifications/${userId}${queryString}`);
        } catch (err1) {
            // Fallback without userId in path if backend route is /api/notifications
            if (err1?.response?.status === 404) {
                res = await request.get(`/api/notifications${queryString}`);
            } else {
                throw err1;
            }
        }

        const rawList = Array.isArray(res) ? res : (res?.data && Array.isArray(res.data) ? res.data : (res?.notifications || null));
        if (Array.isArray(rawList)) {
            return rawList.map(item => formatNotificationItem(item, usersMap)).filter(Boolean);
        }
        return DUMMY_NOTIFICATIONS;
    } catch (error) {
        console.warn(`GET /api/notifications/${userId} not ready yet, using dummy notifications:`, error?.message || error);
        return DUMMY_NOTIFICATIONS;
    }
};

/**
 * Backward compatibility alias for getUserNotifications
 */
export const getNotifications = (userId, options = {}, usersMap = {}) => {
    return getUserNotifications(userId, options, usersMap);
};

/**
 * GET /api/notifications/n/{userId}
 * Return count of unread (is_read = false) notifications to display on NavBar bell badge
 */
export const getUnreadNotificationCount = async (userId) => {
    if (!userId || userId === '?') {
        return DUMMY_NOTIFICATIONS.filter(n => !n.read).length;
    }

    try {
        let res;
        try {
            res = await request.get(`/api/notifications/n/${userId}`);
        } catch (err1) {
            // Fallback without userId in path
            if (err1?.response?.status === 404) {
                res = await request.get('/api/notifications/n');
            } else {
                throw err1;
            }
        }

        const count = typeof res === 'number'
            ? res
            : (res?.count ?? res?.unreadCount ?? res?.n ?? res?.unread ?? (Array.isArray(res) ? res.length : null));

        if (count !== null && count !== undefined && !isNaN(Number(count))) {
            return Number(count);
        }
        return DUMMY_NOTIFICATIONS.filter(n => !n.read).length;
    } catch (error) {
        console.warn(`GET /api/notifications/n/${userId} not ready yet:`, error?.message || error);
        return DUMMY_NOTIFICATIONS.filter(n => !n.read).length;
    }
};

/**
 * GET /api/notifications/stream?token=...
 * Opens a Server-Sent Events (SSE) connection to push new notifications in real-time
 */
export const openNotificationsStream = ({
    token,
    onConnected,
    onNotification,
    onNotificationUpdated,
    onError
}) => {
    if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
        return null;
    }

    const jwtToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : '') || '';
    const apiBase = (request?.defaults?.baseURL || 'https://kdttaskflow.onrender.com').replace(/\/+$/, '');
    const streamUrl = `${apiBase}/api/notifications/stream${jwtToken ? `?token=${encodeURIComponent(jwtToken)}` : ''}`;

    let eventSource;
    try {
        eventSource = new EventSource(streamUrl, { withCredentials: true });
    } catch (err1) {
        try {
            eventSource = new EventSource(streamUrl);
        } catch (err2) {
            console.error('Failed to initialize Notifications EventSource:', err2);
            return null;
        }
    }

    // 1. Initial Handshake
    eventSource.addEventListener('CONNECTED', (e) => {
        try {
            const data = e.data ? JSON.parse(e.data) : {};
            if (onConnected) onConnected(data);
        } catch (err) {
            if (onConnected) onConnected(e.data);
        }
    });

    // 2. New Notification Received
    const handleNew = (e) => {
        try {
            const data = typeof e.data === 'string' ? JSON.parse(e.data) : (e.data || e);
            const notifItem = data?.notification || data?.data || data;
            if (onNotification && notifItem) {
                onNotification(notifItem);
            }
        } catch (err) {
            console.error('Failed to parse SSE notification event:', err);
        }
    };

    eventSource.addEventListener('NOTIFICATION', handleNew);
    eventSource.addEventListener('NEW_NOTIFICATION', handleNew);
    eventSource.addEventListener('NOTIFICATION_CREATED', handleNew);
    eventSource.addEventListener('notification', handleNew);

    // 3. Notification Updated / Seen
    const handleUpdated = (e) => {
        try {
            const data = typeof e.data === 'string' ? JSON.parse(e.data) : (e.data || e);
            const notifItem = data?.notification || data?.data || data;
            if (onNotificationUpdated && notifItem) {
                onNotificationUpdated(notifItem);
            }
        } catch (err) {
            console.error('Failed to parse SSE notification update event:', err);
        }
    };

    eventSource.addEventListener('NOTIFICATION_UPDATED', handleUpdated);
    eventSource.addEventListener('NOTIFICATION_READ', handleUpdated);
    eventSource.addEventListener('NOTIFICATION_SEEN', handleUpdated);

    // 4. Generic Message Event Fallback
    eventSource.addEventListener('message', (e) => {
        try {
            if (!e.data) return;
            const data = JSON.parse(e.data);
            const eventType = String(data?.type || data?.event || data?.action || '').toUpperCase();
            if (eventType === 'NOTIFICATION' || eventType === 'NEW_NOTIFICATION' || eventType === 'NOTIFICATION_CREATED') {
                if (onNotification) onNotification(data?.notification || data?.data || data);
            } else if (eventType === 'NOTIFICATION_UPDATED' || eventType === 'NOTIFICATION_READ' || eventType === 'NOTIFICATION_SEEN') {
                if (onNotificationUpdated) onNotificationUpdated(data?.notification || data?.data || data);
            } else if (data && (data.id || data.message || data.type)) {
                if (onNotification) onNotification(data);
            }
        } catch (err) {
            // silent fallback
        }
    });

    // 5. Periodic Heartbeat
    eventSource.addEventListener('HEARTBEAT', () => {
        // connection is alive
    });

    // 6. Error handling
    eventSource.onerror = (err) => {
        if (onError) onError(err);
    };

    return eventSource;
};

/**
 * Mark a single notification as seen/read
 */
export const markNotificationAsSeen = async (notificationId) => {
    try {
        let res;
        try {
            res = await request.put(`/api/notifications/${notificationId}/seen`);
        } catch (err1) {
            try {
                res = await request.patch(`/api/notifications/${notificationId}`, {
                    is_read: true,
                    is_seen: true,
                    seenAt: new Date().toISOString()
                });
            } catch (err2) {
                res = await request.put(`/api/notifications/${notificationId}/read`);
            }
        }
        return res?.data || res;
    } catch (error) {
        console.warn(`Mark notification ${notificationId} as seen endpoint fallback:`, error?.message || error);
        return { success: true, id: notificationId, read: true, is_read: true, is_seen: true };
    }
};

/**
 * Mark all notifications as seen/read
 */
export const markAllNotificationsAsSeen = async (userId) => {
    try {
        let res;
        const url = userId && userId !== '?' ? `/api/notifications/seen-all/${userId}` : '/api/notifications/seen-all';
        try {
            res = await request.put(url);
        } catch (err1) {
            try {
                res = await request.patch('/api/notifications/seen-all');
            } catch (err2) {
                res = await request.put('/api/notifications/read-all');
            }
        }
        return res?.data || res;
    } catch (error) {
        console.warn('Mark all notifications as seen endpoint fallback:', error?.message || error);
        return { success: true, allRead: true };
    }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId) => {
    try {
        const response = await request.delete(`/api/notifications/${notificationId}`);
        return response?.data || response;
    } catch (error) {
        console.warn(`Delete notification ${notificationId} endpoint not ready yet:`, error?.message || error);
        return { success: true, id: notificationId };
    }
};

let lastNotificationHash = '';
let lastNotificationTime = 0;

/**
 * POST /api/notifications: Create a new notification for userIDs:
 * Request:
 * {
 *   "recipientIds": [3, 2, 4, 7, 9],
 *   "actorId": 1,
 *   "type": "Task",
 *   "message": "@KDT rearranged tasks in Project A",
 *   "link": "/tasks?projectId=1"
 * }
 */
export const createNotification = async (payload) => {
    try {
        let res;
        try {
            res = await request.post('/api/notifications', payload);
        } catch (err1) {
            if (err1?.response?.status === 404) {
                res = await request.post('/api/notification', payload);
            } else {
                throw err1;
            }
        }
        return res?.data || res;
    } catch (err) {
        console.warn('POST /api/notifications failed, trying fallback:', err?.response?.data || err?.message || err);
        // Fallback for single recipientId if backend expects individual notifications
        if (Array.isArray(payload.recipientIds) && payload.recipientIds.length > 0) {
            try {
                await Promise.all(payload.recipientIds.map(rId =>
                    request.post('/api/notifications', {
                        ...payload,
                        recipientId: rId
                    }).catch(() => { })
                ));
            } catch (fallbackErr) {
                // ignore
            }
        }
        return null;
    }
};

/**
 * Sends a notification when tasks are altered in a project.
 * Autofills:
 * - recipientIds: Users involved in the project
 * - actorId: The user who altered the tasks
 * - type: "Task"
 * - message: "@Username rearranged tasks in Project X"
 * - link: "/tasks?projectId=..."
 */
export const sendTaskChangeNotification = async ({
    currentProject,
    currentUser,
    actionType = 'rearranged',
    taskTitle = ''
}) => {
    if (!currentProject) return null;

    try {
        const actorId = Number(currentUser?.id) || 1;
        const actorName = currentUser?.username || currentUser?.fullname || 'User';
        const actorHandle = actorName.startsWith('@') ? actorName : `@${actorName}`;
        const projectTitle = currentProject.title || currentProject.name || `Project ${currentProject.id || ''}`;
        const projectId = currentProject.id || 1;

        // Autofill message: "... rearranged tasks in ..."
        let message = `${actorHandle} rearranged tasks in ${projectTitle}`;
        if (actionType === 'updated' && taskTitle) {
            message = `${actorHandle} updated task "${taskTitle}" in ${projectTitle}`;
        }

        // Deduplication guard to ensure notification is sent once per alteration
        const now = Date.now();
        const notificationHash = `${projectId}_${actorId}_${message}`;
        if (notificationHash === lastNotificationHash && (now - lastNotificationTime) < 1500) {
            return null;
        }
        lastNotificationHash = notificationHash;
        lastNotificationTime = now;

        // Collect all involved project user IDs
        let pUsers = currentProject.users || [];
        if (!pUsers.length || (pUsers.length === 1 && String(pUsers[0]?.id) === '0')) {
            try {
                const res = await request.get(`/api/users?projectId=${projectId}`);
                const list = Array.isArray(res) ? res : (res?.data && Array.isArray(res.data) ? res.data : []);
                if (list.length > 0) {
                    pUsers = list;
                }
            } catch (uErr) {
                // ignore
            }
        }

        let allUserIds = pUsers
            .map(u => {
                const rawId = typeof u === 'object' && u !== null ? (u.id ?? u.userId ?? u._id) : u;
                return Number(rawId);
            })
            .filter(id => !isNaN(id) && id > 0);

        allUserIds = [...new Set(allUserIds)];

        // Exclude actorId from recipients
        let recipientIds = allUserIds.filter(id => id !== actorId);
        if (recipientIds.length === 0) {
            recipientIds = allUserIds.length > 0 ? allUserIds : [actorId];
        }

        const payload = {
            recipientIds,
            actorId,
            type: "Task",
            message,
            link: `/tasks?projectId=${projectId}`
        };

        return await createNotification(payload);
    } catch (err) {
        console.warn('sendTaskChangeNotification error:', err);
        return null;
    }
};

/**
 * Sends a notification when a project member is added or removed.
 * - type: "ProjectMemberAdd" -> Message: "@actor added you to [project]" with link to project
 * - type: "ProjectMemberRemove" -> Message: "@actor removed you from [project]." without link to project
 */
export const sendMemberChangeNotification = async ({
    currentProject,
    currentUser,
    targetUser,
    isAdd = true
}) => {
    if (!currentProject || !targetUser) return null;

    try {
        const actorId = Number(currentUser?.id) || 1;
        const actorName = currentUser?.username || currentUser?.fullname || 'User';
        const actorHandle = actorName.startsWith('@') ? actorName : `@${actorName}`;
        const projectTitle = currentProject.title || currentProject.name || `Project ${currentProject.id || ''}`;
        const projectId = currentProject.id || 1;

        const targetUserId = Number(targetUser.id ?? targetUser.userId ?? targetUser._id);
        if (isNaN(targetUserId) || targetUserId <= 0) return null;

        const type = isAdd ? "ProjectMemberAdd" : "ProjectMemberRemove";
        const message = isAdd
            ? `${actorHandle} added you to ${projectTitle}`
            : `${actorHandle} removed you from ${projectTitle}.`;
        const link = isAdd ? `/tasks?projectId=${projectId}` : null;

        const payload = {
            recipientIds: [targetUserId],
            actorId,
            type,
            message,
            link
        };

        return await createNotification(payload);
    } catch (err) {
        console.warn('sendMemberChangeNotification error:', err);
        return null;
    }
};

/**
 * Sends a notification when a banned user submits an appeal.
 * Queries GET /api/users to find all admins with roles GOD and ADMIN.
 * - type: "appeal"
 * - message: "@<username> appealed and needs reviewing."
 * - link: "/admin"
 */
export const sendAppealNotification = async ({ username, actorId = null }) => {
    try {
        let adminUsers = [];
        try {
            const res = await request.get('/api/users/admins');
            adminUsers = Array.isArray(res) ? res : (res?.data || res?.content || res?.admins || []);
        } catch (e) {
            console.warn('GET /api/users/admins failed:', e);
        }

        let recipientIds = [
            ...new Set(
                adminUsers
                    .map((u) => Number(u.id ?? u.userId ?? u._id))
                    .filter((id) => !isNaN(id) && id > 0)
            )
        ];

        if (recipientIds.length === 0) {
            recipientIds = [1];
        }

        let resolvedActorId = Number(actorId);
        if (isNaN(resolvedActorId) || resolvedActorId <= 0) {
            resolvedActorId = 1;
        }

        const cleanUsername = String(username || 'User').trim();
        const handle = cleanUsername.startsWith('@') ? cleanUsername : `@${cleanUsername}`;
        const message = `${handle} appealed and needs reviewing.`;

        const payload = {
            recipientIds,
            actorId: resolvedActorId,
            type: "appeal",
            message,
            link: "/admin"
        };

        return await createNotification(payload);
    } catch (err) {
        console.warn('sendAppealNotification error:', err);
        return null;
    }
};
