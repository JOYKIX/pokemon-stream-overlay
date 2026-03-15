import {
  getOverlayUrl,
  buildTeamPayload,
  fetchPokemonLocalized,
  fetchFrenchPokemonIndex,
  saveTeam,
  loadTeam,
  DEFAULT_OVERLAY_STYLE
} from "./shared.js";
import { ensureAuthenticated, clearSession } from "./auth.js";

const teamSlots = document.getElementById("teamSlots");
const editorCanvas = document.getElementById("editorCanvas");
const streamWidth = document.getElementById("streamWidth");
const streamHeight = document.getElementById("streamHeight");
const resolutionPreset = document.getElementById("resolutionPreset");
const resetPositionsBtn = document.getElementById("resetPositionsBtn");

const channelInput = document.getElementById("channelInput");
const trainerInput = document.getElementById("trainerInput");
const badgeInput = document.getElementById("badgeInput");
const nuzlockeModeInput = document.getElementById("nuzlockeMode");
const deathCountInput = document.getElementById("deathCountInput");
const deathCountField = document.getElementById("deathCountField");
const logoutBtn = document.getElementById("logoutBtn");

const showHeader = document.getElementById("showHeader");
const showName = document.getElementById("showName");
const showNickname = document.getElementById("showNickname");
const showLevel = document.getElementById("showLevel");
const showItem = document.getElementById("showItem");
const showShiny = document.getElementById("showShiny");
const showTypes = document.getElementById("showTypes");
const spriteVariant = document.getElementById("spriteVariant");
const preferAnimatedSprite = document.getElementById("preferAnimatedSprite");
const spriteOnlyMode = document.getElementById("spriteOnlyMode");
const spriteHeightPx = document.getElementById("spriteHeightPx");
const spriteGapPx = document.getElementById("spriteGapPx");

const saveBtn = document.getElementById("saveBtn");
const loadBtn = document.getElementById("loadBtn");
const clearBtn = document.getElementById("clearBtn");
const statusBox = document.getElementById("statusBox");
const overlayUrlInput = document.getElementById("overlayUrl");
const copyUrlBtn = document.getElementById("copyUrlBtn");
const openOverlayBtn = document.getElementById("openOverlayBtn");
const pokemonSuggestions = document.getElementById("pokemonSuggestions");

let slotPositions = defaultSlotPositions();

function setStatus(message, type = "info") {
  statusBox.textContent = message;
  statusBox.className = `status-box ${type}`;
}

function defaultSlotPositions() {
  return Array.from({ length: 6 }, (_, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    return { x: 8 + col * 31, y: 18 + row * 38 };
  });
}

function createSlot(index) {
  const wrapper = document.createElement("article");
  wrapper.className = "slot-card";
  wrapper.innerHTML = `
    <h3>Pokémon ${index + 1}</h3>
    <div class="slot-grid">
      <div class="preview-box" id="previewBox${index}"><div class="preview-placeholder">Aperçu</div></div>
      <div class="slot-fields">
        <input type="text" id="name${index}" placeholder="Nom Pokémon FR ou ID" list="pokemonSuggestions" autocomplete="off" />
        <input type="text" id="nickname${index}" placeholder="Surnom" />
        <div class="inline-fields">
          <input type="number" id="level${index}" placeholder="Niveau" min="1" max="100" />
          <input type="text" id="item${index}" placeholder="Objet" />
        </div>
        <label class="checkbox-chip custom-check" for="shiny${index}">
          <input type="checkbox" id="shiny${index}" /><span>Shiny</span>
        </label>
      </div>
    </div>
  `;
  teamSlots.appendChild(wrapper);

  const nameInput = wrapper.querySelector(`#name${index}`);
  const shinyInput = wrapper.querySelector(`#shiny${index}`);

  async function updatePreview() {
    const previewBox = wrapper.querySelector(`#previewBox${index}`);
    const name = nameInput.value.trim();
    if (!name) {
      previewBox.innerHTML = '<div class="preview-placeholder">Aperçu</div>';
      return;
    }
    previewBox.innerHTML = '<div class="preview-placeholder">Chargement...</div>';
    try {
      const pokemon = await fetchPokemonLocalized(name, shinyInput.checked, {
        variant: spriteVariant.value,
        animated: preferAnimatedSprite.checked
      });
      previewBox.innerHTML = `<div class="preview-content"><img src="${pokemon.sprite}" alt="${pokemon.displayName}"><div class="preview-name-fr">${pokemon.displayName}</div></div>`;
    } catch {
      previewBox.innerHTML = '<div class="preview-placeholder">Introuvable</div>';
    }
    renderEditorCanvas();
  }

  nameInput.addEventListener("change", updatePreview);
  nameInput.addEventListener("input", renderEditorCanvas);
  shinyInput.addEventListener("change", updatePreview);
}

