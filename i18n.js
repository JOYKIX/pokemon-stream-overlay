const UI_LANG_KEY = "pokemonOverlayUiLang";

export function getCurrentLanguage() {
  const saved = localStorage.getItem(UI_LANG_KEY);
  return saved === "fr" ? "fr" : "en";
}

export function setCurrentLanguage(language) {
  const next = language === "fr" ? "fr" : "en";
  localStorage.setItem(UI_LANG_KEY, next);
  document.documentElement.lang = next;
  window.dispatchEvent(new CustomEvent("app-language-changed", { detail: { language: next } }));
  return next;
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
