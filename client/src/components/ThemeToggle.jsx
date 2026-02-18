import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="p-1.5 md:p-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
            {theme === 'light' ? (
                <Moon size={16} className="text-slate-700 md:w-[20px] md:h-[20px]" />
            ) : (
                <Sun size={16} className="text-yellow-400 md:w-[20px] md:h-[20px]" />
            )}
        </button>
    );
};

export default ThemeToggle;
