export const THEME_STORAGE_KEY = "prooflab.theme";

export type ThemeChoice = "light" | "dark";

export function parseStoredTheme(value: string | null): ThemeChoice {
  return value === "light" ? "light" : "dark";
}

export const themeBootScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t!=="light"&&t!=="dark")t="dark";var el=document.documentElement;el.classList.remove("light","dark");el.classList.add(t);}catch(e){document.documentElement.classList.add("dark");}})();`;

const THEME_EVENT = "prooflab-theme";

export function subscribeTheme(onStoreChange: () => void): () => void {
  window.addEventListener(THEME_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function readTheme(): ThemeChoice {
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

export function applyTheme(theme: ThemeChoice): void {
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  window.dispatchEvent(new Event(THEME_EVENT));
}
