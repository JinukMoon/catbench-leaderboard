/**
 * Color Schemes for CatBench Leaderboard
 * 
 * This file contains different color palette options for the UI.
 * Switch between schemes by importing the desired one.
 */

// Original Teal/Cyan Scheme (Current)
export const colorSchemeTeal = {
  name: 'Teal/Cyan',
  primary: {
    main: '#0d9488',      // Teal
    light: '#14b8a6',      // Teal light
    dark: '#0891b2',       // Cyan dark
    gradient: 'linear-gradient(135deg, #0d9488 0%, #06b6d4 100%)',
  },
  accent: {
    amber: '#f59e0b',     // Highlights, Pareto frontier
    cyan: '#06b6d4',      // Gradient accent
  },
  neutral: {
    bg: '#fafafa',        // Page background
    card: '#f4f4f5',      // Card backgrounds
    border: '#d4d4d8',    // Borders
    textSecondary: '#52525b',  // Secondary text
    textPrimary: '#18181b',    // Primary text
  },
  ranking: {
    gold: '#fbbf24',      // 1st place
    silver: '#94a3b8',    // 2nd place
    bronze: '#fb923c',    // 3rd place
  },
  metrics: {
    energy: { bg: '#ede9fe', border: '#e9d5ff', text: '#6b21a8' },
    robustness: { bg: '#fef3c7', border: '#fde68a', text: '#92400e' },
    structural: { bg: '#ccfbf1', border: '#5eead4', text: '#115e59' },
  }
};

// Blue/Indigo Scheme (Alternative 1)
export const colorSchemeBlue = {
  name: 'Blue/Indigo',
  primary: {
    main: '#2563eb',      // Blue
    light: '#3b82f6',      // Blue light
    dark: '#1e40af',       // Blue dark
    gradient: 'linear-gradient(135deg, #2563eb 0%, #6366f1 100%)',
  },
  accent: {
    amber: '#f59e0b',     // Highlights
    indigo: '#6366f1',   // Gradient accent
  },
  neutral: {
    bg: '#f8fafc',        // Page background
    card: '#f1f5f9',      // Card backgrounds
    border: '#cbd5e1',    // Borders
    textSecondary: '#64748b',  // Secondary text
    textPrimary: '#0f172a',    // Primary text
  },
  ranking: {
    gold: '#fbbf24',
    silver: '#94a3b8',
    bronze: '#fb923c',
  },
  metrics: {
    energy: { bg: '#eef2ff', border: '#c7d2fe', text: '#4338ca' },
    robustness: { bg: '#fef3c7', border: '#fde68a', text: '#92400e' },
    structural: { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af' },
  }
};

// Purple/Violet Scheme (Alternative 2)
export const colorSchemePurple = {
  name: 'Purple/Violet',
  primary: {
    main: '#7c3aed',      // Purple
    light: '#8b5cf6',     // Purple light
    dark: '#6d28d9',      // Purple dark
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
  },
  accent: {
    amber: '#f59e0b',
    violet: '#a855f7',    // Gradient accent
  },
  neutral: {
    bg: '#faf5ff',        // Page background (very light purple)
    card: '#f3e8ff',      // Card backgrounds
    border: '#e9d5ff',    // Borders
    textSecondary: '#6b21a8',  // Secondary text
    textPrimary: '#581c87',    // Primary text
  },
  ranking: {
    gold: '#fbbf24',
    silver: '#94a3b8',
    bronze: '#fb923c',
  },
  metrics: {
    energy: { bg: '#f3e8ff', border: '#e9d5ff', text: '#7c3aed' },
    robustness: { bg: '#fef3c7', border: '#fde68a', text: '#92400e' },
    structural: { bg: '#e9d5ff', border: '#c4b5fd', text: '#6d28d9' },
  }
};

// Green/Emerald Scheme (Alternative 3)
export const colorSchemeGreen = {
  name: 'Green/Emerald',
  primary: {
    main: '#059669',      // Emerald
    light: '#10b981',     // Emerald light
    dark: '#047857',      // Emerald dark
    gradient: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
  },
  accent: {
    amber: '#f59e0b',
    emerald: '#34d399',   // Gradient accent
  },
  neutral: {
    bg: '#f0fdf4',        // Page background (very light green)
    card: '#dcfce7',      // Card backgrounds
    border: '#bbf7d0',    // Borders
    textSecondary: '#166534',  // Secondary text
    textPrimary: '#14532d',     // Primary text
  },
  ranking: {
    gold: '#fbbf24',
    silver: '#94a3b8',
    bronze: '#fb923c',
  },
  metrics: {
    energy: { bg: '#d1fae5', border: '#a7f3d0', text: '#065f46' },
    robustness: { bg: '#fef3c7', border: '#fde68a', text: '#92400e' },
    structural: { bg: '#ccfbf1', border: '#5eead4', text: '#115e59' },
  }
};

// Default export (currently using Teal)
export default colorSchemeTeal;

