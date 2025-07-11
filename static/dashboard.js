console.log("📊 Dashboard JS geladen");

// Seite neu laden bei Zurück-Button
if (window.performance && window.performance.getEntriesByType("navigation")[0].type === "back_forward") {
  window.location.reload();
}

let selectedCategories = new Set();
let selectedGrade = null;
let selectedMode = null;

// Kategorie-Zuordnung
const categoryMap = {
  "Zahlen & Therme": "zahlen_terme",
  "Funktionen & Algebra": "funktionen_algebra",
  "Geometrie & Raum": "geometrie_raum",
  "Stochastik": "stochastik"
};

// Themenauswahl
document.querySelectorAll(".image-card").forEach(card => {
  const text = card.querySelector(".card-text")?.innerText.trim();
  if (!text) return;
  card.dataset.category = categoryMap[text] || text;

  card.addEventListener("click", () => {
    const id = card.dataset.category;
    if (selectedCategories.has(id)) {
      selectedCategories.delete(id);
      card.classList.remove("selected");
    } else {
      selectedCategories.add(id);
      card.classList.add("selected");
    }
    checkReady();
  });
});

// Modusauswahl
const modes = document.querySelectorAll(".moduskachel .untertitel");
modes.forEach(modus => {
  modus.parentElement.addEventListener("click", () => {
    selectedMode = modus.innerText.includes("Übung") ? "uebung" : "pruefung";
    modes.forEach(m => m.parentElement.classList.remove("selected"));
    modus.parentElement.classList.add("selected");
    checkReady();
  });
});

// Klassenwahl
const gradeImages = document.querySelectorAll(".modul:last-of-type .moduskachel");
gradeImages.forEach(kachel => {
  kachel.addEventListener("click", () => {
    selectedGrade = kachel.querySelector("img").alt.includes("9") ? "9" : "10";
    gradeImages.forEach(k => k.classList.remove("selected"));
    kachel.classList.add("selected");
    checkReady();
  });
});

// Prüfung ob alles gewählt wurde → Weiterleitung
function checkReady() {
  if (selectedCategories.size > 0 && selectedGrade && selectedMode) {
    const params = new URLSearchParams();
    params.set("categories", Array.from(selectedCategories).join(","));
    params.set("grade", selectedGrade);
    const path = selectedMode === "uebung" ? "/uebungsmodus" : "/pruefungsmodus.html";
    window.location.href = `${path}?${params.toString()}`;
  }
}

// Dropdown Profil/Abmelden
const profilIcon = document.getElementById("profilIcon");
const dropdown = document.getElementById("profilDropdown");

profilIcon?.addEventListener("click", () => {
  dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
});

// Abmelden
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  // Optional: Hier kannst du vorher noch Session löschen
  window.location.href = "/login.html";
});
