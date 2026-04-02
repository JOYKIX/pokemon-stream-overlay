// @ts-nocheck
import {
  getOverlayUrl,
  buildTeamPayload,
  fetchPokemonLocalized,
  fetchFrenchPokemonIndex,
  fetchPokemonLanguages,
  saveTeam,
  loadTeam,
  getProfile,
  updateProfileLanguage,
  DEFAULT_OVERLAY_STYLE,
  shouldUsePixelRendering,
  getNextEvolutionName
} from "./shared.js";
import { ensureAuthenticated, clearSession } from "./auth.js";
import { getCurrentLanguage, initPageI18n, loadTranslations, sanitizeLanguage, setCurrentLanguage, t } from "./i18n.js";

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
const showNuzlockeLabelInput = document.getElementById("showNuzlockeLabel");
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
const spriteScale = document.getElementById("spriteScale");
const pokemonNameLanguageInput = document.getElementById("pokemonNameLanguage");
const spriteScaleValue = document.getElementById("spriteScaleValue");
const snapToGridInput = document.getElementById("snapToGrid");
const autoSaveInput = document.getElementById("autoSave");

const saveBtn = document.getElementById("saveBtn");
const loadBtn = document.getElementById("loadBtn");
const clearBtn = document.getElementById("clearBtn");
const statusBox = document.getElementById("statusBox");
const overlayUrlInput = document.getElementById("overlayUrl");
const copyUrlBtn = document.getElementById("copyUrlBtn");
const openOverlayBtn = document.getElementById("openOverlayBtn");
const pokemonSuggestions = document.getElementById("pokemonSuggestions");
const toastStack = document.getElementById("toastStack");
const transitionToggle = document.getElementById("transitionToggle");
const exportObsBtn = document.getElementById("exportObsBtn");
const testOverlayBtn = document.getElementById("testOverlayBtn");
const autosaveIndicator = document.getElementById("autosaveIndicator");
const LOCAL_STORAGE_KEYS = {
  pokemonNameLanguage: "pokemonOverlayPokemonNameLanguage",
  autoSaveEnabled: "pokemonOverlayAutoSaveEnabled"
};

function resolvePokemonNameLanguage() {
  const selected = pokemonNameLanguageInput?.value || "auto";
  if (selected === "auto") return getCurrentLanguage();
  return selected;
}

function loadLocalPreferences() {
  if (pokemonNameLanguageInput) {
    const savedLanguage = localStorage.getItem(LOCAL_STORAGE_KEYS.pokemonNameLanguage);
    if (savedLanguage) {
      pokemonNameLanguageInput.value = savedLanguage;
    }
  }

  if (autoSaveInput) {
    autoSaveInput.checked = localStorage.getItem(LOCAL_STORAGE_KEYS.autoSaveEnabled) === "true";
  }
}

function savePokemonNameLanguagePreference() {
  if (!pokemonNameLanguageInput) return;
  localStorage.setItem(LOCAL_STORAGE_KEYS.pokemonNameLanguage, pokemonNameLanguageInput.value || "auto");
}

function saveAutoSavePreference() {
  if (!autoSaveInput) return;
  localStorage.setItem(LOCAL_STORAGE_KEYS.autoSaveEnabled, String(autoSaveInput.checked));
}

function getSuggestionLabel(entry, language) {
  if (language === "auto") {
    const uiLanguage = getCurrentLanguage();
    return uiLanguage === "fr"
      ? (entry.frenchName || entry.englishName || entry.apiName)
      : (entry.englishName || entry.frenchName || entry.apiName);
  }

  return entry.localizedNames?.[language] || entry.englishName || entry.frenchName || entry.apiName;
}

function renderPokemonNameLanguageOptions(languages = []) {
  if (!pokemonNameLanguageInput) return;
  const current = pokemonNameLanguageInput.value || "auto";
  const options = [
    `<option value="auto">${t("common.auto_ui_language")}</option>`,
    ...languages.map((language) => `<option value="${language.code}">${language.displayName} (${language.code})</option>`)
  ];
  pokemonNameLanguageInput.innerHTML = options.join("");

  const languageCodes = new Set(["auto", ...languages.map((language) => language.code)]);
  const savedLanguage = localStorage.getItem(LOCAL_STORAGE_KEYS.pokemonNameLanguage) || current;
  pokemonNameLanguageInput.value = languageCodes.has(savedLanguage) ? savedLanguage : "auto";
}

