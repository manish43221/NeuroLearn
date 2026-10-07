import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('nl_theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('nl_theme', dark ? 'dark' : 'light');
  }, [dark]);

  return <ThemeContext.Provider value={{ dark, toggle: () => setDark((d) => !d) }}>{children}</ThemeContext.Provider>;
}
