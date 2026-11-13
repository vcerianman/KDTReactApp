// serverPing.js
// Checks server availability via GET /api/ping every 10 seconds.
// Renders a 5x5 px status dot anchored to the bottom-left corner of the screen:
//   green  = backend online (HTTP 200)
//   red    = backend unreachable / non-200
// Also logs to the browser console (clears before each print).

const API_BASE = 'https://kdttaskflow.onrender.com';
const PING_INTERVAL_MS = 10_000;
const DOT_ID = '__server-status-dot__';

/** Create (or retrieve) the persistent status dot DOM element. */
function getOrCreateDot() {
    let dot = document.getElementById(DOT_ID);
    if (!dot) {
        dot = document.createElement('div');
        dot.id = DOT_ID;
        Object.assign(dot.style, {
            position:        'fixed',
            bottom:          '0px',
            left:            '0px',
            width:           '5px',
            height:          '5px',
            borderRadius:    '50%',
            backgroundColor: '#888', // neutral grey until first ping resolves
            zIndex:          '99999',
            pointerEvents:   'none',
        });
        document.body.appendChild(dot);
    }
    return dot;
}

function setDotColor(color) {
    const dot = getOrCreateDot();
    dot.style.backgroundColor = color;
}

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
            setDotColor('#22c55e'); // green
        } else {
            console.log('The great server is down');
            setDotColor('#ef4444'); // red
        }
    } catch {
        console.clear();
        console.log('The great server is down');
        setDotColor('#ef4444'); // red
    }
}

let _pingIntervalId = null;

/**
 * Starts the server ping routine.
 * Safe to call multiple times — only one interval runs at a time.
 */
export function startServerPing() {
    if (_pingIntervalId !== null) return;

    // Inject dot immediately so it's visible before the first ping resolves
    if (typeof window !== 'undefined') {
        // Wait for DOM to be ready if called very early
        if (document.body) {
            getOrCreateDot();
        } else {
            document.addEventListener('DOMContentLoaded', getOrCreateDot, { once: true });
        }
    }

    // Run once immediately, then repeat every 10 seconds
    checkServer();
    _pingIntervalId = setInterval(checkServer, PING_INTERVAL_MS);
}

/**
 * Stops the server ping routine and removes the status dot.
 */
export function stopServerPing() {
    if (_pingIntervalId !== null) {
        clearInterval(_pingIntervalId);
        _pingIntervalId = null;
    }
    const dot = document.getElementById(DOT_ID);
    if (dot) dot.remove();
}

