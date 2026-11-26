import {useEffect} from 'react';
import type {ThemeMode} from '../types/finance';

const LIGHT_THEME_COLOR = '#F7FAF9';
const DARK_THEME_COLOR = '#0F1514';

export function useThemeEffect(theme: ThemeMode): void {
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const shouldBeDark = theme === 'dark' || (theme === 'system' && mediaQuery.matches);
      document.documentElement.classList.toggle('dark', shouldBeDark);
      const color = shouldBeDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
      let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]#dynamic-theme-color');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.id = 'dynamic-theme-color';
        document.head.appendChild(meta);
      }
      meta.content = color;
    };

    applyTheme();

    const handleChange = () => {
      if (theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);
}
