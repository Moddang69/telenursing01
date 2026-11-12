import React, { createContext, useContext, useState, useEffect } from 'react';

const AccessibilityContext = createContext(null);

const FONT_SIZE_OPTIONS = Object.freeze({ SMALL: 'small', MEDIUM: 'medium', LARGE: 'large' });
const THEME_OPTIONS = Object.freeze({ LIGHT: 'light', DARK: 'dark' });
const STORAGE_KEY = 'telenursing_accessibility_prefs';

export function AccessibilityProvider({ children }) {
  const [fontSize, setFontSize] = useState(FONT_SIZE_OPTIONS.MEDIUM);
  const [theme, setTheme] = useState(THEME_OPTIONS.LIGHT);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (saved.fontSize) setFontSize(saved.fontSize);
      if (saved.theme) setTheme(saved.theme);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ fontSize, theme }));
  }, [fontSize, theme]);

  const value = { fontSize, setFontSize, theme, setTheme, FONT_SIZE_OPTIONS, THEME_OPTIONS };
  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider');
  return ctx;
}