let slotPositions = defaultSlotPositions();
let slotScales = Array.from({ length: 6 }, () => 1);
const slotPreviewUpdaters = [];
let autoSaveTimer = null;

const teamViewButtons = document.querySelectorAll("[data-team-view-btn]");
const teamViewPanels = document.querySelectorAll("[data-team-panel]");
const leftViewButtons = document.querySelectorAll("[data-left-view-btn]");
const leftViewPanels = document.querySelectorAll("[data-left-panel]");

function bindSegmentSwitch(buttons, panels, buttonKey, panelKey) {
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const currentView = btn.dataset[buttonKey];
      buttons.forEach((candidate) => {
        const active = candidate.dataset[buttonKey] === currentView;
        candidate.classList.toggle("active", active);
        candidate.setAttribute("aria-selected", String(active));
      });
      panels.forEach((panel) => {
        panel.classList.toggle("active", panel.dataset[panelKey] === currentView);
      });
    });
  });
}

bindSegmentSwitch(teamViewButtons, teamViewPanels, "teamViewBtn", "teamPanel");
bindSegmentSwitch(leftViewButtons, leftViewPanels, "leftViewBtn", "leftPanel");

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

function isScarletVioletVariant() {
  return spriteVariant.value === "scarlet-violet";
}

function syncShinyAvailability() {
  const shinyAllowed = !isScarletVioletVariant();
  showShiny.disabled = !shinyAllowed;
  if (!shinyAllowed) {
    showShiny.checked = false;
  }

  for (let i = 0; i < 6; i++) {
    const shinyInput = document.getElementById(`shiny${i}`);
    if (!shinyInput) continue;
    shinyInput.disabled = !shinyAllowed;
    if (!shinyAllowed) {
      shinyInput.checked = false;
    }
  }
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
  wrapper.draggable = true;
  wrapper.dataset.slotIndex = String(index);
  wrapper.tabIndex = 0;
  wrapper.innerHTML = `
    <h3>${t("app.slot_title", { index: index + 1 })}</h3>
    <div class="slot-grid">
      <div class="preview-box" id="previewBox${index}"><div class="preview-placeholder">${t("app.preview")}</div></div>
      <div class="slot-fields">
        <input type="text" id="name${index}" placeholder="${t("app.pokemon_name_placeholder")}" list="pokemonSuggestions" autocomplete="off" />
        <input type="text" id="nickname${index}" placeholder="${t("app.nickname")}" />
        <div class="inline-fields">
          <input type="number" id="level${index}" placeholder="${t("app.level")}" min="1" max="100" />
          <input type="text" id="item${index}" placeholder="${t("app.item")}" />
        </div>
        <label class="switch-chip custom-check" for="shiny${index}">
          <span>Shiny</span><input type="checkbox" id="shiny${index}" /><span class="toggle-slider" aria-hidden="true"></span>
        </label>
        <div class="slot-tools">
          <button type="button" class="secondary-btn small evolution-btn" id="evolutionBtn${index}" disabled>${t("app.evolution")}</button>
          <div class="swap-controls">
            <label for="swapTarget${index}" class="visually-hidden">${t("app.swap_with_slot")}</label>
            <select id="swapTarget${index}" class="custom-select small">
              ${Array.from({ length: 6 }, (_, slot) => `<option value="${slot}" ${slot === index ? "selected" : ""}>Slot ${slot + 1}</option>`).join("")}
            </select>
            <button type="button" class="secondary-btn small" id="swapBtn${index}">${t("app.swap")}</button>
          </div>
          <button type="button" class="danger-btn small dead-btn" id="deadBtn${index}" style="display:none;">${t("app.dead")}</button>
        </div>
      </div>
    </div>
  `;
  teamSlots.appendChild(wrapper);
  wireSlotDnD(wrapper, index);

  const nameInput = wrapper.querySelector(`#name${index}`);
  const nicknameInput = wrapper.querySelector(`#nickname${index}`);
  const levelInput = wrapper.querySelector(`#level${index}`);
  const itemInput = wrapper.querySelector(`#item${index}`);
  const shinyInput = wrapper.querySelector(`#shiny${index}`);
  const evolutionBtn = wrapper.querySelector(`#evolutionBtn${index}`);
  const swapTarget = wrapper.querySelector(`#swapTarget${index}`);
  const swapBtn = wrapper.querySelector(`#swapBtn${index}`);
  const deadBtn = wrapper.querySelector(`#deadBtn${index}`);

  async function updatePreview() {
    const previewBox = wrapper.querySelector(`#previewBox${index}`);
    const name = nameInput.value.trim();
    if (!name) {
      previewBox.innerHTML = `<div class="preview-placeholder">${t("app.preview")}</div>`;
      evolutionBtn.disabled = true;
      return;
    }
    previewBox.innerHTML = `<div class="preview-placeholder">${t("common.loading")}</div>`;
    try {
      const pokemon = await fetchPokemonLocalized(name, shinyInput.checked, {
        variant: spriteVariant.value,
        animated: preferAnimatedSprite.checked,
        nameLanguage: resolvePokemonNameLanguage()
      });
      const nextEvolution = await getNextEvolutionName(name);
      evolutionBtn.disabled = !nextEvolution;
      evolutionBtn.dataset.nextEvolution = nextEvolution || "";
      const pixelSpriteClass = shouldUsePixelRendering(spriteVariant.value, preferAnimatedSprite.checked) ? " pixel-sprite-mode" : "";
      previewBox.innerHTML = `<div class="preview-content${pixelSpriteClass}"><img src="${pokemon.sprite}" alt="${pokemon.displayName}"><div class="preview-name-fr">${pokemon.displayName}</div></div>`;
    } catch {
      evolutionBtn.disabled = true;
      evolutionBtn.dataset.nextEvolution = "";
      previewBox.innerHTML = `<div class="preview-placeholder">${t("app.not_found")}</div>`;
    }
    deadBtn.style.display = nuzlockeModeInput.checked ? "inline-flex" : "none";
    renderEditorCanvas();
  }

  evolutionBtn.addEventListener("click", async () => {
    const nextEvolution = evolutionBtn.dataset.nextEvolution;
    if (!nextEvolution) return;
    nameInput.value = nextEvolution;
    await updatePreview();
    setStatus(t("app.status.evolved", { index: index + 1, pokemon: nextEvolution }), "success");
    queueAutoSave();
  });

  deadBtn.addEventListener("click", () => {
    if (!nuzlockeModeInput.checked) return;
    shiftSlotsLeftFrom(index);
    deathCountInput.value = String(Math.max(0, Number(deathCountInput.value) || 0) + 1);
    setStatus(t("app.status.removed", { index: index + 1 }), "success");
    queueAutoSave();
  });

  swapBtn.addEventListener("click", () => {
    const targetIndex = Number(swapTarget.value);
    if (Number.isNaN(targetIndex) || targetIndex === index) return;
    swapSlots(index, targetIndex);
    setStatus(t("app.status.swapped", { index: index + 1, target: targetIndex + 1 }), "success");
    queueAutoSave();
  });

  slotPreviewUpdaters[index] = updatePreview;

  nameInput.addEventListener("change", updatePreview);
  nameInput.addEventListener("input", () => {
    evolutionBtn.disabled = true;
    evolutionBtn.dataset.nextEvolution = "";
    renderEditorCanvas();
    queueAutoSave();
  });
  [nicknameInput, levelInput, itemInput].forEach((input) => {
    input.addEventListener("input", () => {
      renderEditorCanvas();
      queueAutoSave();
    });
  });
  shinyInput.addEventListener("change", () => {
    updatePreview();
    queueAutoSave();
  });
  nuzlockeModeInput.addEventListener("change", () => {
    deadBtn.style.display = nuzlockeModeInput.checked ? "inline-flex" : "none";
  });
}

