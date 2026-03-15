import {
  getChannelFromUrl,
  subscribeToTeam,
  fetchPokemonData
} from "./shared.js";

const overlayTrainer = document.getElementById("overlayTrainer");
const overlayBadge = document.getElementById("overlayBadge");
const overlayTeam = document.getElementById("overlayTeam");

function renderEmptyCard(index) {
  return `
    <div class="overlay-empty">
      <div>
        <div class="overlay-slot-label">Slot ${index + 1}</div>
        <div>Vide</div>
      </div>
    </div>
  `;
}

async function renderTeam(data) {
  if (!data) {
    overlayTrainer.textContent = "Aucune team";
    overlayBadge.textContent = "En attente de données";
    overlayTeam.innerHTML = Array.from({ length: 6 }, (_, i) => renderEmptyCard(i)).join("");
    return;
  }

  overlayTrainer.textContent = data.trainerName || "Dresseur";
  overlayBadge.textContent = data.badgeText || "Pokémon Team";

  const slots = data.slots || [];
  overlayTeam.innerHTML = "";

  for (let i = 0; i < 6; i++) {
    const slot = slots[i];

    if (!slot?.name) {
      overlayTeam.insertAdjacentHTML("beforeend", renderEmptyCard(i));
      continue;
    }

    let pokemon = null;
    try {
      pokemon = await fetchPokemonData(slot.name, slot.shiny);
    } catch {
      pokemon = null;
    }

    const sprite = pokemon?.sprite || "";
    const levelText = slot.level ? `Lv.${slot.level}` : "";
    const shinyPill = slot.shiny ? `<span class="meta-pill shiny">Shiny</span>` : "";
    const itemPill = slot.item ? `<span class="meta-pill item">${slot.item}</span>` : "";

    overlayTeam.insertAdjacentHTML(
      "beforeend",
      `
      <div class="overlay-card">
        <div class="overlay-card-top">
          <div class="overlay-slot-label">Slot ${i + 1}</div>
          <div class="overlay-level">${levelText}</div>
        </div>

        <div class="overlay-image-wrap">
          ${sprite ? `<img src="${sprite}" alt="${slot.name}">` : ""}
        </div>

        <div class="overlay-name">${slot.name}</div>

        <div class="overlay-meta">
          ${shinyPill}
          ${itemPill}
        </div>
      </div>
      `
    );
  }
}

const channel = getChannelFromUrl("joykix");
subscribeToTeam(channel, (data) => {
  renderTeam(data);
});
