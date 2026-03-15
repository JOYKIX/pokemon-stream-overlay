import {
  loadTeam,
  saveTeam,
  DEFAULT_OVERLAY_STYLE,
  buildTeamPayload,
  getOverlayUrl
} from "./shared.js";
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
let backgroundImageData = "";

function setStatus(message, type = "info") {
  statusBox.textContent = message;
  statusBox.className = `status-box ${type}`;
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
    borderRadius: Number(borderRadius.value)
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
  stylePreview.classList.toggle("is-transparent", merged.transparentBackground);
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
    reader.onerror = () => reject(new Error("Impossible de lire l'image."));
    reader.readAsDataURL(file);
  });
}

async function onBackgroundImageChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (file.type !== "image/png") {
    setStatus("Seuls les fichiers .png sont acceptés pour le fond.", "error");
    backgroundImageInput.value = "";
    return;
  }

  try {
    backgroundImageData = await fileToDataUrl(file);
    applyStylePreview(collectStyle());
    setStatus("Image de fond chargée. Pense à sauvegarder le design.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Impossible de charger l'image de fond.", "error");
  }
}

function clearBackgroundImage() {
  backgroundImageData = "";
  backgroundImageInput.value = "";
  applyStylePreview(collectStyle());
  setStatus("Image de fond retirée. Pense à sauvegarder le design.", "info");
}

async function saveStyle() {
  const channel = channelInput.value.trim();
  try {
    setStatus("Sauvegarde en cours...", "info");
    const existing = await loadTeam(channel);
    const style = collectStyle();

    const payload = existing
      ? { ...existing, overlayStyle: { ...DEFAULT_OVERLAY_STYLE, ...existing.overlayStyle, ...style }, updatedAt: Date.now() }
      : buildTeamPayload({
        trainerName: "Dresseur",
        badgeText: "Équipe Pokémon",
        nuzlockeMode: false,
        deathCount: 0,
        slots: Array.from({ length: 6 }, () => ({ name: "", nickname: "", level: "", item: "", shiny: false })),
        displayOptions: { showHeader: true, showName: true, showNickname: true, showLevel: true, showItem: true, showShiny: true, showTypes: true, spriteVariant: "auto", preferAnimatedSprite: false, spriteOnlyMode: false, spriteHeightPx: 170, spriteGapPx: 12, overlayOrientation: "horizontal", overlayWidthPx: 1600 },
        overlayStyle: style
      });

    await saveTeam(channel, payload);
    setStatus(`Design sauvegardé. URL: ${getOverlayUrl(channel)}`, "success");
  } catch (error) {
    console.error(error);
    setStatus("Erreur pendant la sauvegarde du design.", "error");
  }
}

async function loadStyle() {
  const channel = channelInput.value.trim();
  try {
    setStatus("Chargement du style...", "info");
    const existing = await loadTeam(channel);
    fillForm(existing?.overlayStyle || DEFAULT_OVERLAY_STYLE);
    setStatus(existing ? "Style chargé." : "Style par défaut chargé.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Impossible de charger le style.", "error");
  }
}

[transparentBackground, backgroundColor, backgroundOpacity, textColor, accentColor, cardColor, cardOpacity, borderRadius]
  .forEach((input) => input.addEventListener("input", () => applyStylePreview(collectStyle())));
backgroundImageInput.addEventListener("change", onBackgroundImageChange);
clearBackgroundImageBtn.addEventListener("click", clearBackgroundImage);

saveBtn.addEventListener("click", saveStyle);
loadBtn.addEventListener("click", loadStyle);
logoutBtn.addEventListener("click", () => {
  clearSession();
  window.location.href = "login.html";
});

async function init() {
  const session = await ensureAuthenticated();
  if (!session) return;
  channelInput.value = session.channel;
  await loadStyle();
}

init();