function refreshSlotTranslations() {
  for (let index = 0; index < 6; index++) {
    const wrapper = teamSlots.querySelector(`[data-slot-index="${index}"]`);
    if (!wrapper) continue;

    const title = wrapper.querySelector("h3");
    if (title) title.textContent = t("app.slot_title", { index: index + 1 });

    const emptyPreview = wrapper.querySelector(".preview-placeholder");
    if (emptyPreview) emptyPreview.textContent = t("app.preview");

    const nicknameInput = wrapper.querySelector(`#nickname${index}`);
    const nameInput = wrapper.querySelector(`#name${index}`);
    if (nameInput) nameInput.placeholder = t("app.pokemon_name_placeholder");

    if (nicknameInput) nicknameInput.placeholder = t("app.nickname");

    const levelInput = wrapper.querySelector(`#level${index}`);
    if (levelInput) levelInput.placeholder = t("app.level");

    const itemInput = wrapper.querySelector(`#item${index}`);
    if (itemInput) itemInput.placeholder = t("app.item");

    const evolutionBtn = wrapper.querySelector(`#evolutionBtn${index}`);
    if (evolutionBtn) evolutionBtn.textContent = t("app.evolution");

    const swapLabel = wrapper.querySelector(`label[for="swapTarget${index}"]`);
    if (swapLabel) swapLabel.textContent = t("app.swap_with_slot");

    const swapBtn = wrapper.querySelector(`#swapBtn${index}`);
    if (swapBtn) swapBtn.textContent = t("app.swap");

    const deadBtn = wrapper.querySelector(`#deadBtn${index}`);
    if (deadBtn) deadBtn.textContent = t("app.dead");
  }
}

