import { useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark' | string;

export interface UseThemeReturn {
    theme: ThemeMode;
    isDark: boolean;
}

function getStoredTheme(): ThemeMode {
    try {
        return localStorage.getItem('taskflow_theme') || 'light';
    } catch {
        return 'light';
    }
}

/**
 * useTheme — shared hook for reading the current app theme.
 * Reads initial value from localStorage ('taskflow_theme')
 * and subscribes to 'taskflow_theme_change' CustomEvent (dispatched by Settings.jsx).
 */
export function useTheme(): UseThemeReturn {
    const [theme, setTheme] = useState<ThemeMode>(getStoredTheme);

    useEffect(() => {
        const handleChange = (e: Event) => {
            const customEvent = e as CustomEvent<{ theme?: string }>;
            const newTheme = customEvent?.detail?.theme || 'light';
            setTheme(newTheme);
        };
        window.addEventListener('taskflow_theme_change', handleChange);
        return () => window.removeEventListener('taskflow_theme_change', handleChange);
    }, []);

    return { theme, isDark: theme === 'dark' };
}

export default useTheme;

