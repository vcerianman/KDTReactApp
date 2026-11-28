import React, { useState, useEffect, useCallback } from 'react';
import './ReloadButton.css';

export const DEFAULT_RELOAD_TIMEOUT_MS = 6000;

/**
 * Shared hook that triggers a fallback reload button if a section errors out
 * or fails to finish loading within `timeoutMs` (default 10s).
 * Keeps the reload button visible, grayed out, and spinning while a user-initiated
 * reload attempt is running.
 */
export function useReloadTimeout({
    loading = false,
    error = false,
    hasData = false,
    onReload,
    timeoutMs = DEFAULT_RELOAD_TIMEOUT_MS
}) {
    const [timedOut, setTimedOut] = useState(false);
    const [isReloading, setIsReloading] = useState(false);

    useEffect(() => {
        if (hasData) {
            setTimedOut(false);
            return undefined;
        }
        if (!loading) {
            if (!error) {
                setTimedOut(false);
            }
            return undefined;
        }
        if (error || timedOut) {
            return undefined;
        }

        const timer = setTimeout(() => {
            setTimedOut(true);
        }, timeoutMs);

        return () => clearTimeout(timer);
    }, [loading, error, hasData, timedOut, timeoutMs]);

    const handleReload = useCallback(async () => {
        if (isReloading || !onReload) return;
        setIsReloading(true);
        let timeoutGuard;
        try {
            await Promise.race([
                Promise.resolve(onReload()),
                new Promise((resolve) => {
                    timeoutGuard = setTimeout(resolve, timeoutMs);
                })
            ]);
        } finally {
            clearTimeout(timeoutGuard);
            setIsReloading(false);
        }
    }, [isReloading, onReload, timeoutMs]);

    const showReload = Boolean(isReloading || error || (timedOut && !hasData));

    return {
        showReload,
        isReloading,
        handleReload
    };
}

/**
 * Unified Reload Button used across all pages.
 * Grays out and spins the arrow icon while reloading.
 */
function ReloadButton({
    onReload,
    isLoading = false,
    title = 'Reload',
    ariaLabel,
    className = ''
}) {
    const [internalLoading, setInternalLoading] = useState(false);
    const activeLoading = Boolean(isLoading || internalLoading);

    const handleClick = async (e) => {
        if (activeLoading || !onReload) return;
        const result = onReload(e);
        if (result && typeof result.then === 'function') {
            setInternalLoading(true);
            try {
                await result;
            } finally {
                setInternalLoading(false);
            }
        }
    };

    return (
        <button
            type="button"
            className={`section-reload-btn${activeLoading ? ' loading' : ''}${className ? ` ${className}` : ''}`}
            onClick={handleClick}
            disabled={activeLoading}
            title={title}
            aria-label={ariaLabel || title}
        >
            <svg
                viewBox="0 0 24 24"
                width="28"
                height="28"
                fill="none"
                stroke="currentColor"
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

export default ReloadButton;
