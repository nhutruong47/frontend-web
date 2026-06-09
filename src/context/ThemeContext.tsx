import { createContext, useContext, useState, useLayoutEffect, type ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'dark',
    toggleTheme: () => { },
});

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem('orca-theme');
        return (saved === 'light' || saved === 'dark') ? saved : 'dark';
    });

    useLayoutEffect(() => {
        localStorage.setItem('orca-theme', theme);
        document.body.classList.remove('theme-dark', 'theme-light');
        document.documentElement.classList.remove('theme-dark', 'theme-light');
        document.body.classList.add(`theme-${theme}`);
        document.documentElement.classList.add(`theme-${theme}`);
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
