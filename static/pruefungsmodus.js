const categoryMap = {
  "Zahlen & Terme": "zahlen_terme",
  "Funktionen & Algebra": "funktionen_algebra",
  "Geometrie & Raum": "geometrie_raum",
  "Stochastik": "stochastik"
};

let totalQuestions = 10;
let questionPoint = 0;
let questionId = 0;
let currentRank = 0;
let progressInRank = 0;
const rankMax = 100;

const ranks = [
  { name: "Anfänger", icon: "/static/images/anfaenger_medaille.png" },
  { name: "Schüler", icon: "/static/images/schueler_medaille.png" },
  { name: "Mathelehrer", icon: "/static/images/mathelehrer_medaille.png" },
  { name: "Professor", icon: "/static/images/professor_medaille.png" }
];

// Fortschrittsbalken und Medaille aktualisieren
function updateScoreBar() {
  const fill = document.getElementById("scoreFill");
  const text = document.getElementById("scoreText");
  const konto = document.getElementById("totalText");
  const medal = document.getElementById("medalImage");

  const progressPercent = Math.max(0, Math.min(100, (progressInRank / rankMax) * 100));
  fill.style.width = progressPercent + "%";
  fill.style.backgroundColor = progressInRank < 0 ? "#dc3545" : "#4caf50";

  text.innerText = `Punkte: ${questionPoint}`;
  if (konto) konto.innerText = `Konto: ${progressInRank} / ${rankMax} (${ranks[currentRank].name})`;
  if (medal) medal.src = ranks[currentRank]?.icon || "";
}

// #NEU: Lade Fortschritt aus der Datenbank
async function loadUserStatus() {
  try {
    const res = await fetch("/api/user_status", { credentials: "include" });
    const data = await res.json();
    if (data && !data.error) {
      questionPoint = data.total_points || 0;
      currentRank = data.current_rank || 0;
      progressInRank = data.progress_in_rank || 0;
    }
  } catch (err) {
    console.error("❌ Fehler beim Laden des Nutzerstatus:", err);
  }
}

// Neue Frage laden
async function loadQuestion() {
  const params = new URLSearchParams(window.location.search);
  const categories = params.get("categories");
  const selectedLabel = categories?.split(",")[0] || "Zahlen & Terme";
  const selectedCategory = categoryMap[selectedLabel] || "zahlen_terme";

  try {
    const response = await fetch(`/api/question?category=${encodeURIComponent(selectedCategory)}`);
    const data = await response.json();
    const questionText = document.getElementById("questionText");

    if (data.question) {
      questionText.innerText = data.question;
      document.getElementById("answerInput").value = "";
      document.getElementById("answerInput").style.display = "block";
      questionId = data.id;
    } else {
      questionText.innerText = `🎉 Quiz beendet! Gesamtpunktzahl: ${questionPoint}`;
      document.querySelector(".buton-weiter button").disabled = true;
      document.getElementById("answerInput").style.display = "none";
    }
  } catch (err) {
    console.error("❌ Fehler beim Laden der Frage:", err);
    alert("Fehler beim Laden der Frage.");
  }
}

// Antwort senden und bewerten
async function submitAnswer() {
  const button = document.querySelector(".buton-weiter button");
  const answer = document.getElementById("answerInput").value;
  button.disabled = true;
  button.style.backgroundColor = "#888";
  button.innerText = "Wird gesendet...";

  try {
    const response = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",  // für Sessions auf Render!
      body: JSON.stringify({ user_input: answer, question_id: questionId })
    });

    const result = await response.json();

    if (typeof result.score === "number") {
      const score = result.score;

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

      // Fortschritt aktualisieren
      progressInRank += (score > 0.65) ? 1 : -1;

      // Aufstieg im Rang
      while (progressInRank >= rankMax && currentRank < ranks.length - 1) {
        progressInRank -= rankMax;
        currentRank++;
        alert(`🎉 Neuer Rang: ${ranks[currentRank].name}`);
      }

      // Abstieg im Rang
      while (progressInRank < 0 && currentRank > 0) {
        currentRank--;
        progressInRank += rankMax;
        alert(`⬇️ Abgestiegen auf: ${ranks[currentRank].name}`);
      }

      updateScoreBar();

      // #NEU: Fortschritt an DB senden
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
    } else {
      alert("❌ Antwort konnte nicht bewertet werden.");
    }
  } catch (err) {
    alert("Verbindungsfehler. Bitte erneut versuchen.");
    console.error(err);
  }

  button.disabled = false;
  button.innerText = "Weiter";
  button.style.backgroundColor = "#0c702e";
}

// #NEU: Startablauf – zuerst gespeicherten Fortschritt laden
(async () => {
  await loadUserStatus(); // aus DB holen
  updateScoreBar();       // anzeigen
  loadQuestion();         // Frage laden
})();