let dragSlotIndex = null;
function wireSlotDnD(wrapper, index) {
  wrapper.addEventListener("dragstart", () => {
    dragSlotIndex = index;
  });
  wrapper.addEventListener("dragover", (event) => event.preventDefault());
  wrapper.addEventListener("drop", (event) => {
    event.preventDefault();
    if (dragSlotIndex === null || dragSlotIndex === index) return;
    swapSlots(dragSlotIndex, index);
    refreshSlots(Math.min(dragSlotIndex, index));
    queueAutoSave();
    setStatus(t("app.status.reordered", { first: dragSlotIndex + 1, second: index + 1 }), "success");
    dragSlotIndex = null;
  });
}

function getSlotData(index) {
  return {
    name: document.getElementById(`name${index}`).value,
    nickname: document.getElementById(`nickname${index}`).value,
    level: document.getElementById(`level${index}`).value,
    item: document.getElementById(`item${index}`).value,
    shiny: document.getElementById(`shiny${index}`).checked
  };
}

function setSlotData(index, slot) {
  document.getElementById(`name${index}`).value = slot.name || "";
  document.getElementById(`nickname${index}`).value = slot.nickname || "";
  document.getElementById(`level${index}`).value = slot.level || "";
  document.getElementById(`item${index}`).value = slot.item || "";
  document.getElementById(`shiny${index}`).checked = Boolean(slot.shiny);
}

function refreshSlots(start = 0) {
  for (let i = start; i < 6; i++) {
    slotPreviewUpdaters[i]?.();
  }
  renderEditorCanvas();
}

function swapSlots(firstIndex, secondIndex) {
  const first = getSlotData(firstIndex);
  const second = getSlotData(secondIndex);
  setSlotData(firstIndex, second);
  setSlotData(secondIndex, first);
  refreshSlots(Math.min(firstIndex, secondIndex));
}

function shiftSlotsLeftFrom(startIndex) {
  for (let i = startIndex; i < 5; i++) {
    setSlotData(i, getSlotData(i + 1));
  }
  setSlotData(5, { name: "", nickname: "", level: "", item: "", shiny: false });
  refreshSlots(startIndex);
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
    shiny: isScarletVioletVariant() ? false : document.getElementById(`shiny${i}`).checked
  }));
}

function collectDisplayOptions() {
  return {
    showHeader: showHeader.checked,
    showName: showName.checked,
    showNickname: showNickname.checked,
    showLevel: showLevel.checked,
    showItem: showItem.checked,
    showShiny: isScarletVioletVariant() ? false : showShiny.checked,
    showTypes: showTypes.checked,
    spriteVariant: spriteVariant.value,
    preferAnimatedSprite: preferAnimatedSprite.checked,
    spriteOnlyMode: spriteOnlyMode.checked,
    spriteScale: Math.max(0.5, Math.min(10, (Number(spriteScale.value) || 100) / 100)),
    editorResolution: {
      width: Math.max(640, Number(streamWidth.value) || 1920),
      height: Math.max(360, Number(streamHeight.value) || 1080)
    },
    slotPositions,
    slotScales,
    showNuzlockeLabel: showNuzlockeLabelInput.checked,
    pokemonNameLanguage: pokemonNameLanguageInput?.value || "auto"
  };
}

