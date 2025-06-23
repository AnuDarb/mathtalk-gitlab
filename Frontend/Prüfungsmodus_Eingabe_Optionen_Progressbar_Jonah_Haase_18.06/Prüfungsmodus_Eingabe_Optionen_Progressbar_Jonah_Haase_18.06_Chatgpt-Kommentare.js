// Funktion zum Umschalten der Sichtbarkeit des Optionsfelds
function toggleOptions() {
  const panel = document.getElementById('optionsPanel');
  panel.classList.toggle('visible');
}

// Funktion, die beim Klick auf "Speichern" ausgeführt wird
function saveOptions() {
  alert("Optionen gespeichert!"); // Zeigt eine Benachrichtigung
}