console.log("Dashboard JS geladen");

let selectedCategories = new Set();
let selectedGrade = null;
let selectedMode = null;

// Auswahl-Reset bei Back/Forward (bfcache)
function resetSelections() {
  // JS-State leeren
  selectedCategories = new Set();
  selectedGrade = null;
  selectedMode = null;

  // visuelle Auswahl entfernen
  document
    .querySelectorAll(".image-card.selected, .moduskachel.selected")
    .forEach((el) => el.classList.remove("selected"));
}

window.addEventListener("pageshow", (e) => {
  if (e.persisted) {
    resetSelections();
  }
});

// Fallback: Navigation Timing erkennt back_forward
{
  const navEntry = performance.getEntriesByType("navigation")[0];
  if (navEntry && navEntry.type === "back_forward") {
    resetSelections();
  }
}

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

// Profil-Dropdown 

// Elemente
const profilIcon = document.getElementById("profilIcon");
const dropdown = document.getElementById("profilDropdown");

// Inhalt auf 2 Buttons reduzieren (Profil zuerst)
if (dropdown) {
  dropdown.innerHTML = `
    <button id="profileBtn" class="profil-item" type="button">Profil</button>
    <button id="logoutBtn" class="profil-item" type="button">Abmelden</button>
  `;
  dropdown.style.display = "none";
}

// Öffnen/Schließen
if (profilIcon) {
  profilIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!dropdown) return;
    const isOpen = dropdown.style.display === "block";
    dropdown.style.display = isOpen ? "none" : "block";
  });
}

// Schließen bei Klick außerhalb
document.addEventListener("click", (e) => {
  if (!dropdown || !profilIcon) return;
  if (!dropdown.contains(e.target) && !profilIcon.contains(e.target)) {
    dropdown.style.display = "none";
  }
});

// Schließen mit ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && dropdown && dropdown.style.display === "block") {
    dropdown.style.display = "none";
  }
});

// Profil
const profileBtn = document.getElementById("profileBtn");
if (profileBtn) {
  profileBtn.addEventListener("click", () => {
    window.location.href = "/profile";
  });
}

// Abmelden
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout-Fehler:", err);
    }
    window.location.href = "/login";
  });
}

// Medaille
const dashboardRanks = [
  { name: "Anfänger",    icon: "/static/images/anfaenger_medaille.png" },
  { name: "Schüler",     icon: "/static/images/schueler_medaille.png" },
  { name: "Mathelehrer", icon: "/static/images/Mathelehrer_Medaille.png" },
  { name: "Professor",   icon: "/static/images/Professor_Mathematik_Medaille.png" }
];

async function loadDashboardMedal() {
  try {
    const res = await fetch("/api/user_status", { credentials: "include" });
    const data = await res.json();

    const currentRank = data.current_rank ?? 0;
    const medalImg = document.getElementById("dashboardMedal");

    if (medalImg && dashboardRanks[currentRank]) {
      medalImg.src = dashboardRanks[currentRank].icon;
      medalImg.alt = `${dashboardRanks[currentRank].name}-Medaille`;
      medalImg.title = dashboardRanks[currentRank].name;
      medalImg.style.display = "inline-block";
    }
  } catch (err) {
    console.error("Fehler beim Laden der Medaille:", err);
  }
}

// direkt beim Laden aufrufen
loadDashboardMedal();

