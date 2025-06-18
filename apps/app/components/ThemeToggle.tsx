// components/ThemeToggle.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { ClientOnlyIcon } from './common';

const ThemeToggle = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check for saved theme preference or default to dark
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-4 right-4 z-50 p-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all duration-300 group"
      aria-label="Toggle theme"
    >
      <ClientOnlyIcon>
        {theme === 'light' ? (
          <Moon className="w-5 h-5 text-zinc-700 dark:text-zinc-300 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors" />
        ) : (
          <Sun className="w-5 h-5 text-zinc-700 dark:text-zinc-300 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors" />
        )}
      </ClientOnlyIcon>
    </button>
  );
};

export default ThemeToggle;
