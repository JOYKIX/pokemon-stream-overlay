import { loadTeam, saveTeam, getProfile, updateProfileLanguage } from "./shared.js";
import { getCurrentLanguage, initPageI18n, sanitizeLanguage, setCurrentLanguage } from "./i18n.js";
import { ensureAuthenticated, clearSession } from "./auth.js";

const channelInput = document.getElementById("channelInput");
const layoutCanvas = document.getElementById("layoutCanvas");
const resetLayoutBtn = document.getElementById("resetLayoutBtn");
const loadBtn = document.getElementById("loadBtn");
const saveBtn = document.getElementById("saveBtn");
const statusBox = document.getElementById("statusBox");
const layoutPreview = document.getElementById("layoutPreview");
const logoutBtn = document.getElementById("logoutBtn");
const toastStack = document.getElementById("toastStack");

const DEFAULT_LAYOUT = {
  pokeball: { x: 0, y: 0 },
  sprite: { x: 0, y: 0 },
  types: { x: 0, y: 0 }
};

const state = {
  layout: structuredClone(DEFAULT_LAYOUT),
  dragKey: null
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sanitizeLayout(layout) {
  const source = layout || {};
  const sanitizePoint = (point) => ({
    x: clamp(Number(point?.x) || 0, -120, 120),
    y: clamp(Number(point?.y) || 0, -120, 120)
  });

  return {
    pokeball: sanitizePoint(source.pokeball),
    sprite: sanitizePoint(source.sprite),
    types: sanitizePoint(source.types)
  };
}

function setStatus(message, type = "info") {
  statusBox.textContent = message;
  statusBox.className = `status-box ${type}`;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastStack?.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

function updatePreview() {
  const { pokeball, sprite, types } = state.layout;
  layoutPreview.style.setProperty("--layout-pokeball-x", `${pokeball.x}px`);
  layoutPreview.style.setProperty("--layout-pokeball-y", `${pokeball.y}px`);
  layoutPreview.style.setProperty("--layout-sprite-x", `${sprite.x}px`);
  layoutPreview.style.setProperty("--layout-sprite-y", `${sprite.y}px`);
  layoutPreview.style.setProperty("--layout-types-x", `${types.x}px`);
  layoutPreview.style.setProperty("--layout-types-y", `${types.y}px`);
}

function renderCanvas() {
  layoutCanvas.innerHTML = "";
  const center = document.createElement("div");
  center.className = "layout-canvas-center";
  layoutCanvas.appendChild(center);

  [
    ["pokeball", "Pokéball"],
    ["sprite", "Sprite"],
    ["types", "Types"]
  ].forEach(([key, label]) => {
    const node = document.createElement("button");
    node.type = "button";
    node.className = `layout-handle ${key}`;
    node.dataset.key = key;
    node.textContent = label;
    node.style.left = `calc(50% + ${state.layout[key].x}px)`;
    node.style.top = `calc(50% + ${state.layout[key].y}px)`;
    layoutCanvas.appendChild(node);
  });
}

function applyLayout(nextLayout) {
  state.layout = sanitizeLayout(nextLayout);
  renderCanvas();
  updatePreview();
}

layoutCanvas.addEventListener("pointerdown", (event) => {
  const handle = event.target.closest(".layout-handle");
  if (!handle) return;
  state.dragKey = handle.dataset.key;
  handle.setPointerCapture(event.pointerId);
});

layoutCanvas.addEventListener("pointermove", (event) => {
  if (!state.dragKey) return;
  const rect = layoutCanvas.getBoundingClientRect();
  const x = clamp(event.clientX - rect.left - rect.width / 2, -120, 120);
  const y = clamp(event.clientY - rect.top - rect.height / 2, -120, 120);
  state.layout[state.dragKey] = { x: Math.round(x), y: Math.round(y) };
  renderCanvas();
  updatePreview();
});

layoutCanvas.addEventListener("pointerup", () => {
  state.dragKey = null;
});
layoutCanvas.addEventListener("pointerleave", () => {
  state.dragKey = null;
});

resetLayoutBtn?.addEventListener("click", () => {
  applyLayout(DEFAULT_LAYOUT);
  setStatus("Disposition réinitialisée", "success");
});

async function loadLayout() {
  try {
    const existing = await loadTeam(channelInput.value.trim());
    applyLayout(existing?.displayOptions?.cardLayout || DEFAULT_LAYOUT);
    setStatus("Disposition chargée", "success");
  } catch (error) {
    console.error(error);
    setStatus("Erreur pendant le chargement", "error");
  }
}

async function saveLayout() {
  try {
    const channel = channelInput.value.trim();
    const existing = await loadTeam(channel);
    if (!existing) {
      setStatus("Aucune équipe existante à modifier", "error");
      return;
    }

    const payload = {
      ...existing,
      updatedAt: Date.now(),
      displayOptions: {
        ...(existing.displayOptions || {}),
        cardLayout: sanitizeLayout(state.layout)
      }
    };

    await saveTeam(channel, payload);
    setStatus("Disposition sauvegardée", "success");
  } catch (error) {
    console.error(error);
    setStatus("Erreur pendant la sauvegarde", "error");
  }
}

loadBtn?.addEventListener("click", loadLayout);
saveBtn?.addEventListener("click", saveLayout);
logoutBtn?.addEventListener("click", () => {
  clearSession();
  window.location.href = "login.html";
});

async function init() {
  await initPageI18n();
  const session = await ensureAuthenticated();
  if (!session) return;
  const profile = await getProfile(session.channel);
  if (profile?.uiLanguage) {
    setCurrentLanguage(sanitizeLanguage(profile.uiLanguage));
  }
  window.addEventListener("app-language-changed", async (event) => {
    try {
      await updateProfileLanguage(
        session.channel,
        session.editKeyHash,
        sanitizeLanguage(event.detail?.language || getCurrentLanguage()),
        { preHashed: true }
      );
    } catch (error) {
      console.error("Failed to save profile language", error);
    }
  });
  channelInput.value = session.channel;
  applyLayout(DEFAULT_LAYOUT);
  await loadLayout();
}

init();
