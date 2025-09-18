/* ========= Medaillen & Ränge ========= */
const rankMax = 100;
const ranks = [
  { name: "Anfänger",    icon: "/static/images/anfaenger_medaille.png" },
  { name: "Schüler",     icon: "/static/images/schueler_medaille.png" },
  { name: "Mathelehrer", icon: "/static/images/mathelehrer_medaille.png" },
  { name: "Professor",   icon: "/static/images/professor_medaille.png" }
];

/* ========= Zustände (aus Prüfungsmodus übernommen) ========= */
let questionPoint   = 0;
let currentRank     = 0;
let progressInRank  = 0;

/* ========= DOM-Refs ========= */
const scoreFillEl   = document.getElementById("scoreFill");
const scoreTextEl   = document.getElementById("scoreText");
const kontoTextEl   = document.getElementById("totalText");
const medalImgEl    = document.getElementById("medalImage");
const rankNameEl    = document.getElementById("rankName");
const emailValueEl  = document.getElementById("emailValue");
const progressValEl = document.getElementById("progressValue");

const profilIcon    = document.getElementById("profilIcon");
const profilDropdown= document.getElementById("profilDropdown");
const profilEmail   = document.getElementById("profilEmail");
const profilFortsch = document.getElementById("profilFortschritt");

/* ========= Dropdown (kleines Fallback wie im Dashboard) ========= */
if (profilIcon && profilDropdown) {
  profilIcon.addEventListener("click", () => {
    profilDropdown.style.display = profilDropdown.style.display === "block" ? "none" : "block";
  });
  document.addEventListener("click", (e) => {
    if (!profilDropdown.contains(e.target) && e.target !== profilIcon) {
      profilDropdown.style.display = "none";
    }
  });
}

/* ========= Anzeige aktualisieren ========= */
function updateScoreBar() {
  const progressPercent = Math.max(0, Math.min(100, (progressInRank / rankMax) * 100));
  scoreFillEl.style.width = progressPercent + "%";
  scoreFillEl.style.backgroundColor = progressInRank < 0 ? "#dc3545" : "#4caf50";

  const rankName = ranks[currentRank]?.name || "";
  if (medalImgEl) medalImgEl.src = ranks[currentRank]?.icon || "";
  if (rankNameEl) rankNameEl.textContent = rankName;

  if (scoreTextEl) scoreTextEl.innerText = `Punkte: ${questionPoint}`;
  if (kontoTextEl) kontoTextEl.innerText = `Konto: ${progressInRank} / ${rankMax} (${rankName})`;

  // rechte Infospalte + Dropdown
  const fortschrittText = `${Math.max(0, Math.min(100, Math.round(progressPercent)))}%`;
  if (progressValEl)  progressValEl.textContent = fortschrittText;
  if (profilFortsch)  profilFortsch.textContent = fortschrittText;
}

/* ========= E-Mail ermitteln =========
   1) Versuche /api/user_status (falls Backend Mail mitsendet)
   2) optional /api/me
   3) Fallback: localStorage ("mt_email")
=============================================================== */
async function resolveEmail() {
  let email = null;

  try {
    const r1 = await fetch("/api/user_status", { credentials: "include" });
    if (r1.ok) {
      const d1 = await r1.json();
      if (d1 && typeof d1.email === "string") email = d1.email;
      // zugleich Statuswerte übernehmen falls vorhanden
      if (typeof d1.total_points === "number") questionPoint = d1.total_points;
      if (typeof d1.current_rank === "number") currentRank = d1.current_rank;
      if (typeof d1.progress_in_rank === "number") progressInRank = d1.progress_in_rank;
    }
  } catch {}

  if (!email) {
    try {
      const r2 = await fetch("/api/me", { credentials: "include" });
      if (r2.ok) {
        const d2 = await r2.json();
        if (d2 && typeof d2.email === "string") email = d2.email;
      }
    } catch {}
  }

  if (!email) {
    email = localStorage.getItem("mt_email") || null;
  }

  if (email) {
    if (emailValueEl) emailValueEl.textContent = email;
    if (profilEmail)  profilEmail.textContent = email;
  } else {
    if (emailValueEl) emailValueEl.textContent = "—";
  }

  // Fallback: wenn Status nicht aus /api/user_status kam, setze Standard
  currentRank    = Math.max(0, Math.min(ranks.length - 1, currentRank || 0));
  progressInRank = typeof progressInRank === "number" ? progressInRank : 0;
  questionPoint  = typeof questionPoint === "number" ? questionPoint : 0;

  updateScoreBar();
}

/* ========= Init ========= */
resolveEmail();
