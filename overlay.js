const params = new URLSearchParams(window.location.search)

const team = params.get("team")

const container = document.getElementById("team")

async function loadTeam(){

if(!team) return

const pokemonList = team.split(",")

for(const name of pokemonList){

const data = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`)

const pokemon = await data.json()

const div = document.createElement("div")

div.classList.add("pokemon")

const img = document.createElement("img")

img.src = pokemon.sprites.other["official-artwork"].front_default

const label = document.createElement("p")

label.innerText = pokemon.name

div.appendChild(img)

div.appendChild(label)

container.appendChild(div)

}

}

loadTeam()