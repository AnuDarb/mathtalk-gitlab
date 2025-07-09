const totalQuestions = 10;
let questionPoint = Number(localStorage.getItem("questionPoint")) || 0;
let questionId = Number(localStorage.getItem("questionId")) || 1;
let totalPoints = Number(localStorage.getItem("totalPoints")) || 0;



function toggleOptions() {
  const panel = document.getElementById('optionsPanel');
  panel.classList.toggle('visible');
}

function saveOptions() {
  alert("Optionen gespeichert!");
}

// Fortschrittsbalken aktualisieren
function updateScoreBar() {
  const fill = document.getElementById("scoreFill");
  const text = document.getElementById("scoreText");

  const progress = Math.max(0, questionPoint) * 10; // z. B. 10 Punkte = 100%
  fill.style.width = progress + "%";
  fill.style.backgroundColor = questionPoint < 0 ? "#dc3545" : "#4caf50";

  text.innerText = `Punkte: ${questionPoint}`;
  localStorage.setItem("questionPoint", questionPoint);
  localStorage.setItem("questionId", questionId);
  const konto = document.getElementById("totalText");
if (konto) {
  konto.innerText = `Konto: ${totalPoints} Punkte`;
}
}


// Eine Frage aus der Datenbank laden
async function loadQuestion(id) {
  const response = await fetch(`/api/question/${id}`);
  const data = await response.json();
  const questionText = document.getElementById("questionText");

  if (data.question) {
    questionText.innerText = data.question;
    document.getElementById("answerInput").value = "";
  } else {
    questionText.innerText = "🎉 Alle Aufgaben abgeschlossen!";
    const button = document.querySelector(".buton-weiter button");
    button.disabled = true;
    button.innerText = "Fertig!";
  }
}

// Antwort absenden, Score prüfen, nächste Frage laden
async function submitAnswer() {
  const button = document.querySelector(".buton-weiter button");
  const answer = document.getElementById("answerInput").value;

  // UI sperren
  button.disabled = true;
  button.style.backgroundColor = "#888";
  button.innerText = "Wird gesendet...";

  // Antwort absenden
  const response = await fetch("/api/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_input: answer, question_id: questionId })
  });

  const result = await response.json();

  if (result.success) {
    const score = result.score;

    // Bewertung
    if (score > 0.85) {
      alert("✅ Richtig!");
      questionPoint++;
    } else if (score > 0.65) {
      alert("🔁 Fast richtig – Tippfehler?");
      questionPoint++;
    } else {
      alert("❌ Leider falsch.");
      questionPoint--;
    }

    // Fortschritt + Punkte speichern
    questionId++;
    localStorage.setItem("questionPoint", questionPoint);
    localStorage.setItem("questionId", questionId);
    updateScoreBar();

    if (questionId > totalQuestions) {
  totalPoints += questionPoint;
  localStorage.setItem("totalPoints", totalPoints);

  alert(`🎉 Quiz beendet! Du hast ${questionPoint} Punkte erzielt.
💰 Gesamtkonto: ${totalPoints} Punkte`);

  // Zurücksetzen
  questionId = 1;
  questionPoint = 0;
  localStorage.setItem("questionId", questionId);
  localStorage.setItem("questionPoint", questionPoint);

  updateScoreBar();
  loadQuestion();
  document.getElementById("answerInput").style.display = "block";
}


    // Button zurücksetzen
    button.disabled = false;
    button.innerText = "Weiter";
    button.style.backgroundColor = "#0c702e";

  } else {
    alert("Ein Fehler ist aufgetreten.");
    button.disabled = false;
    button.innerText = "Weiter";
    button.style.backgroundColor = "#0c702e";
  }
}

function resetAll() {
  if (confirm("Willst du wirklich ALLES zurücksetzen (inkl. Punktekonto)?")) {
    localStorage.removeItem("questionPoint");
    localStorage.removeItem("questionId");
    localStorage.removeItem("totalPoints");
    location.reload(); // Seite neu laden
  }
}


// Quiz starten
loadQuestion(questionId);
updateScoreBar();