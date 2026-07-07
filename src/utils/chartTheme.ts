import { useTheme } from '../context/ThemeContext';

/**
 * Theme-aware chart palette.
 * Returns a small set of stable categorical colors that read well
 * on both the dark (espresso) and light (cool-neutral) backgrounds.
 */
export interface ChartPalette {
    text: string;
    muted: string;
    grid: string;
    primary: string;
    accent: string;
    categorical: readonly string[];
}

export function useChartPalette(): ChartPalette {
    const { theme } = useTheme();

    if (theme === 'light') {
        return {
            text: '#0F172A',
            muted: '#64748B',
            grid: '#E5E7EB',
            primary: '#B8860B',
            accent: '#D4A574',
            categorical: ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777', '#0F766E', '#EA580C'],
        };
    }

    return {
        text: '#F2E8DC',
        muted: '#94A3B8',
        grid: '#3E2B1F',
        primary: '#D4A574',
        accent: '#E2B888',
        categorical: ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#F472B6', '#2DD4BF', '#FB923C'],
    };
}