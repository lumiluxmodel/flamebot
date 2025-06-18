// apps/app/public/theme-init.js
// This script runs before React hydration to prevent flash of unstyled content
(function() {
  try {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (error) {
    // Default to dark theme if localStorage is not available
    console.error('Error initializing theme:', error);
    document.documentElement.classList.add('dark');
  }
})();
