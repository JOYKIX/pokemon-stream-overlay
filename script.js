const teamEditor = document.getElementById("team-editor");

for (let i = 0; i < 6; i++) {

    const input = document.createElement("input");
    input.placeholder = "Nom du Pokémon";

    teamEditor.appendChild(input);
}

function saveTeam() {

    const inputs = document.querySelectorAll("input");

    let team = [];

    inputs.forEach(input => {

        team.push(input.value.toLowerCase());
    });

    localStorage.setItem("pokemonTeam", JSON.stringify(team));

    alert("Team sauvegardée !");
}