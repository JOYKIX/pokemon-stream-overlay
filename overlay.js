import {
  getChannelFromUrl,
  subscribeToTeam,
  fetchPokemonLocalized,
  translateType,
  DEFAULT_OVERLAY_STYLE
} from "./shared.js";

const overlayRoot = document.getElementById("overlayRoot");
const overlayTrainer = document.getElementById("overlayTrainer");
const overlayBadge = document.getElementById("overlayBadge");
const overlayTeam = document.getElementById("overlayTeam");
const overlayNuzlockeTag = document.getElementById("overlayNuzlockeTag");
const overlayDeathsLabel = document.getElementById("overlayDeathsLabel");
const overlayDeathCount = document.getElementById("overlayDeathCount");

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return { r: 9, g: 15, b: 31 };
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

function applyOverlayStyle(style = {}) {
  const merged = { ...DEFAULT_OVERLAY_STYLE, ...style };
  const rgb = hexToRgb(merged.backgroundColor);
  const bodyBackground = merged.transparentBackground
    ? "transparent"
    : `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${merged.backgroundOpacity})`;

  document.body.style.background = bodyBackground;
  overlayRoot.style.setProperty("--overlay-text", merged.textColor);
  overlayRoot.style.setProperty("--overlay-accent", merged.accentColor);
  overlayRoot.style.setProperty("--overlay-card", merged.cardColor);
  overlayRoot.style.setProperty("--overlay-card-opacity", String(merged.cardOpacity));
  overlayRoot.style.setProperty("--overlay-radius", `${merged.borderRadius}px`);
}

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
    applyOverlayStyle(DEFAULT_OVERLAY_STYLE);
    overlayRoot.classList.remove("sprite-only-mode");
    overlayRoot.classList.remove("hide-header");
    overlayTrainer.textContent = "Aucune team";
    overlayBadge.textContent = "En attente de données";
    overlayRoot.classList.remove("nuzlocke-on");
    overlayNuzlockeTag.textContent = "Nuzlocke";
    overlayDeathsLabel.textContent = "Morts";
    overlayDeathCount.textContent = "0";
    overlayTeam.innerHTML = Array.from({ length: 6 }, (_, i) => renderEmptyCard(i)).join("");
    return;
  }

  applyOverlayStyle(data.overlayStyle);

  const options = {
    showHeader: data.displayOptions?.showHeader ?? true,
    showName: data.displayOptions?.showName ?? true,
    showNickname: data.displayOptions?.showNickname ?? true,
    showLevel: data.displayOptions?.showLevel ?? true,
    showItem: data.displayOptions?.showItem ?? true,
    showShiny: data.displayOptions?.showShiny ?? true,
    showTypes: data.displayOptions?.showTypes ?? false,
    spriteVariant: data.displayOptions?.spriteVariant || "auto",
    preferAnimatedSprite: Boolean(data.displayOptions?.preferAnimatedSprite),
    spriteOnlyMode: Boolean(data.displayOptions?.spriteOnlyMode)
  };

  overlayRoot.classList.toggle("sprite-only-mode", options.spriteOnlyMode);

  overlayRoot.classList.toggle("hide-header", !options.showHeader);
  overlayTrainer.textContent = data.trainerName || "Dresseur";
  overlayBadge.textContent = data.badgeText || "Équipe Pokémon";
  const nuzlockeOn = Boolean(data.nuzlockeMode);
  overlayRoot.classList.toggle("nuzlocke-on", nuzlockeOn);
  overlayNuzlockeTag.textContent = nuzlockeOn ? "Nuzlocke" : "Run libre";
  overlayDeathsLabel.textContent = "Morts";
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
      pokemon = await fetchPokemonLocalized(slot.name, slot.shiny, {
        variant: options.spriteVariant,
        animated: options.preferAnimatedSprite
      });
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
      ? '<span class="meta-pill shiny">Shiny</span>'
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
