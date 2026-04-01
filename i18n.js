const UI_LANG_KEY = "pokemonOverlayUiLang";
const SUPPORTED_UI_LANGUAGES = new Set(["en", "fr", "es", "ja"]);

let translations = {};
let loadedLanguage = null;

function normalizeLanguage(language) {
  return SUPPORTED_UI_LANGUAGES.has(language) ? language : "en";
}

export function sanitizeLanguage(language) {
  return normalizeLanguage(language);
}

export function getCurrentLanguage() {
  const saved = localStorage.getItem(UI_LANG_KEY);
  return normalizeLanguage(saved);
}

export function setCurrentLanguage(language) {
  const next = normalizeLanguage(language);
  localStorage.setItem(UI_LANG_KEY, next);
  document.documentElement.lang = next;
  window.dispatchEvent(new CustomEvent("app-language-changed", { detail: { language: next } }));
  return next;
}

export async function loadTranslations(language = getCurrentLanguage()) {
  const next = normalizeLanguage(language);
  if (loadedLanguage === next && Object.keys(translations).length) return translations;

  const fallbackResponse = await fetch("./lang/en.json");
  if (!fallbackResponse.ok) {
    throw new Error("Unable to load fallback translation file for en");
  }

  const fallbackTranslations = await fallbackResponse.json();
  if (next === "en") {
    translations = fallbackTranslations;
    loadedLanguage = next;
    return translations;
  }

  const response = await fetch(`./lang/${next}.json`);
  if (!response.ok) {
    translations = fallbackTranslations;
    loadedLanguage = "en";
    return translations;
  }

  translations = { ...fallbackTranslations, ...(await response.json()) };
  loadedLanguage = next;
  return translations;
}

export function t(key, vars = {}) {
  let value = translations[key] ?? key;
  Object.entries(vars).forEach(([varKey, varValue]) => {
    value = value.replaceAll(`{${varKey}}`, String(varValue));
  });
  return value;
}

export function applyTranslations(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });

  root.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
  });

  root.querySelectorAll("[data-i18n-title]").forEach((element) => {
    element.setAttribute("title", t(element.dataset.i18nTitle));
  });
}

export function initLanguageSelector(selectorId = "languageSelect") {
  const select = document.getElementById(selectorId);
  const current = getCurrentLanguage();
  document.documentElement.lang = current;
  if (!select) return current;

  select.value = current;
  select.addEventListener("change", () => {
    setCurrentLanguage(select.value);
  });

  window.addEventListener("app-language-changed", (event) => {
    const value = event.detail?.language || getCurrentLanguage();
    if (select.value !== value) {
      select.value = value;
    }
  });

  return current;
}

export async function initPageI18n(selectorId = "languageSelect") {
  const language = initLanguageSelector(selectorId);
  await loadTranslations(language);
  applyTranslations();

  window.addEventListener("app-language-changed", async (event) => {
    await loadTranslations(event.detail?.language || getCurrentLanguage());
    applyTranslations();
  });

  return language;
}
