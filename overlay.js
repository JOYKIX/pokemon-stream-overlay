import {
  getChannelFromUrl,
  subscribeToTeam,
  fetchPokemonLocalized,
  translateType
} from "./shared.js";

const overlayRoot = document.getElementById("overlayRoot");
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
    overlayRoot.classList.remove("hide-header");
    overlayTrainer.textContent = "Aucune team";
    overlayBadge.textContent = "En attente de données";
    overlayTeam.innerHTML = Array.from({ length: 6 }, (_, i) => renderEmptyCard(i)).join("");
    return;
  }

  const options = {
    showHeader: data.displayOptions?.showHeader ?? true,
    showName: data.displayOptions?.showName ?? true,
    showNickname: data.displayOptions?.showNickname ?? true,
    showLevel: data.displayOptions?.showLevel ?? true,
    showItem: data.displayOptions?.showItem ?? true,
    showShiny: data.displayOptions?.showShiny ?? true,
    showTypes: data.displayOptions?.showTypes ?? false
  };

  overlayRoot.classList.toggle("hide-header", !options.showHeader);
  overlayTrainer.textContent = data.trainerName || "Dresseur";
  overlayBadge.textContent = data.badgeText || "Pokémon Team";
  overlayTeam.innerHTML = "";

  const slots = data.slots || [];

  for (let i = 0; i < 6; i++) {
    const slot = slots[i];

    if (!slot?.name) {
      overlayTeam.insertAdjacentHTML("beforeend", renderEmptyCard(i));
      continue;
    }

    let pokemon = null;
    try {
      pokemon = await fetchPokemonLocalized(slot.name, slot.shiny);
    } catch {
      pokemon = null;
    }

    const sprite = pokemon?.sprite || pokemon?.artwork || "";
    const nickname = slot.nickname?.trim();
    const hasNickname = Boolean(nickname);

    const nameHtml = options.showName
      ? `
          <div class="overlay-name-wrap">
            ${options.showNickname && hasNickname ? `<div class="overlay-name">${nickname}</div>` : ""}
            <div class="overlay-species ${!options.showNickname || !hasNickname ? "is-primary" : ""}">${pokemon?.frenchName || slot.name}</div>
          </div>
        `
      : "";

    const levelHtml = options.showLevel && slot.level
      ? `<div class="overlay-level">Lv.${slot.level}</div>`
      : "";

    const shinyHtml = options.showShiny && slot.shiny
      ? `<span class="meta-pill shiny">Shiny</span>`
      : "";

    const itemHtml = options.showItem && slot.item
      ? `<span class="meta-pill item">${slot.item}</span>`
      : "";

    const typesHtml = options.showTypes && pokemon?.types?.length
      ? `<div class="overlay-types">
          ${pokemon.types.map(type => `<span class="type-pill">${translateType(type)}</span>`).join("")}
        </div>`
      : "";

    overlayTeam.insertAdjacentHTML(
      "beforeend",
      `
      <div class="overlay-card">
        <div class="overlay-card-top">
          <div class="overlay-slot-label">Slot ${i + 1}</div>
          ${levelHtml}
        </div>

        <div class="overlay-image-wrap">
          ${sprite ? `<img src="${sprite}" alt="${pokemon?.frenchName || slot.name}">` : ""}
        </div>

        ${nameHtml}

        <div class="overlay-meta">
          ${shinyHtml}
          ${itemHtml}
        </div>

        ${typesHtml}
      </div>
      `
    );
  }
}

const channel = getChannelFromUrl("joykix");
subscribeToTeam(channel, (data) => {
  renderTeam(data);
});