function updateOverlayLink() {
  const channel = channelInput.value.trim() || "joykix";
  const url = getOverlayUrl(channel);
  overlayUrlInput.value = url;
  openOverlayBtn.href = url;
}

function collectSlots() {
  return Array.from({ length: 6 }, (_, i) => ({
    name: document.getElementById(`name${i}`).value,
    nickname: document.getElementById(`nickname${i}`).value,
    level: document.getElementById(`level${i}`).value,
    item: document.getElementById(`item${i}`).value,
    shiny: document.getElementById(`shiny${i}`).checked
  }));
}

function collectDisplayOptions() {
  return {
    showHeader: showHeader.checked,
    showName: showName.checked,
    showNickname: showNickname.checked,
    showLevel: showLevel.checked,
    showItem: showItem.checked,
    showShiny: showShiny.checked,
    showTypes: showTypes.checked,
    spriteVariant: spriteVariant.value,
    preferAnimatedSprite: preferAnimatedSprite.checked,
    spriteOnlyMode: spriteOnlyMode.checked,
    spriteHeightPx: Math.max(48, Number(spriteHeightPx.value) || 170),
    spriteGapPx: Math.max(0, Number(spriteGapPx.value) || 12),
    editorResolution: {
      width: Math.max(640, Number(streamWidth.value) || 1920),
      height: Math.max(360, Number(streamHeight.value) || 1080)
    },
    slotPositions
  };
}

function syncNuzlockeUi() {
  const enabled = nuzlockeModeInput.checked;
  deathCountField.style.display = enabled ? "grid" : "none";
  deathCountInput.disabled = !enabled;
}

function applyResolutionPreset(value) {
  if (value === "custom") return;
  const [w, h] = value.split("x").map(Number);
  if (!w || !h) return;
  streamWidth.value = String(w);
  streamHeight.value = String(h);
}

function renderEditorCanvas() {
  const width = Math.max(640, Number(streamWidth.value) || 1920);
  const height = Math.max(360, Number(streamHeight.value) || 1080);
  editorCanvas.style.aspectRatio = `${width} / ${height}`;

  const slots = collectSlots();
  editorCanvas.innerHTML = "";
  slots.forEach((slot, index) => {
    const pos = slotPositions[index] || { x: 10, y: 10 };
    const token = document.createElement("button");
    token.type = "button";
    token.className = "canvas-token";
    token.dataset.index = String(index);
    token.style.left = `${pos.x}%`;
    token.style.top = `${pos.y}%`;
    token.innerHTML = `<strong>${slot.nickname || slot.name || `Slot ${index + 1}`}</strong><span>${slot.name ? "Glisser pour placer" : "Ajoute un Pokémon"}</span>`;
    enableDrag(token, index);
    editorCanvas.appendChild(token);
  });
}

function enableDrag(node, index) {
  const onPointerMove = (event) => {
    const rect = editorCanvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(3, Math.min(97, x));
    const clampedY = Math.max(6, Math.min(94, y));
    slotPositions[index] = { x: clampedX, y: clampedY };
    node.style.left = `${clampedX}%`;
    node.style.top = `${clampedY}%`;
  };

  const onPointerUp = () => {
    node.releasePointerCapture?.(pointerId);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  };

  let pointerId = null;
  node.addEventListener("pointerdown", (event) => {
    pointerId = event.pointerId;
    node.setPointerCapture?.(pointerId);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  });
}

