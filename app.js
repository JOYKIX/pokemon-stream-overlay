import {
  getOverlayUrl,
  buildTeamPayload,
  fetchPokemonData,
  saveTeam,
  loadTeam
} from "./shared.js";

const teamSlots = document.getElementById("teamSlots");
const channelInput = document.getElementById("channelInput");
const trainerInput = document.getElementById("trainerInput");
const badgeInput = document.getElementById("badgeInput");
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
        <input type="text" id="name${index}" placeholder="Nom du Pokémon" />
        <input type="number" id="level${index}" placeholder="Niveau" min="1" max="100" />
        <input type="text" id="item${index}" placeholder="Objet (optionnel)" />
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
      const pokemon = await fetchPokemonData(name, shiny);
      if (!pokemon?.sprite) {
        previewBox.innerHTML = `<div class="preview-placeholder">Pas d’image</div>`;
        return;
      }

      previewBox.innerHTML = `<img src="${pokemon.sprite}" alt="${name}">`;
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
      level: document.getElementById(`level${i}`).value,
      item: document.getElementById(`item${i}`).value,
      shiny: document.getElementById(`shiny${i}`).checked
    });
  }
  return slots;
}

function fillForm(data) {
  trainerInput.value = data?.trainerName || "";
  badgeInput.value = data?.badgeText || "";

  const slots = data?.slots || [];
  for (let i = 0; i < 6; i++) {
    const slot = slots[i] || {};
    document.getElementById(`name${i}`).value = slot.name || "";
    document.getElementById(`level${i}`).value = slot.level || "";
    document.getElementById(`item${i}`).value = slot.item || "";
    document.getElementById(`shiny${i}`).checked = Boolean(slot.shiny);
    document.getElementById(`name${i}`).dispatchEvent(new Event("change"));
  }
}

saveBtn.addEventListener("click", async () => {
  const channel = channelInput.value.trim();
  if (!channel) {
    setStatus("Tu dois entrer un identifiant de canal.", "error");
    return;
  }

  const payload = buildTeamPayload({
    trainerName: trainerInput.value,
    badgeText: badgeInput.value,
    slots: collectSlots()
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
    setStatus("Tu dois entrer un identifiant de canal.", "error");
    return;
  }

  try {
    setStatus("Chargement depuis Firebase...", "info");
    const data = await loadTeam(channel);
    if (!data) {
      setStatus("Aucune team trouvée pour ce canal.", "error");
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
  for (let i = 0; i < 6; i++) {
    document.getElementById(`name${i}`).value = "";
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
