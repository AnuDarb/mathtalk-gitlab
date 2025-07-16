
const categoryMap = {
  "Zahlen & Terme": "zahlen_terme",
  "Funktionen & Algebra": "funktionen_algebra",
  "Geometrie & Raum": "geometrie_raum",
  "Stochastik": "stochastik"
};

let questionPoint = 0;
let questionId = 0;
let currentRank = 0;
let progressInRank = 0;
let currentQuestionType = "classic";
let dragAnswer = "";

const rankMax = 100;
const ranks = [
  { name: "Anfänger", icon: "/static/images/anfaenger_medaille.png" },
  { name: "Schüler", icon: "/static/images/schueler_medaille.png" },
  { name: "Mathelehrer", icon: "/static/images/mathelehrer_medaille.png" },
  { name: "Professor", icon: "/static/images/professor_medaille.png" }
];

function updateScoreBar() {
  const fill = document.getElementById("scoreFill");
  const text = document.getElementById("scoreText");
  const konto = document.getElementById("totalText");
  const medal = document.getElementById("medalImage");

  const progressPercent = Math.max(0, Math.min(100, (progressInRank / rankMax) * 100));
  fill.style.width = progressPercent + "%";
  fill.style.backgroundColor = progressInRank < 0 ? "#dc3545" : "#4caf50";
  text.innerText = `Punkte: ${questionPoint}`;
  konto.innerText = `Konto: ${progressInRank} / ${rankMax} (${ranks[currentRank].name})`;
  medal.src = ranks[currentRank]?.icon || "";
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
  const selectedCategory = categoryMap[selectedLabel] || "zahlen_terme";

  try {
    const res = await fetch(`/api/question?category=${encodeURIComponent(selectedCategory)}`);
    const data = await res.json();
    const questionText = document.getElementById("questionText");
    const mcOptions = document.getElementById("mcOptions");
    const answerInput = document.getElementById("answerInput");
    const dragItems = document.getElementById("dragItems");
    const dropZone = document.getElementById("dropZone");

    document.getElementById("textInputContainer").style.display = "none";
    mcOptions.style.display = "none";
    document.getElementById("dragDropContainer").style.display = "none";

    if (data.question) {
      questionId = data.id;
      currentQuestionType = data.question_type || "classic";
      questionText.innerText = data.question;

      if (currentQuestionType === "multiple_choice" && Array.isArray(data.choices)) {
        mcOptions.innerHTML = data.choices.map(choice => 
          `<label><input type="radio" name="mcOption" value="${choice}" /> ${choice}</label><br>`
        ).join("");
        mcOptions.style.display = "block";
      } else if (currentQuestionType === "drag_drop" && Array.isArray(data.choices)) {
        dragItems.innerHTML = data.choices.map(choice =>
          `<div class="draggable-item" draggable="true">${choice}</div>`
        ).join("");
        document.getElementById("dragDropContainer").style.display = "flex";
        initDragDrop();
      } else {
        document.getElementById("textInputContainer").style.display = "block";
        answerInput.value = "";
      }
    } else {
      questionText.innerText = "🎉 Quiz beendet!";
    }
  } catch (err) {
    console.error("Fehler beim Laden der Frage:", err);
  }
}

function initDragDrop() {
  dragAnswer = "";
  const items = document.querySelectorAll(".draggable-item");
  const dropZone = document.getElementById("dropZone");
  dropZone.innerHTML = "Antwort hier ablegen";

  items.forEach(el => {
    el.addEventListener("dragstart", e => {
      dragAnswer = e.target.textContent;
    });
  });

  dropZone.addEventListener("dragover", e => e.preventDefault());
  dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.textContent = dragAnswer;
  });
}

async function submitAnswer() {
  const answerInput = document.getElementById("answerInput");
  const mcSelected = document.querySelector("input[name='mcOption']:checked");
  const dropText = document.getElementById("dropZone")?.textContent || "";

  const answer = currentQuestionType === "multiple_choice"
    ? (mcSelected ? mcSelected.value : "")
    : currentQuestionType === "drag_drop"
    ? dropText
    : answerInput.value;

  try {
    const res = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ user_input: answer, question_id: questionId })
    });
    const result = await res.json();

    if (result.score > 0.85) {
      alert("✅ Richtig!");
      questionPoint++;
      progressInRank++;
    } else if (result.score > 0.65) {
      alert("🔁 Fast richtig – Tippfehler?");
      questionPoint++;
      progressInRank++;
    } else {
      alert("❌ Leider falsch.");
      questionPoint--;
      progressInRank--;
    }

    while (progressInRank >= rankMax && currentRank < ranks.length - 1) {
      progressInRank -= rankMax;
      currentRank++;
      alert("🎉 Neuer Rang: " + ranks[currentRank].name);
    }
    while (progressInRank < 0 && currentRank > 0) {
      currentRank--;
      progressInRank += rankMax;
      alert("⬇️ Abgestiegen auf: " + ranks[currentRank].name);
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

    loadQuestion();
  } catch (err) {
    alert("Fehler bei der Auswertung.");
  }
}

(async () => {
  await loadUserStatus();
  updateScoreBar();
  loadQuestion();
  window.submitAnswer = submitAnswer;
})();
