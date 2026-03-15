import {
  getOverlayUrl,
  buildTeamPayload,
  fetchPokemonLocalized,
  saveTeam,
  loadTeam
} from "./shared.js";

const teamSlots = document.getElementById("teamSlots");
const channelInput = document.getElementById("channelInput");
const trainerInput = document.getElementById("trainerInput");
const badgeInput = document.getElementById("badgeInput");
const pokemonLanguageInput = document.getElementById("pokemonLanguage");
const siteLanguageInput = document.getElementById("siteLanguage");
const nuzlockeModeInput = document.getElementById("nuzlockeMode");
const deathCountInput = document.getElementById("deathCountInput");

const showHeader = document.getElementById("showHeader");
const showName = document.getElementById("showName");
const showNickname = document.getElementById("showNickname");
const showLevel = document.getElementById("showLevel");
const showItem = document.getElementById("showItem");
const showShiny = document.getElementById("showShiny");
const showTypes = document.getElementById("showTypes");

const saveBtn = document.getElementById("saveBtn");
const loadBtn = document.getElementById("loadBtn");
const clearBtn = document.getElementById("clearBtn");
const statusBox = document.getElementById("statusBox");
const overlayUrlInput = document.getElementById("overlayUrl");
const copyUrlBtn = document.getElementById("copyUrlBtn");
const openOverlayBtn = document.getElementById("openOverlayBtn");

const TRANSLATIONS = {
  en: {
    obsManager: "OBS Manager",
    openOverlay: "Open overlay",
    configuration: "Configuration",
    configDescription: "Everything is grouped here for quick edits.",
    identifier: "Identifier",
    identifierHelp: "Use this same identifier in your OBS URL.",
    trainerName: "Trainer name",
    secondaryText: "Secondary text",
    pokemonLanguage: "Pokémon display language",
    pokemonLanguageHelp: "Names and types shown in overlay will use this language when available.",
    siteLanguage: "Site language",
    siteLanguageHelp: "Automatically translates the manager UI.",
    runMode: "Run mode",
    enableNuzlocke: "Enable Nuzlocke mode",
    deathCounter: "Death counter",
    visibleElements: "Visible elements",
    header: "Header",
    name: "Name",
    nickname: "Nickname",
    level: "Level",
    item: "Item",
    shinyBadge: "Shiny badge",
    types: "Types",
    overlayUrl: "Overlay URL",
    copyUrl: "Copy URL",
    testOverlay: "Test overlay",
    pokemonTeam: "Pokémon Team",
    teamHelp: "Enter Pokémon English names or Pokédex IDs.",
    saveTeam: "Save team",
    reload: "Reload",
    clear: "Clear",
    ready: "Ready.",
    slot: "Pokémon",
    preview: "Preview",
    loading: "Loading...",
    notFound: "Not found",
    pokemonInput: "Pokémon name in English or ID",
    shiny: "Shiny",
    statusReady: "Ready.",
    needIdentifier: "You must enter an identifier.",
    saving: "Saving...",
    saved: "Team saved. OBS should update now.",
    saveError: "Error while saving to Firebase.",
    loadingTeam: "Loading...",
    noTeam: "No team found.",
    teamLoaded: "Team loaded.",
    loadError: "Unable to load team.",
    cleared: "Form cleared.",
    copied: "OBS URL copied.",
    copyError: "Unable to copy URL."
  },
  fr: {
    obsManager: "Gestionnaire OBS",
    openOverlay: "Ouvrir l’overlay",
    configuration: "Configuration",
    configDescription: "Tout est regroupé ici pour éditer rapidement.",
    identifier: "Identifiant",
    identifierHelp: "Utilise le même identifiant dans l’URL OBS.",
    trainerName: "Nom du dresseur",
    secondaryText: "Texte secondaire",
    pokemonLanguage: "Langue d’affichage Pokémon",
    pokemonLanguageHelp: "Les noms et types de l’overlay utiliseront cette langue si disponible.",
    siteLanguage: "Langue du site",
    siteLanguageHelp: "Traduit automatiquement l’interface de gestion.",
    runMode: "Mode de run",
    enableNuzlocke: "Activer le mode Nuzlocke",
    deathCounter: "Compteur de morts",
    visibleElements: "Éléments visibles",
    header: "Header",
    name: "Nom",
    nickname: "Surnom",
    level: "Niveau",
    item: "Objet",
    shinyBadge: "Badge shiny",
    types: "Types",
    overlayUrl: "URL overlay",
    copyUrl: "Copier l’URL",
    testOverlay: "Tester l’overlay",
    pokemonTeam: "Équipe Pokémon",
    teamHelp: "Saisis les noms Pokémon en anglais ou leur ID Pokédex.",
    saveTeam: "Sauvegarder la team",
    reload: "Recharger",
    clear: "Vider",
    ready: "Prêt.",
    slot: "Pokémon",
    preview: "Aperçu",
    loading: "Chargement...",
    notFound: "Introuvable",
    pokemonInput: "Nom anglais du Pokémon ou ID",
    shiny: "Shiny",
    statusReady: "Prêt.",
    needIdentifier: "Tu dois entrer un identifiant.",
    saving: "Sauvegarde en cours...",
    saved: "Team sauvegardée. OBS devrait se mettre à jour.",
    saveError: "Erreur lors de la sauvegarde Firebase.",
    loadingTeam: "Chargement...",
    noTeam: "Aucune team trouvée.",
    teamLoaded: "Team chargée.",
    loadError: "Impossible de charger la team.",
    cleared: "Formulaire vidé.",
    copied: "URL OBS copiée.",
    copyError: "Impossible de copier l’URL."
  }
};