function syncNuzlockeUi() {
  const enabled = nuzlockeModeInput.checked;
  deathCountField.style.display = enabled ? "grid" : "none";
  deathCountInput.disabled = !enabled;
  document.querySelectorAll(".dead-btn").forEach((button) => {
    button.style.display = enabled ? "inline-flex" : "none";
  });
  renderEditorCanvas();
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
  editorCanvas.classList.toggle("show-grid", Boolean(snapToGridInput?.checked));

  const slots = collectSlots();
  editorCanvas.innerHTML = "";
  const nuzlockeEnabled = nuzlockeModeInput.checked;

  slots.forEach((slot, index) => {
    const pos = slotPositions[index] || { x: 10, y: 10 };
    const token = document.createElement("button");
    token.type = "button";
    token.className = "canvas-token";
    token.dataset.index = String(index);
    token.style.left = `${pos.x}%`;
    token.style.top = `${pos.y}%`;
    token.innerHTML = `<strong>${slot.nickname || slot.name || t("slot_label", { index: index + 1 })}</strong><span>${slot.name ? t("app.drag_to_place") : t("app.add_pokemon")}</span>`;
    const scale = Math.max(0.6, Math.min(2, Number(slotScales[index]) || 1));
    token.style.width = `${Math.round((slot.name ? 170 : 150) * scale)}px`;
    enableDrag(token, index);
    enableScale(token, index);
    editorCanvas.appendChild(token);
  });

  if (nuzlockeEnabled) {
    const deathToken = document.createElement("button");
    deathToken.type = "button";
    deathToken.className = "canvas-token canvas-token-nuzlocke";
    deathToken.dataset.index = "nuzlocke";
    const nPos = slotPositions[6] || { x: 88, y: 12 };
    deathToken.style.left = `${nPos.x}%`;
    deathToken.style.top = `${nPos.y}%`;
    const nuzlockeLabel = showNuzlockeLabelInput.checked ? t("nuzlocke_mode") : t("death_counter");
    deathToken.innerHTML = `<strong>${nuzlockeLabel}</strong><span>${Math.max(0, Number(deathCountInput.value) || 0)} ${t("overlay.deaths").toLowerCase()}</span>`;
    enableDrag(deathToken, 6);
    editorCanvas.appendChild(deathToken);
  }
}

function enableScale(node, index) {
  node.addEventListener("wheel", (event) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    const current = Math.max(0.6, Math.min(2, Number(slotScales[index]) || 1));
    const delta = event.deltaY < 0 ? 0.05 : -0.05;
    slotScales[index] = Math.max(0.6, Math.min(2, Number((current + delta).toFixed(2))));
    renderEditorCanvas();
    queueAutoSave();
  }, { passive: false });
}

function enableDrag(node, index) {
  const onPointerMove = (event) => {
    const rect = editorCanvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(3, Math.min(97, x));
    const clampedY = Math.max(6, Math.min(94, y));
    const useSnap = snapToGridInput?.checked;
    const gridSize = 2;
    const finalX = useSnap ? Math.round(clampedX / gridSize) * gridSize : clampedX;
    const finalY = useSnap ? Math.round(clampedY / gridSize) * gridSize : clampedY;
    slotPositions[index] = { x: finalX, y: finalY };
    node.style.left = `${finalX}%`;
    node.style.top = `${finalY}%`;
  };

  const onPointerUp = () => {
    node.releasePointerCapture?.(pointerId);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    queueAutoSave();
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
  showNuzlockeLabelInput.checked = opts.showNuzlockeLabel ?? true;
  spriteVariant.value = opts.spriteVariant || "auto";
  preferAnimatedSprite.checked = Boolean(opts.preferAnimatedSprite);
  spriteOnlyMode.checked = Boolean(opts.spriteOnlyMode);
  const normalizedSpriteScale = Math.max(0.5, Math.min(10, Number(opts.spriteScale) || 1));
  if (pokemonNameLanguageInput) {
    const localPokemonLanguage = localStorage.getItem(LOCAL_STORAGE_KEYS.pokemonNameLanguage);
    pokemonNameLanguageInput.value = localPokemonLanguage || opts.pokemonNameLanguage || "auto";
  }
  spriteScale.value = String(Math.round(normalizedSpriteScale * 100));
  spriteScaleValue.textContent = `${Math.round(normalizedSpriteScale * 100)}%`;
  streamWidth.value = String(Math.max(640, Number(opts.editorResolution?.width) || 1920));
  streamHeight.value = String(Math.max(360, Number(opts.editorResolution?.height) || 1080));
  slotPositions = Array.isArray(opts.slotPositions) && opts.slotPositions.length >= 6
    ? opts.slotPositions.slice(0, 7).map((p, i) => ({ x: Number(p?.x) || (i === 6 ? 88 : 10), y: Number(p?.y) || (i === 6 ? 12 : 10) }))
    : [...defaultSlotPositions(), { x: 88, y: 12 }];
  slotScales = Array.isArray(opts.slotScales)
    ? opts.slotScales.slice(0, 6).map((value) => Math.max(0.6, Math.min(2, Number(value) || 1)))
    : Array.from({ length: 6 }, () => 1);

  syncNuzlockeUi();

  const slots = data?.slots || [];
  for (let i = 0; i < 6; i++) {
    const slot = slots[i] || {};
    document.getElementById(`name${i}`).value = slot.name || "";
    document.getElementById(`nickname${i}`).value = slot.nickname || "";
    document.getElementById(`level${i}`).value = slot.level || "";
    document.getElementById(`item${i}`).value = slot.item || "";
    document.getElementById(`shiny${i}`).checked = Boolean(slot.shiny);
    slotPreviewUpdaters[i]?.();
  }

  syncShinyAvailability();

  renderEditorCanvas();
}

async function saveCurrentTeam() {
  saveBtn.disabled = true;
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
    setStatus(t("common.status.saving"), "info");
    if (autosaveIndicator) autosaveIndicator.textContent = t("common.status.saving");
    await saveTeam(channel, payload);
    setStatus(t("app.status.team_saved"), "success");
    if (autosaveIndicator) autosaveIndicator.textContent = t("app.synced");
    updateOverlayLink();
  } catch (error) {
    console.error(error);
    setStatus(t("app.status.save_error"), "error");
  } finally {
    saveBtn.disabled = false;
  }
}

