export type ThemePreference = 'system' | 'dark' | 'light';

const THEME_PREFERENCE_KEY = 'fachee_theme_preference';

export function getThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_PREFERENCE_KEY);
    return value === 'dark' || value === 'light' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function saveThemePreference(preference: ThemePreference): void {
  localStorage.setItem(THEME_PREFERENCE_KEY, preference);
}

export function applyThemePreference(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): void {
  document.documentElement.dataset.theme =
    preference === 'system' ? (systemPrefersDark ? 'dark' : 'light') : preference;
}