function t(key) {
  const lang = siteLanguageInput.value || "en";
  return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
}

function applySiteLanguage() {
  document.documentElement.lang = siteLanguageInput.value || "en";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    const value = t(key);
    if (value) el.textContent = value;
  });
  statusBox.textContent = t("statusReady");

  for (let i = 0; i < 6; i++) {
    const nameInput = document.getElementById(`name${i}`);
    const nicknameInput = document.getElementById(`nickname${i}`);
    const levelInput = document.getElementById(`level${i}`);
    const itemInput = document.getElementById(`item${i}`);
    const shinyLabel = document.querySelector(`label[for='shiny${i}'] span`);

    if (nameInput) nameInput.placeholder = t("pokemonInput");
    if (nicknameInput) nicknameInput.placeholder = t("nickname");
    if (levelInput) levelInput.placeholder = t("level");
    if (itemInput) itemInput.placeholder = t("item");
    if (shinyLabel) shinyLabel.textContent = t("shiny");
  }
}

function setStatus(message, type = "info") {
  statusBox.textContent = message;
  statusBox.className = `status-box ${type}`;
}

function createSlot(index) {
  const wrapper = document.createElement("article");
  wrapper.className = "slot-card";
  wrapper.innerHTML = `
    <h3>${t("slot")} ${index + 1}</h3>
    <div class="slot-grid">
      <div class="preview-box" id="previewBox${index}">
        <div class="preview-placeholder">${t("preview")}</div>
      </div>
      <div class="slot-fields">
        <input type="text" id="name${index}" placeholder="${t("pokemonInput")}" />
        <input type="text" id="nickname${index}" placeholder="${t("nickname")}" />
        <div class="inline-fields">
          <input type="number" id="level${index}" placeholder="${t("level")}" min="1" max="100" />
          <input type="text" id="item${index}" placeholder="${t("item")}" />
        </div>
        <label class="checkbox-row" for="shiny${index}">
          <input type="checkbox" id="shiny${index}" />
          <span>${t("shiny")}</span>
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
    const shiny = shinyInput.checked;

    if (!name) {
      previewBox.innerHTML = `<div class="preview-placeholder">${t("preview")}</div>`;
      return;
    }

    previewBox.innerHTML = `<div class="preview-placeholder">${t("loading")}</div>`;

    try {
      const pokemon = await fetchPokemonLocalized(name, shiny, pokemonLanguageInput.value);
      previewBox.innerHTML = `
        <div class="preview-content">
          <img src="${pokemon.sprite}" alt="${pokemon.displayName}">
          <div class="preview-name-fr">${pokemon.displayName}</div>
        </div>
      `;
    } catch {
      previewBox.innerHTML = `<div class="preview-placeholder">${t("notFound")}</div>`;
    }
  }

  nameInput.addEventListener("change", updatePreview);
  shinyInput.addEventListener("change", updatePreview);
}

for (let i = 0; i < 6; i++) {
  createSlot(i);
}

function updateOverlayLink() {
  const channel = channelInput.value.trim() || "joykix";
  const url = getOverlayUrl(channel);
  overlayUrlInput.value = url;
  openOverlayBtn.href = url;
}

function collectSlots() {
  const slots = [];
  for (let i = 0; i < 6; i++) {
    slots.push({
      name: document.getElementById(`name${i}`).value,
      nickname: document.getElementById(`nickname${i}`).value,
      level: document.getElementById(`level${i}`).value,
      item: document.getElementById(`item${i}`).value,
      shiny: document.getElementById(`shiny${i}`).checked
    });
  }
  return slots;
}

function collectDisplayOptions() {
  return {
    showHeader: showHeader.checked,
    showName: showName.checked,
    showNickname: showNickname.checked,
    showLevel: showLevel.checked,
    showItem: showItem.checked,
    showShiny: showShiny.checked,
    showTypes: showTypes.checked
  };
}

function fillForm(data) {
  trainerInput.value = data?.trainerName || "";
  badgeInput.value = data?.badgeText || "";
  pokemonLanguageInput.value = data?.pokemonLanguage || "en";
  siteLanguageInput.value = data?.siteLanguage || "en";
  nuzlockeModeInput.checked = Boolean(data?.nuzlockeMode);
  deathCountInput.value = Number(data?.deathCount) || 0;

  const opts = data?.displayOptions || {};
  showHeader.checked = opts.showHeader ?? true;
  showName.checked = opts.showName ?? true;
  showNickname.checked = opts.showNickname ?? true;
  showLevel.checked = opts.showLevel ?? true;
  showItem.checked = opts.showItem ?? true;
  showShiny.checked = opts.showShiny ?? true;
  showTypes.checked = opts.showTypes ?? false;

  const slots = data?.slots || [];
  for (let i = 0; i < 6; i++) {
    const slot = slots[i] || {};
    document.getElementById(`name${i}`).value = slot.name || "";
    document.getElementById(`nickname${i}`).value = slot.nickname || "";
    document.getElementById(`level${i}`).value = slot.level || "";
    document.getElementById(`item${i}`).value = slot.item || "";
    document.getElementById(`shiny${i}`).checked = Boolean(slot.shiny);
    document.getElementById(`name${i}`).dispatchEvent(new Event("change"));
  }

  applySiteLanguage();
}

saveBtn.addEventListener("click", async () => {
  const channel = channelInput.value.trim();
  if (!channel) {
    setStatus(t("needIdentifier"), "error");
    return;
  }

  const payload = buildTeamPayload({
    trainerName: trainerInput.value,
    badgeText: badgeInput.value,
    pokemonLanguage: pokemonLanguageInput.value,
    siteLanguage: siteLanguageInput.value,
    nuzlockeMode: nuzlockeModeInput.checked,
    deathCount: deathCountInput.value,
    slots: collectSlots(),
    displayOptions: collectDisplayOptions()
  });

  try {
    setStatus(t("saving"), "info");
    await saveTeam(channel, payload);
    setStatus(t("saved"), "success");
    updateOverlayLink();
  } catch (error) {
    console.error(error);
    setStatus(t("saveError"), "error");
  }
});

loadBtn.addEventListener("click", async () => {
  const channel = channelInput.value.trim();
  if (!channel) {
    setStatus(t("needIdentifier"), "error");
    return;
  }

  try {
    setStatus(t("loadingTeam"), "info");
    const data = await loadTeam(channel);
    if (!data) {
      setStatus(t("noTeam"), "error");
      return;
    }
    fillForm(data);
    setStatus(t("teamLoaded"), "success");
  } catch (error) {
    console.error(error);
    setStatus(t("loadError"), "error");
  }
});

clearBtn.addEventListener("click", () => {
  trainerInput.value = "";
  badgeInput.value = "";
  nuzlockeModeInput.checked = false;
  deathCountInput.value = 0;
  showHeader.checked = true;
  showName.checked = true;
  showNickname.checked = true;
  showLevel.checked = true;
  showItem.checked = true;
  showShiny.checked = true;
  showTypes.checked = false;

  for (let i = 0; i < 6; i++) {
    document.getElementById(`name${i}`).value = "";
    document.getElementById(`nickname${i}`).value = "";
    document.getElementById(`level${i}`).value = "";
    document.getElementById(`item${i}`).value = "";
    document.getElementById(`shiny${i}`).checked = false;
    document.getElementById(`name${i}`).dispatchEvent(new Event("change"));
  }
  setStatus(t("cleared"), "info");
});

copyUrlBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(overlayUrlInput.value);
    setStatus(t("copied"), "success");
  } catch {
    setStatus(t("copyError"), "error");
  }
});

siteLanguageInput.addEventListener("change", applySiteLanguage);
pokemonLanguageInput.addEventListener("change", () => {
  for (let i = 0; i < 6; i++) {
    document.getElementById(`name${i}`).dispatchEvent(new Event("change"));
  }
});
channelInput.addEventListener("input", updateOverlayLink);

applySiteLanguage();
updateOverlayLink();
