import {
  loadTeam,
  saveTeam,
  DEFAULT_OVERLAY_STYLE,
  buildTeamPayload,
  getOverlayUrl
} from "./shared.js";
import { initPageI18n, t } from "./i18n.js";
import { ensureAuthenticated, clearSession } from "./auth.js";

const channelInput = document.getElementById("channelInput");
const transparentBackground = document.getElementById("transparentBackground");
const backgroundColor = document.getElementById("backgroundColor");
const backgroundOpacity = document.getElementById("backgroundOpacity");
const backgroundImageInput = document.getElementById("backgroundImageInput");
const clearBackgroundImageBtn = document.getElementById("clearBackgroundImageBtn");
const textColor = document.getElementById("textColor");
const accentColor = document.getElementById("accentColor");
const cardColor = document.getElementById("cardColor");
const cardOpacity = document.getElementById("cardOpacity");
const borderRadius = document.getElementById("borderRadius");
const loadBtn = document.getElementById("loadBtn");
const saveBtn = document.getElementById("saveBtn");
const statusBox = document.getElementById("statusBox");
const stylePreview = document.getElementById("stylePreview");
const logoutBtn = document.getElementById("logoutBtn");
const themePreset = document.getElementById("themePreset");
const fontSelector = document.getElementById("fontSelector");
const exportThemeBtn = document.getElementById("exportThemeBtn");
const toastStack = document.getElementById("toastStack");
let backgroundImageData = "";

function setStatus(message, type = "info") {
  statusBox.textContent = message;
  statusBox.className = `status-box ${type}`;
  pushToast(message, type);
}

function pushToast(message, type = "info") {
  if (!toastStack) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastStack.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

function collectStyle() {
  return {
    transparentBackground: transparentBackground.checked,
    backgroundColor: backgroundColor.value,
    backgroundOpacity: Number(backgroundOpacity.value),
    backgroundImage: backgroundImageData,
    textColor: textColor.value,
    accentColor: accentColor.value,
    cardColor: cardColor.value,
    cardOpacity: Number(cardOpacity.value),
    borderRadius: Number(borderRadius.value),
    fontFamily: fontSelector?.value || "Inter"
  };
}

function applyStylePreview(style) {
  const merged = { ...DEFAULT_OVERLAY_STYLE, ...style };
  stylePreview.style.setProperty("--designer-bg", merged.backgroundColor);
  stylePreview.style.setProperty("--designer-bg-opacity", String(merged.backgroundOpacity));
  stylePreview.style.setProperty("--designer-bg-image", merged.backgroundImage ? `url("${merged.backgroundImage}")` : "none");
  stylePreview.style.setProperty("--designer-text", merged.textColor);
  stylePreview.style.setProperty("--designer-accent", merged.accentColor);
  stylePreview.style.setProperty("--designer-card", merged.cardColor);
  stylePreview.style.setProperty("--designer-card-opacity", String(merged.cardOpacity));
  stylePreview.style.setProperty("--designer-radius", `${merged.borderRadius}px`);
  stylePreview.style.fontFamily = merged.fontFamily || "Inter, sans-serif";
  stylePreview.classList.toggle("is-transparent", merged.transparentBackground);
}

function applyPreset(preset) {
  const presets = {
    dark: { backgroundColor: "#0f172a", cardColor: "#1e293b", accentColor: "#6366f1", textColor: "#f1f5f9" },
    "pokemon-red": { backgroundColor: "#3b0a0a", cardColor: "#7f1d1d", accentColor: "#ef4444", textColor: "#fee2e2" },
    "pokemon-blue": { backgroundColor: "#0b1f44", cardColor: "#1d4ed8", accentColor: "#60a5fa", textColor: "#dbeafe" },
    neon: { backgroundColor: "#0b1022", cardColor: "#111827", accentColor: "#22d3ee", textColor: "#e0f2fe" }
  };
  const theme = presets[preset];
  if (!theme) return;
  backgroundColor.value = theme.backgroundColor;
  cardColor.value = theme.cardColor;
  accentColor.value = theme.accentColor;
  textColor.value = theme.textColor;
  applyStylePreview(collectStyle());
  setStatus(t("customize.status.preset_applied", { preset }), "success");
}

function fillForm(style) {
  const merged = { ...DEFAULT_OVERLAY_STYLE, ...(style || {}) };
  transparentBackground.checked = merged.transparentBackground;
  backgroundColor.value = merged.backgroundColor;
  backgroundOpacity.value = String(merged.backgroundOpacity);
  backgroundImageData = typeof merged.backgroundImage === "string" ? merged.backgroundImage : "";
  backgroundImageInput.value = "";
  textColor.value = merged.textColor;
  accentColor.value = merged.accentColor;
  cardColor.value = merged.cardColor;
  cardOpacity.value = String(merged.cardOpacity);
  borderRadius.value = String(merged.borderRadius);
  applyStylePreview(merged);
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(t("customize.status.read_image_error")));
    reader.readAsDataURL(file);
  });
}

