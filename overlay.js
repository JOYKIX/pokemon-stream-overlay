async function loadTeam() {

    const team = JSON.parse(localStorage.getItem("pokemonTeam")) || [];

    const container = document.getElementById("team");
    container.innerHTML = "";

    for (const pokemon of team) {

        if (!pokemon) continue;

        const data = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon}`);
        const poke = await data.json();

        const img = document.createElement("img");

        img.src = poke.sprites.front_default;
        img.classList.add("pokemon");

        container.appendChild(img);
    }
}

loadTeam();

setInterval(loadTeam, 2000);