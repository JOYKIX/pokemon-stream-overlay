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
const overlayDeathWrap = document.getElementById("overlayDeathWrap");

const TYPE_COLORS = {
  normal: "#a8a77a",
  fire: "#ee8130",
  water: "#6390f0",
  electric: "#f7d02c",
  grass: "#7ac74c",
  ice: "#96d9d6",
  fighting: "#c22e28",
  poison: "#a33ea1",
  ground: "#e2bf65",
  flying: "#a98ff3",
  psychic: "#f95587",
  bug: "#a6b91a",
  rock: "#b6a136",
  ghost: "#735797",
  dragon: "#6f35fc",
  dark: "#705746",
  steel: "#b7b7ce",
  fairy: "#d685ad"
};

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return { r: 10, g: 10, b: 10 };
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

function applyOverlayStyle(style = {}, options = {}) {
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

  const width = Math.max(320, Number(options.overlayWidthPx) || 1600);
  const orientation = options.overlayOrientation === "vertical" ? "vertical" : "horizontal";
  overlayRoot.style.maxWidth = `${width}px`;
  overlayRoot.classList.toggle("is-vertical", orientation === "vertical");
}

function renderTypeBadge(type) {
  const color = TYPE_COLORS[type] || "#666";
  return `<span class="type-pill" style="--type-color:${color}">${translateType(type)}</span>`;
}

async function renderTeam(data) {
  if (!data) {
    applyOverlayStyle(DEFAULT_OVERLAY_STYLE, {});
    overlayRoot.classList.remove("sprite-only-mode", "hide-header");
    overlayRoot.classList.remove("nuzlocke-on");
    overlayTrainer.textContent = "Aucune team";
    overlayBadge.textContent = "En attente de données";
    overlayNuzlockeTag.textContent = "Run libre";
    overlayDeathWrap.style.display = "none";
    overlayTeam.innerHTML = "";
    return;
  }

  const options = {
    showHeader: data.displayOptions?.showHeader ?? true,
    showName: data.displayOptions?.showName ?? true,
    showNickname: data.displayOptions?.showNickname ?? true,
    showLevel: data.displayOptions?.showLevel ?? true,
    showItem: data.displayOptions?.showItem ?? true,
    showShiny: data.displayOptions?.showShiny ?? true,
    showTypes: data.displayOptions?.showTypes ?? true,
    spriteVariant: data.displayOptions?.spriteVariant || "auto",
    preferAnimatedSprite: Boolean(data.displayOptions?.preferAnimatedSprite),
    spriteOnlyMode: Boolean(data.displayOptions?.spriteOnlyMode),
    overlayOrientation: data.displayOptions?.overlayOrientation || "horizontal",
    overlayWidthPx: data.displayOptions?.overlayWidthPx || 1600
  };

  applyOverlayStyle(data.overlayStyle, options);
  overlayRoot.classList.toggle("sprite-only-mode", options.spriteOnlyMode);
  overlayRoot.classList.toggle("hide-header", !options.showHeader);

  overlayTrainer.textContent = data.trainerName || "Dresseur";
  overlayBadge.textContent = data.badgeText || "Équipe Pokémon";

  const nuzlockeOn = Boolean(data.nuzlockeMode);
  overlayRoot.classList.toggle("nuzlocke-on", nuzlockeOn);
  overlayNuzlockeTag.textContent = nuzlockeOn ? "Nuzlocke" : "Run libre";
  overlayDeathsLabel.textContent = "Morts";
  overlayDeathCount.textContent = String(Math.max(0, Number(data.deathCount) || 0));
  overlayDeathWrap.style.display = nuzlockeOn ? "inline-flex" : "none";

  overlayTeam.innerHTML = "";
  const slots = (data.slots || []).filter(slot => slot?.name);

  for (const slot of slots) {
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

    const levelHtml = options.showLevel && slot.level ? `<div class="overlay-level">Lv.${slot.level}</div>` : "";
    const shinyHtml = options.showShiny && slot.shiny ? '<span class="meta-pill shiny">Shiny ✨</span>' : "";
    const itemHtml = options.showItem && slot.item ? `<span class="meta-pill item">${slot.item}</span>` : "";
    const typesHtml = options.showTypes && pokemon?.types?.length
      ? `<div class="overlay-types">${pokemon.types.map(renderTypeBadge).join("")}</div>`
      : "";

    overlayTeam.insertAdjacentHTML(
      "beforeend",
      `<article class="overlay-card">
        <div class="overlay-card-top">${levelHtml}</div>
        <div class="overlay-image-wrap">${sprite ? `<img src="${sprite}" alt="${pokemon?.displayName || slot.name}">` : ""}</div>
        ${nameHtml}
        <div class="overlay-meta">${shinyHtml}${itemHtml}</div>
        ${typesHtml}
      </article>`
    );
  }
}

const channel = getChannelFromUrl("joykix");
subscribeToTeam(channel, (data) => {
  renderTeam(data);
});
