console.log("👤 Profile JS geladen");

/* ========= Medaillen & Ränge ========= */
const rankMax = 100;
const ranks = [
  { name: "Anfänger",    icon: "/static/images/anfaenger_medaille.png" },
  { name: "Schüler",     icon: "/static/images/Schüler_Medaille.png" },
  { name: "Mathelehrer", icon: "/static/images/Mathelehrer_Medaille.png" },
  { name: "Professor",   icon: "/static/images/Professor_Mathematik_Medaille.png" }
];

/* ========= Zustände ========= */
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

const headerMedal   = document.getElementById("headerMedal");
const profileBtn    = document.getElementById("profileBtn");
const logoutBtn     = document.getElementById("logoutBtn");

/* ========= Dropdown ========= */
/* 👇 NEU: Dropdown beim Laden sicher verstecken */
if (profilDropdown) {
  profilDropdown.style.display = "none";
}

if (profilIcon && profilDropdown) {
  profilIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    profilDropdown.style.display = profilDropdown.style.display === "block" ? "none" : "block";
  });
  document.addEventListener("click", (e) => {
    if (!profilDropdown.contains(e.target) && e.target !== profilIcon) {
      profilDropdown.style.display = "none";
    }
  });
}
if (profileBtn) {
  profileBtn.addEventListener("click", () => {
    window.location.href = "/profile";
  });
}
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try { await fetch("/api/logout", { method: "POST" }); } catch {}
    window.location.href = "/login";
  });
}

/* ========= Anzeige aktualisieren ========= */
function updateScoreBar() {
  const progressPercent = Math.max(0, Math.min(100, (progressInRank / rankMax) * 100));

  if (scoreFillEl) {
    scoreFillEl.style.width = progressPercent + "%";
    scoreFillEl.style.backgroundColor = progressInRank < 0 ? "#dc3545" : "#4caf50";
  }

  const rankName = ranks[currentRank]?.name || "";
  if (medalImgEl) medalImgEl.src = ranks[currentRank]?.icon || "";
  if (rankNameEl) rankNameEl.textContent = rankName;

  if (scoreTextEl) scoreTextEl.innerText = `Punkte: ${questionPoint}`;
  if (kontoTextEl) kontoTextEl.innerText = `Konto: ${progressInRank} / ${rankMax} (${rankName})`;

  const fortschrittText = `${Math.max(0, Math.min(100, Math.round(progressPercent)))}%`;
  if (progressValEl)  progressValEl.textContent = fortschrittText;
  if (profilFortsch)  profilFortsch.textContent = fortschrittText;

  if (headerMedal && ranks[currentRank]) {
    headerMedal.src = ranks[currentRank].icon;
    headerMedal.style.display = "inline-block";
    headerMedal.alt = `${rankName}-Medaille`;
    headerMedal.title = rankName;
  }
}

/* ========= E-Mail + Status laden ========= */
async function resolveEmailAndStatus() {
  let email = null;

  try {
    const r1 = await fetch("/api/user_status", { credentials: "include" });
    if (r1.ok) {
      const d1 = await r1.json();
      if (typeof d1.total_points === "number") questionPoint  = d1.total_points;
      if (typeof d1.current_rank === "number") currentRank    = d1.current_rank;
      if (typeof d1.progress_in_rank === "number") progressInRank = d1.progress_in_rank;
      if (d1 && typeof d1.email === "string") email = d1.email;
    }
  } catch {}

  if (!email) {
    try {
      // Falls du /api/userinfo verwendest, passe den Endpoint hier an
      const r2 = await fetch("/api/userinfo", { credentials: "include" });
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

  currentRank    = Math.max(0, Math.min(ranks.length - 1, currentRank || 0));
  progressInRank = typeof progressInRank === "number" ? progressInRank : 0;
  questionPoint  = typeof questionPoint === "number" ? questionPoint : 0;

  updateScoreBar();
}

/* ========= Init ========= */
resolveEmailAndStatus();
