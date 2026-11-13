// serverPing.js
// Checks server availability via GET /api/ping every 10 seconds.
// Prints "online" if the server responds with HTTP 200.
// Prints "The great server is down" if the server is unreachable.
// Always clears the console before printing.

const API_BASE = 'https://kdttaskflow.onrender.com';
const PING_INTERVAL_MS = 10_000;

async function checkServer() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(`${API_BASE}/api/ping`, {
            method: 'GET',
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.clear();
        if (res.status === 200) {
            console.log('online');
        } else {
            console.log('The great server is down');
        }
    } catch {
        console.clear();
        console.log('The great server is down');
    }
}

let _pingIntervalId = null;

/**
 * Starts the server ping routine.
 * Safe to call multiple times — only one interval runs at a time.
 */
export function startServerPing() {
    if (_pingIntervalId !== null) return;

    // Run once immediately, then repeat every 10 seconds
    checkServer();
    _pingIntervalId = setInterval(checkServer, PING_INTERVAL_MS);
}

/**
 * Stops the server ping routine.
 */
export function stopServerPing() {
    if (_pingIntervalId !== null) {
        clearInterval(_pingIntervalId);
        _pingIntervalId = null;
    }
}

