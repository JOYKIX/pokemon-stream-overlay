function generateOverlay(){

const p1 = document.getElementById("p1").value.toLowerCase()
const p2 = document.getElementById("p2").value.toLowerCase()
const p3 = document.getElementById("p3").value.toLowerCase()
const p4 = document.getElementById("p4").value.toLowerCase()
const p5 = document.getElementById("p5").value.toLowerCase()
const p6 = document.getElementById("p6").value.toLowerCase()

const team = [p1,p2,p3,p4,p5,p6].filter(Boolean)

const url = `${window.location.origin}/pokemon-stream-overlay/overlay.html?team=${team.join(",")}`

document.getElementById("overlayURL").value = url

}

function copyURL(){

const input = document.getElementById("overlayURL")

input.select()

document.execCommand("copy")

alert("URL copiée pour OBS")

}