function queueAutoSave() {
  if (!autoSaveInput?.checked) return;
  if (autosaveIndicator) autosaveIndicator.textContent = t("app.queued");
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    saveCurrentTeam();
  }, 450);
}

async function loadPokemonSuggestions() {
  try {
    const entries = await fetchFrenchPokemonIndex();
    const language = pokemonNameLanguageInput?.value || "auto";
    pokemonSuggestions.innerHTML = entries
      .map((entry) => getSuggestionLabel(entry, language))
      .map((name) => `<option value="${name}"></option>`)
      .join("");
    setStatus(t("common.status.ready"), "info");
  } catch {
    setStatus(t("app.status.autocomplete_error"), "error");
  }
}

saveBtn.addEventListener("click", saveCurrentTeam);

loadBtn.addEventListener("click", async () => {
  await loadCurrentChannelTeam();
});

clearBtn.addEventListener("click", () => fillForm(null));
resetPositionsBtn.addEventListener("click", () => {
  slotPositions = [...defaultSlotPositions(), { x: 88, y: 12 }];
  slotScales = Array.from({ length: 6 }, () => 1);
  renderEditorCanvas();
  queueAutoSave();
});
nuzlockeModeInput.addEventListener("change", syncNuzlockeUi);
nuzlockeModeInput.addEventListener("change", queueAutoSave);
streamWidth.addEventListener("input", () => {
  renderEditorCanvas();
  queueAutoSave();
});
streamHeight.addEventListener("input", () => {
  renderEditorCanvas();
  queueAutoSave();
});
deathCountInput.addEventListener("input", () => {
  renderEditorCanvas();
  queueAutoSave();
});
showNuzlockeLabelInput.addEventListener("change", () => {
  renderEditorCanvas();
  queueAutoSave();
});
snapToGridInput?.addEventListener("change", () => {
  renderEditorCanvas();
  queueAutoSave();
});
spriteScale.addEventListener("input", () => {
  const value = Math.max(50, Math.min(1000, Number(spriteScale.value) || 100));
  spriteScaleValue.textContent = `${value}%`;
  renderEditorCanvas();
  queueAutoSave();
});
resolutionPreset.addEventListener("change", () => {
  applyResolutionPreset(resolutionPreset.value);
  renderEditorCanvas();
  queueAutoSave();
});

autoSaveInput?.addEventListener("change", () => {
  saveAutoSavePreference();
  if (autoSaveInput.checked) {
    setStatus(t("app.status.autosave_on"), "info");
    queueAutoSave();
    return;
  }
  clearTimeout(autoSaveTimer);
  setStatus(t("app.status.autosave_off"), "info");
});