function fillForm(data) {
  trainerInput.value = data?.trainerName || "";
  badgeInput.value = data?.badgeText || "";
  nuzlockeModeInput.checked = Boolean(data?.nuzlockeMode);
  deathCountInput.value = Number(data?.deathCount) || 0;

  const opts = data?.displayOptions || {};
  showHeader.checked = opts.showHeader ?? true;
  showName.checked = opts.showName ?? true;
  showNickname.checked = opts.showNickname ?? true;
  showLevel.checked = opts.showLevel ?? true;
  showItem.checked = opts.showItem ?? true;
  showShiny.checked = opts.showShiny ?? true;
  showTypes.checked = opts.showTypes ?? true;
  spriteVariant.value = opts.spriteVariant || "auto";
  preferAnimatedSprite.checked = Boolean(opts.preferAnimatedSprite);
  spriteOnlyMode.checked = Boolean(opts.spriteOnlyMode);
  spriteHeightPx.value = String(Math.max(48, Number(opts.spriteHeightPx) || 170));
  spriteGapPx.value = String(Math.max(0, Number(opts.spriteGapPx) || 12));
  streamWidth.value = String(Math.max(640, Number(opts.editorResolution?.width) || 1920));
  streamHeight.value = String(Math.max(360, Number(opts.editorResolution?.height) || 1080));
  slotPositions = Array.isArray(opts.slotPositions) && opts.slotPositions.length === 6
    ? opts.slotPositions.map((p) => ({ x: Number(p?.x) || 10, y: Number(p?.y) || 10 }))
    : defaultSlotPositions();

  syncNuzlockeUi();

  const slots = data?.slots || [];
  for (let i = 0; i < 6; i++) {
    const slot = slots[i] || {};
    document.getElementById(`name${i}`).value = slot.name || "";
    document.getElementById(`nickname${i}`).value = slot.nickname || "";
    document.getElementById(`level${i}`).value = slot.level || "";
    document.getElementById(`item${i}`).value = slot.item || "";
    document.getElementById(`shiny${i}`).checked = Boolean(slot.shiny);
  }

  renderEditorCanvas();
}

async function loadPokemonSuggestions() {
  try {
    const entries = await fetchFrenchPokemonIndex();
    pokemonSuggestions.innerHTML = entries.map((entry) => `<option value="${entry.frenchName}"></option>`).join("");
    setStatus("Prêt.", "info");
  } catch {
    setStatus("Impossible de charger l’autocomplétion PokéAPI.", "error");
  }
}

for (let i = 0; i < 6; i++) createSlot(i);

saveBtn.addEventListener("click", async () => {
  const channel = channelInput.value.trim();

  let overlayStyle = DEFAULT_OVERLAY_STYLE;
  try {
    const existing = await loadTeam(channel);
    overlayStyle = existing?.overlayStyle || DEFAULT_OVERLAY_STYLE;
  } catch {
    overlayStyle = DEFAULT_OVERLAY_STYLE;
  }

  const payload = buildTeamPayload({
    trainerName: trainerInput.value,
    badgeText: badgeInput.value,
    nuzlockeMode: nuzlockeModeInput.checked,
    deathCount: deathCountInput.value,
    slots: collectSlots(),
    displayOptions: collectDisplayOptions(),
    overlayStyle
  });

  try {
    setStatus("Sauvegarde en cours...", "info");
    await saveTeam(channel, payload);
    setStatus("Team sauvegardée. L'overlay OBS est synchronisé.", "success");
    updateOverlayLink();
  } catch (error) {
    console.error(error);
    setStatus("Erreur lors de la sauvegarde Firebase.", "error");
  }
});

loadBtn.addEventListener("click", async () => {
  const channel = channelInput.value.trim();
  try {
    setStatus("Chargement...", "info");
    const data = await loadTeam(channel);
    if (!data) {
      setStatus("Aucune team trouvée pour cet identifiant.", "error");
      return;
    }
    fillForm(data);
    setStatus("Team chargée.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Impossible de charger la team.", "error");
  }
});

clearBtn.addEventListener("click", () => fillForm(null));
resetPositionsBtn.addEventListener("click", () => {
  slotPositions = defaultSlotPositions();
  renderEditorCanvas();
});
nuzlockeModeInput.addEventListener("change", syncNuzlockeUi);
streamWidth.addEventListener("input", renderEditorCanvas);
streamHeight.addEventListener("input", renderEditorCanvas);
resolutionPreset.addEventListener("change", () => {
  applyResolutionPreset(resolutionPreset.value);
  renderEditorCanvas();
});

copyUrlBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(overlayUrlInput.value);
    setStatus("URL OBS copiée.", "success");
  } catch {
    setStatus("Impossible de copier l’URL.", "error");
  }
});

logoutBtn.addEventListener("click", () => {
  clearSession();
  window.location.href = "login.html";
});

async function init() {
  const session = await ensureAuthenticated();
  if (!session) return;
  channelInput.value = session.channel;
  updateOverlayLink();
  syncNuzlockeUi();
  renderEditorCanvas();
  setStatus("Chargement PokéAPI...", "info");
  await loadPokemonSuggestions();
}

init();
