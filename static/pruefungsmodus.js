
function isImage(val) {
  if (typeof val !== 'string') return false;
  const hasExt = /\.(png|jpg|jpeg|svg)$/i.test(val);
  if (!hasExt) return false;

  if (/^https?:\/\//i.test(val)) return true;

  const clean = val.replace(/^\/+/, '');

  return clean.includes('images/');
}


function imageUrl(val) {
  if (!isImage(val)) return '';

  if (/^https?:\/\//i.test(val)) return val;
  let p = val.trim();

  p = p.replace(/^\/+/, '');

  p = p.replace(/^static\//, '');
 
  const idx = p.indexOf('images/');
  if (idx >= 0) p = p.slice(idx);

  if (!p.startsWith('images/')) p = 'images/' + p;
  return '/static/' + p;
}


let questionPoint = 0;
let questionId = 0;
let currentRank = 0;
let progressInRank = 0;
let currentQuestionType = "classic";

const rankMax = 100;
const ranks = [
  { name: "Anfänger", icon: "/static/images/anfaenger_medaille.png" },
  { name: "Schüler", icon: "/static/images/schueler_medaille.png" },
  { name: "Mathelehrer", icon: "/static/images/Mathelehrer_Medaille.png" },
  { name: "Professor", icon: "/static/images/Professor_Mathematik_Medaille.png" }
];

function updateScoreBar() {
  const fill = document.getElementById("scoreFill");
  const text = document.getElementById("scoreText");
  const konto = document.getElementById("totalText");
  const medal = document.getElementById("dashboardMedal");

  const progressPercent = Math.max(0, Math.min(100, (progressInRank / rankMax) * 100));
  fill.style.width = progressPercent + "%";
  fill.style.backgroundColor = progressInRank < 0 ? "#dc3545" : "#4caf50";
  text.innerText = `Punkte: ${questionPoint}`;
  konto.innerText = `Konto: ${progressInRank} / ${rankMax} (${ranks[currentRank].name})`;
  medal.src = ranks[currentRank]?.icon || "";
}


let userInput = "";                   
let answered = false;                 
let dragDropUserAnswers = {};        
let dragDropOptions = [];


const questionText = document.getElementById("questionText");
const textInputContainer = document.getElementById("textInputContainer");
const answerInputEl = document.getElementById("answerInput");
const mcOptionsEl = document.getElementById("mcOptions");
const dragDropContainer = document.getElementById("dragDropContainer");

function setMainButtonLabel(lbl) {
  const btn = document.querySelector(".buton-weiter button");
  if (btn) btn.textContent = lbl;
}


async function loadUserStatus() {
  try {
    const res = await fetch("/api/user_status", { credentials: "include" });
    const data = await res.json();
    if (!data.error) {
      questionPoint = data.total_points || 0;
      currentRank = data.current_rank || 0;
      progressInRank = data.progress_in_rank || 0;
    }
  } catch (err) {
    console.error("Fehler beim Laden des Nutzerstatus:", err);
  }
}


async function loadQuestion() {

  const params = new URLSearchParams(window.location.search);
  const selectedLabel = params.get("categories")?.split(",")[0] || "Zahlen & Terme";

  try {
    const res = await fetch(`/api/question?category=${encodeURIComponent(selectedLabel)}`, { credentials: "include" });
    const data = await res.json();

   
    answered = false;
    userInput = "";
    dragDropUserAnswers = {};
    dragDropOptions = [];
    setMainButtonLabel("Antworten");


    textInputContainer.style.display = "none";
    mcOptionsEl.style.display = "none";
    dragDropContainer.style.display = "none";
    mcOptionsEl.innerHTML = "";
    dragDropContainer.innerHTML = `
      <div id="dragdrop-examples"></div>
      <div id="dragdrop-answers" style="margin-top:12px;"></div>
    `;

    if (!data || !data.question) {
      questionText.textContent = "🎉 Quiz beendet oder keine Frage gefunden.";
      return;
    }


    questionId = data.id;
    currentQuestionType = data.question_type || "classic";
    questionText.textContent = data.question;


    if (currentQuestionType === "drag_drop" && typeof data.answer === "string") {
      try { data.answer = JSON.parse(data.answer); } catch { data.answer = {}; }
    }
    if (currentQuestionType === "multiple_choice" && typeof data.choices === "string") {
      try { data.choices = JSON.parse(data.choices); } catch { data.choices = []; }
    }


    if (currentQuestionType === "classic") {
      textInputContainer.style.display = "block";
      answerInputEl.value = "";
    } else if (currentQuestionType === "multiple_choice") {
      mcOptionsEl.style.display = "block";
      mcOptionsEl.innerHTML = `
        <div class="multiple-choice-row" style="display:flex;flex-direction:column;gap:10px;">
          ${(data.choices || []).map(opt => `
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
              <input type="radio" name="mc" value="${opt}">
              <span>${opt}</span>
            </label>
          `).join('')}
        </div>
      `;

      mcOptionsEl.querySelectorAll('input[type=radio][name=mc]').forEach(el => {
        el.addEventListener('change', (e) => {
          userInput = e.target.value;
          submitAnswer();  
        });
      });
    } else if (currentQuestionType === "drag_drop") {
      dragDropContainer.style.display = "flex";
      dragDropContainer.style.flexDirection = "column";

      const exWrap = dragDropContainer.querySelector("#dragdrop-examples");
      const ansWrap = dragDropContainer.querySelector("#dragdrop-answers");


      const keys = Object.keys(data.answer || {});
      dragDropOptions = Object.values(data.answer || {});
      exWrap.innerHTML = keys.map(ex => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;background:#f9fafb;margin:6px 0;">
          <div style="flex:1">${isImage(ex) ? `<img src="${imageUrl(ex)}" alt="Beispiel" style="max-width:240px;max-height:240px">` : ex}</div>
          <div class="dropzone" data-ex="${ex}" style="min-width:120px;min-height:38px;border:2px dashed #cbd5e1;border-radius:6px;padding:6px 10px;margin-left:12px;background:#f8fafc;">
            <span style="color:#777">Antwort hierher ziehen</span>
          </div>
        </div>
      `).join('');


      ansWrap.innerHTML = dragDropOptions.map(ans => `
        <div class="dragdrop-answer" draggable="true" data-ans="${ans}" style="display:inline-block;background:#e0e7ef;border:1px solid #cbd5e1;border-radius:8px;padding:8px 14px;margin:6px;cursor:grab;">
          ${isImage(ans) ? `<img src="${imageUrl(ans)}" alt="Antwort" style="max-width:200px;max-height:200px">` : `<span>${ans}</span>`}
        </div>
      `).join('');

      let dragData = null;
      ansWrap.querySelectorAll('.dragdrop-answer').forEach(el => {
        el.addEventListener('dragstart', () => { dragData = el.getAttribute('data-ans'); });
      });
      exWrap.querySelectorAll('.dropzone').forEach(zone => {
        zone.addEventListener('dragover', e => e.preventDefault());
        zone.addEventListener('drop', () => {
          const ex = zone.getAttribute('data-ex');

          if (answered || !dragData) return;
          if (Object.values(dragDropUserAnswers).includes(dragData)) return;

          dragDropUserAnswers[ex] = dragData;
          zone.innerHTML = isImage(dragData)
            ? `<img src="${imageUrl(dragData)}" alt="Antwort" style="max-width:200px;max-height:200px">`
            : `<span>${dragData}</span>`;

          const usedEl = ansWrap.querySelector(`[data-ans="${CSS.escape(dragData)}"]`);
          if (usedEl) { usedEl.style.opacity = "0.5"; usedEl.style.pointerEvents = "none"; }
          dragData = null;
        });
      });
    } else {

      currentQuestionType = "classic";
      textInputContainer.style.display = "block";
      answerInputEl.value = "";
    }
  } catch (err) {
    console.error("Fehler beim Laden der Frage:", err);
    questionText.textContent = "Fehler beim Laden der Frage.";
  }
}


async function submitAnswer() {

  if (answered) {
    await loadQuestion();
    return;
  }

  let payload = { question_id: questionId };

  if (currentQuestionType === "classic") {
    const val = answerInputEl.value?.trim();
    if (!val) return;
    payload.user_input = val;
  } else if (currentQuestionType === "multiple_choice") {
    if (!userInput) return; 
    payload.user_input = userInput;
  } else if (currentQuestionType === "drag_drop") {
    if (!dragDropUserAnswers || Object.keys(dragDropUserAnswers).length === 0) {
      alert("Bitte ordne allen Beispielen eine Antwort zu.");
      return;
    }
    payload.user_input = dragDropUserAnswers;
  }

  try {
    const res = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });
    const result = await res.json();


    let correct = false;
    let almost = false;
    if (typeof result?.is_correct === "boolean") {
      correct = !!result.is_correct;
    } else if (typeof result?.score === "number") {
      if (result.score > 0.85) correct = true;
      else if (result.score > 0.65) almost = true;
    }

    const feedbackEl = document.getElementById("feedback");

if (correct) {
  feedbackEl.textContent = "✅ Richtig!";
  feedbackEl.style.display = "block";
  feedbackEl.style.color = "green";
  questionPoint++;
  progressInRank++;
} else if (almost) {
  feedbackEl.textContent = "🔁 Fast richtig – Tippfehler?";
  feedbackEl.style.display = "block";
  feedbackEl.style.color = "orange";
  questionPoint++;
  progressInRank++;
} else {
  feedbackEl.textContent = "❌ Leider falsch.";
  feedbackEl.style.display = "block";
  feedbackEl.style.color = "red";
}


    while (progressInRank >= rankMax && currentRank < ranks.length - 1) {
      progressInRank -= rankMax;
      currentRank++;
      alert("🎉 Neuer Rang: " + ranks[currentRank].name);
    }

    updateScoreBar();


    await fetch("/api/save_status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        total_points: questionPoint,
        current_rank: currentRank,
        progress_in_rank: progressInRank
      })
    });


    answered = true;
    setMainButtonLabel("Weiter");
  } catch (err) {
    alert("Fehler bei der Auswertung.");
    console.error(err);
  }
}


(async () => {
  await loadUserStatus();   
  updateScoreBar();        
  await loadQuestion();    
  window.submitAnswer = submitAnswer; 
})();


const profilIcon = document.getElementById("profilIcon");
const dropdown = document.getElementById("profilDropdown");


if (dropdown) {
  dropdown.innerHTML = `
    <button id="profileBtn" class="profil-item" type="button">Profil</button>
    <button id="logoutBtn" class="profil-item" type="button">Abmelden</button>
  `;
  dropdown.style.display = "none";
}


if (profilIcon) {
  profilIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!dropdown) return;
    const isOpen = dropdown.style.display === "block";
    dropdown.style.display = isOpen ? "none" : "block";
  });
}


document.addEventListener("click", (e) => {
  if (!dropdown || !profilIcon) return;
  if (!dropdown.contains(e.target) && !profilIcon.contains(e.target)) {
    dropdown.style.display = "none";
  }
});


document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && dropdown && dropdown.style.display === "block") {
    dropdown.style.display = "none";
  }
});


const profileBtn = document.getElementById("profileBtn");
if (profileBtn) {
  profileBtn.addEventListener("click", () => {
    window.location.href = "/profile";
  });
}


const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    } catch (err) {
      console.error("Logout-Fehler:", err);
    }
    window.location.href = "/login";
  });
}


const dashboardRanks = [
  { name: "Anfänger",    icon: "/static/images/anfaenger_medaille.png" },
  { name: "Schüler",     icon: "/static/images/Schüler_Medaille.png" },
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


loadDashboardMedal();