[spriteVariant, preferAnimatedSprite, pokemonNameLanguageInput].filter(Boolean).forEach((input) => {
  input.addEventListener("change", () => {
    syncShinyAvailability();
    slotPreviewUpdaters.forEach((update) => update?.());
    if (input === pokemonNameLanguageInput) {
      savePokemonNameLanguagePreference();
      loadPokemonSuggestions();
    }
    queueAutoSave();
  });
});

[
  trainerInput,
  badgeInput,
  nuzlockeModeInput,
  showHeader,
  showName,
  showNickname,
  showLevel,
  showItem,
  showShiny,
  showTypes,
  showNuzlockeLabelInput,
  spriteOnlyMode
].forEach((input) => {
  const eventName = input.type === "checkbox" ? "change" : "input";
  input.addEventListener(eventName, queueAutoSave);
});

copyUrlBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(overlayUrlInput.value);
    setStatus(t("app.status.obs_url_copied"), "success");
  } catch {
    setStatus(t("app.status.obs_url_copy_error"), "error");
  }
});

transitionToggle?.addEventListener("change", () => {
  document.body.classList.toggle("reduced-transitions", !transitionToggle.checked);
  setStatus(t(transitionToggle.checked ? "app.status.transitions_on" : "app.status.transitions_off"), "info");
});

exportObsBtn?.addEventListener("click", () => {
  const obsConfig = {
    source: overlayUrlInput.value,
    width: Number(streamWidth.value) || 1920,
    height: Number(streamHeight.value) || 1080
  };
  navigator.clipboard.writeText(JSON.stringify(obsConfig, null, 2))
    .then(() => setStatus(t("app.status.obs_exported"), "success"))
    .catch(() => setStatus(t("app.status.obs_export_error"), "error"));
});

testOverlayBtn?.addEventListener("click", () => {
  window.open(openOverlayBtn.href, "_blank", "noopener");
  setStatus(t("app.status.overlay_preview_opened"), "info");
});

logoutBtn.addEventListener("click", () => {
  clearSession();
  window.location.href = "login.html";
});

async function init() {
  await initPageI18n();
  loadLocalPreferences();
  if (!teamSlots.childElementCount) {
    for (let i = 0; i < 6; i++) createSlot(i);
  }
  refreshSlotTranslations();

  const handleLanguageChange = async (event) => {
    await loadTranslations(event.detail?.language || getCurrentLanguage());
    refreshSlotTranslations();
    loadPokemonSuggestions();
    slotPreviewUpdaters.forEach((update) => update?.());
  };
  window.addEventListener("app-language-changed", handleLanguageChange);

  try {
    const languages = await fetchPokemonLanguages();
    renderPokemonNameLanguageOptions(languages);
  } catch {
    renderPokemonNameLanguageOptions([]);
  }
  const session = await ensureAuthenticated();
  if (!session) return;
  const profile = await getProfile(session.channel);
  if (profile?.uiLanguage) {
    setCurrentLanguage(sanitizeLanguage(profile.uiLanguage));
  }
  const persistLanguage = async (event) => {
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
  };
  window.addEventListener("app-language-changed", persistLanguage);

  channelInput.value = session.channel;
  updateOverlayLink();
  syncNuzlockeUi();
  if (spriteScaleValue) spriteScaleValue.textContent = `${Math.max(50, Math.min(1000, Number(spriteScale.value) || 100))}%`;
  syncShinyAvailability();
  renderEditorCanvas();
  await loadCurrentChannelTeam({ silentIfMissing: true });
  setStatus(t("app.status.pokeapi_loading"), "info");
  await loadPokemonSuggestions();
}

async function loadCurrentChannelTeam({ silentIfMissing = false } = {}) {
  const channel = channelInput.value.trim();
  if (!channel) {
    setStatus(t("app.status.missing_identifier"), "error");
    return;
  }

  try {
    setStatus(t("app.status.loading_db"), "info");
    const data = await loadTeam(channel);
    if (!data) {
      if (!silentIfMissing) {
        setStatus(t("app.status.no_team_found"), "error");
      }
      return;
    }
    fillForm(data);
    setStatus(t("app.status.team_loaded"), "success");
  } catch (error) {
    console.error(error);
    setStatus(t("app.status.team_load_error"), "error");
  }
}

init();
