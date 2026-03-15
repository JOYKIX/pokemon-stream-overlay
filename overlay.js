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
const overlayNuzlockeTag = document.getElementById("overlayNuzlockeTag");
const overlayDeathsLabel = document.getElementById("overlayDeathsLabel");
const overlayDeathCount = document.getElementById("overlayDeathCount");

function renderEmptyCard(index) {
  return `
    <div class="overlay-empty">
      <div>
        <div class="overlay-slot-label">Slot ${index + 1}</div>
        <div>Empty</div>
      </div>
    </div>
  `;
}

async function renderTeam(data) {
  if (!data) {
    overlayRoot.classList.remove("hide-header");
    overlayTrainer.textContent = "No team";
    overlayBadge.textContent = "Waiting for data";
    overlayRoot.classList.remove("nuzlocke-on");
    overlayNuzlockeTag.textContent = "Nuzlocke";
    overlayDeathsLabel.textContent = "Deaths";
    overlayDeathCount.textContent = "0";
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

  const pokemonLanguage = data.pokemonLanguage || "en";

  overlayRoot.classList.toggle("hide-header", !options.showHeader);
  overlayTrainer.textContent = data.trainerName || "Trainer";
  overlayBadge.textContent = data.badgeText || "Pokémon Team";
  const nuzlockeOn = Boolean(data.nuzlockeMode);
  overlayRoot.classList.toggle("nuzlocke-on", nuzlockeOn);
  overlayNuzlockeTag.textContent = nuzlockeOn ? "Nuzlocke" : "Free run";
  overlayDeathsLabel.textContent = data.siteLanguage === "fr" ? "Morts" : "Deaths";
  overlayDeathCount.textContent = String(Math.max(0, Number(data.deathCount) || 0));
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
      pokemon = await fetchPokemonLocalized(slot.name, slot.shiny, pokemonLanguage);
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
            <div class="overlay-species ${!options.showNickname || !hasNickname ? "is-primary" : ""}">${pokemon?.displayName || slot.name}</div>
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
          ${pokemon.types.map(type => `<span class="type-pill">${translateType(type, pokemonLanguage)}</span>`).join("")}
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
          ${sprite ? `<img src="${sprite}" alt="${pokemon?.displayName || slot.name}">` : ""}
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