async function onBackgroundImageChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (file.type !== "image/png") {
    setStatus(`${t("customize.status.only_png")}`, "error");
    backgroundImageInput.value = "";
    return;
  }

  try {
    backgroundImageData = await fileToDataUrl(file);
    applyStylePreview(collectStyle());
    setStatus(`${t("customize.status.background_loaded")}`, "success");
  } catch (error) {
    console.error(error);
    setStatus(`${t("customize.status.background_load_error")}`, "error");
  }
}

function clearBackgroundImage() {
  backgroundImageData = "";
  backgroundImageInput.value = "";
  applyStylePreview(collectStyle());
  setStatus(`${t("customize.status.background_removed")}`, "info");
}

async function saveStyle() {
  const channel = channelInput.value.trim();
  try {
    setStatus(t("common.status.saving"), "info");
    const existing = await loadTeam(channel);
    const style = collectStyle();

    const payload = existing
      ? { ...existing, overlayStyle: { ...DEFAULT_OVERLAY_STYLE, ...existing.overlayStyle, ...style }, updatedAt: Date.now() }
      : buildTeamPayload({
        trainerName: `${t("common.default_trainer")}`,
        badgeText: `${t("common.default_badge")}`,
        nuzlockeMode: false,
        deathCount: 0,
        slots: Array.from({ length: 6 }, () => ({ name: "", nickname: "", level: "", item: "", shiny: false })),
        displayOptions: { showHeader: true, showName: true, showNickname: true, showLevel: true, showItem: true, showShiny: true, showTypes: true, spriteVariant: "auto", preferAnimatedSprite: false, spriteOnlyMode: false, spriteHeightPx: 170, spriteGapPx: 12, overlayOrientation: "horizontal", overlayWidthPx: 1600 },
        overlayStyle: style
      });

    await saveTeam(channel, payload);
    setStatus(t("customize.status.design_saved", { url: getOverlayUrl(channel) }), "success");
  } catch (error) {
    console.error(error);
    setStatus(`${t("customize.status.design_save_error")}`, "error");
  }
}

async function loadStyle() {
  const channel = channelInput.value.trim();
  try {
    setStatus(`${t("customize.status.loading_style")}`, "info");
    const existing = await loadTeam(channel);
    fillForm(existing?.overlayStyle || DEFAULT_OVERLAY_STYLE);
    setStatus(existing ? `${t("customize.status.style_loaded")}` : `${t("customize.status.default_style_loaded")}`, "success");
  } catch (error) {
    console.error(error);
    setStatus(`${t("customize.status.style_load_error")}`, "error");
  }
}

[transparentBackground, backgroundColor, backgroundOpacity, textColor, accentColor, cardColor, cardOpacity, borderRadius]
  .forEach((input) => input.addEventListener("input", () => applyStylePreview(collectStyle())));
backgroundImageInput.addEventListener("change", onBackgroundImageChange);
clearBackgroundImageBtn.addEventListener("click", clearBackgroundImage);
themePreset?.addEventListener("change", () => applyPreset(themePreset.value));
fontSelector?.addEventListener("change", () => applyStylePreview(collectStyle()));

exportThemeBtn?.addEventListener("click", () => {
  const payload = JSON.stringify(collectStyle(), null, 2);
  navigator.clipboard.writeText(payload)
    .then(() => setStatus(`${t("customize.status.theme_copied")}`, "success"))
    .catch(() => setStatus(`${t("customize.status.theme_export_error")}`, "error"));
});

saveBtn.addEventListener("click", saveStyle);
loadBtn.addEventListener("click", loadStyle);
logoutBtn.addEventListener("click", () => {
  clearSession();
  window.location.href = "login.html";
});

async function init() {
  await initPageI18n();
  const session = await ensureAuthenticated();
  if (!session) return;
  channelInput.value = session.channel;
  await loadStyle();
}

init();
