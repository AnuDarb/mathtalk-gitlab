console.log("📊 Dashboard JS geladen");

// Seite neu laden bei Zurück-Button (mit Fallback)
const navEntry = performance.getEntriesByType("navigation")[0];
if (navEntry && navEntry.type === "back_forward") {
  location.reload();
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

// Modusauswahl (mit Toggle)
const modes = document.querySelectorAll(".moduskachel .untertitel");
modes.forEach(modus => {
  modus.parentElement.addEventListener("click", () => {
    const newMode = modus.innerText.includes("Übung") ? "uebung" : "pruefung";

    if (selectedMode === newMode) {
      selectedMode = null;
      modus.parentElement.classList.remove("selected");
    } else {
      selectedMode = newMode;
      modes.forEach(m => m.parentElement.classList.remove("selected"));
      modus.parentElement.classList.add("selected");
    }

    checkReady();
  });
});

// Klassenwahl (mit Toggle)
const gradeImages = document.querySelectorAll(".modul:last-of-type .moduskachel");
gradeImages.forEach(kachel => {
  kachel.addEventListener("click", () => {
    const grade = kachel.querySelector("img").alt.includes("9") ? "9" : "10";

    if (selectedGrade === grade) {
      selectedGrade = null;
      kachel.classList.remove("selected");
    } else {
      selectedGrade = grade;
      gradeImages.forEach(k => k.classList.remove("selected"));
      kachel.classList.add("selected");
    }

    checkReady();
  });
});

// Prüfung ob alles gewählt wurde → Weiterleitung
function checkReady() {
  if (selectedCategories.size > 0 && selectedGrade && selectedMode === "uebung") {
    const params = new URLSearchParams();
    params.set("categories", Array.from(selectedCategories).join(","));
    params.set("grade", selectedGrade);
    window.location.href = `/uebungsmodus?${params.toString()}`;
    return;
  }

  // Prüfungsmodus → nur weiterleiten, wenn alles gewählt wurde
  if (selectedCategories.size > 0 && selectedGrade && selectedMode === "pruefung") {
    const params = new URLSearchParams();
    params.set("categories", Array.from(selectedCategories).join(","));
    params.set("grade", selectedGrade);
    window.location.href = `/pruefungsmodus?${params.toString()}`;
  }
}

/* ===========================
   🔽 Profil-Dropdown (nur: Profil, Abmelden)
   =========================== */

// Elemente
const profilIcon = document.getElementById("profilIcon");
const dropdown = document.getElementById("profilDropdown");

// Optional: Falls das Dropdown im HTML noch alte Inhalte (Mail, Fortschritt) hat,
// überschreiben wir es hier auf die 2 gewünschten Einträge.
if (dropdown) {
  dropdown.innerHTML = `
    <button id="profileBtn" class="profil-item" type="button">Profil</button>
    <button id="logoutBtn" class="profil-item" type="button">Abmelden</button>
  `;
}

// Öffnen/Schließen
profilIcon?.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpen = dropdown?.style.display === "block";
  if (dropdown) dropdown.style.display = isOpen ? "none" : "block";
});

// Schließen bei Klick außerhalb
document.addEventListener("click", (e) => {
  if (!dropdown || !profilIcon) return;
  if (!dropdown.contains(e.target) && !profilIcon.contains(e.target)) {
    dropdown.style.display = "none";
  }
});

// Schließen mit ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && dropdown?.style.display === "block") {
    dropdown.style.display = "none";
  }
});

// Profil
document.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  if (target?.id === "profileBtn") {
    window.location.href = "/profile";
  }
});

// Abmelden
document.addEventListener("click", async (e) => {
  const target = e.target as HTMLElement;
  if (target?.id === "logoutBtn") {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout-Fehler:", err);
    }
    window.location.href = "/login";
  }
});
