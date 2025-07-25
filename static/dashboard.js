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

// Dropdown Profil/Abmelden
const profilIcon = document.getElementById("profilIcon");
const dropdown = document.getElementById("profilDropdown");

profilIcon?.addEventListener("click", () => {
  dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
});

// Abmelden
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  try {
    await fetch("/api/logout", { method: "POST" });
  } catch (err) {
    console.error("Logout-Fehler:", err);
  }
  window.location.href = "/login";
});

// 🔄 Benutzerprofil-Daten abrufen & anzeigen
async function loadProfileData() {
  try {
    // #NEU: Fortschrittsfeld vorbereiten (optional)
    const fortschrittElement = document.getElementById("profilFortschritt");
    if (fortschrittElement) {
      fortschrittElement.textContent = "⏳ Lädt...";
    }

    const response = await fetch("/api/progress");
    const result = await response.json();

    if (!response.ok || result.error) {
      console.error("Fehler beim Abrufen des Fortschritts");
      if (fortschrittElement) {
        fortschrittElement.textContent = "0%";
      }
      return;
    }

    const responseUser = await fetch("/api/userinfo");
    const userData = await responseUser.json();
    const email = userData.email || "Unbekannt";

    const progressPercent = result.total_questions > 0
      ? Math.round((result.answered / result.total_questions) * 100)
      : 0;

    document.getElementById("profilEmail").textContent = email;
    if (fortschrittElement) {
      fortschrittElement.textContent = `${progressPercent}%`;
    }
  } catch (err) {
    console.error("❌ Fehler beim Laden des Profils:", err);
    const fortschrittElement = document.getElementById("profilFortschritt");
    if (fortschrittElement) {
      fortschrittElement.textContent = "0%";
    }
  }
}

// #NEU: Initialisiere Profildaten beim Laden
loadProfileData(); // #NEU
