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

function setStatus(message, type = "info") {
  statusBox.textContent = message;
  statusBox.className = `status-box ${type}`;
}

function createSlot(index) {
  const wrapper = document.createElement("article");
  wrapper.className = "slot-card";
  wrapper.innerHTML = `
    <h3>Pokémon ${index + 1}</h3>
    <div class="slot-grid">
      <div class="preview-box" id="previewBox${index}">
        <div class="preview-placeholder">Aperçu</div>
      </div>
      <div class="slot-fields">
        <input type="text" id="name${index}" placeholder="Nom du Pokémon en français" />
        <input type="text" id="nickname${index}" placeholder="Surnom" />
        <div class="inline-fields">
          <input type="number" id="level${index}" placeholder="Niveau" min="1" max="100" />
          <input type="text" id="item${index}" placeholder="Objet" />
        </div>
        <label class="checkbox-row">
          <input type="checkbox" id="shiny${index}" />
          <span>Shiny</span>
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
      previewBox.innerHTML = `<div class="preview-placeholder">Aperçu</div>`;
      return;
    }

    previewBox.innerHTML = `<div class="preview-placeholder">Chargement...</div>`;

    try {
      const pokemon = await fetchPokemonLocalized(name, shiny);
      previewBox.innerHTML = `
        <div class="preview-content">
          <img src="${pokemon.sprite}" alt="${pokemon.frenchName}">
          <div class="preview-name-fr">${pokemon.frenchName}</div>
        </div>
      `;
    } catch {
      previewBox.innerHTML = `<div class="preview-placeholder">Introuvable</div>`;
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
}

saveBtn.addEventListener("click", async () => {
  const channel = channelInput.value.trim();
  if (!channel) {
    setStatus("Tu dois entrer un identifiant.", "error");
    return;
  }

  const payload = buildTeamPayload({
    trainerName: trainerInput.value,
    badgeText: badgeInput.value,
    nuzlockeMode: nuzlockeModeInput.checked,
    deathCount: deathCountInput.value,
    slots: collectSlots(),
    displayOptions: collectDisplayOptions()
  });

  try {
    setStatus("Sauvegarde en cours...", "info");
    await saveTeam(channel, payload);
    setStatus("Team sauvegardée. OBS devrait se mettre à jour.", "success");
    updateOverlayLink();
  } catch (error) {
    console.error(error);
    setStatus("Erreur lors de la sauvegarde Firebase.", "error");
  }
});

loadBtn.addEventListener("click", async () => {
  const channel = channelInput.value.trim();
  if (!channel) {
    setStatus("Tu dois entrer un identifiant.", "error");
    return;
  }

  try {
    setStatus("Chargement...", "info");
    const data = await loadTeam(channel);
    if (!data) {
      setStatus("Aucune team trouvée.", "error");
      return;
    }
    fillForm(data);
    setStatus("Team chargée.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Impossible de charger la team.", "error");
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
  setStatus("Formulaire vidé.", "info");
});

copyUrlBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(overlayUrlInput.value);
    setStatus("URL OBS copiée.", "success");
  } catch {
    setStatus("Impossible de copier l’URL.", "error");
  }
});

channelInput.addEventListener("input", updateOverlayLink);
updateOverlayLink();
