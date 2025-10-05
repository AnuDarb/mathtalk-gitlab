
// Dieses Skript rendert das Quiz-UI und steuert die gesamte Logik für den Übungsmodus
(function () {

  // Hilfsfunktionen
  // Prüft, ob der Wert ein Bildpfad ist (nur bestimmte Bildformate erlaubt)
  function isImage(val) {
    return typeof val === 'string' && val.startsWith('images/') && (val.endsWith('.png') || val.endsWith('.jpg') || val.endsWith('.jpeg') || val.endsWith('.svg'));
  }
  // Gibt die URL für ein Bild zurück, falls es ein Bild ist, sonst leerer String
  function imageUrl(val) {
    return isImage(val) ? "static/" + val : '';
  }


  // Zustandsvariablen
  let question = null; // Aktuelle Frage
  let userInput = ''; // Benutzereingabe (Text oder Auswahl)
  let answered = false; // Wurde die aktuelle Frage schon beantwortet?
  let feedback = ''; // Feedback-Text (richtig/falsch)
  let q_idx = 0; // Index der aktuellen Frage (für Skip)
  let progress = { remaining: 0, wrong: 0 }; // Fortschritt: verbleibende und falsche Antworten

  // Kategorien aus URL-Parametern holen (können mehrere sein)
  let categories = null;
  let grade = null;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('categories')) {
      categories = params.getAll('categories');
    }
    if (params.has('grade')) {
      grade = params.get('grade');
    }
  } catch (e) { }
  let showingHint = false; // Wird der Hinweis angezeigt?
  let dragDropUserAnswers = {}; // User-Antworten für Drag&Drop-Fragen
  let dragDropOptions = []; // Antwortmöglichkeiten für Drag&Drop
  let dragData = null; // Aktuell gezogene Antwort bei Drag&Drop


  // Referenzen auf DOM-Elemente
  const questionTitle = document.getElementById('question-title'); // Überschrift der Frage
  const quizContent = document.getElementById('quiz-content'); // Container für die Frage und Eingabe
  const mainContainer = document.querySelector('.container'); // Hauptcontainer für Swipe/Animation
  // Disable text selection on swipe container
  if (mainContainer) {
    mainContainer.style.userSelect = 'none';
    mainContainer.style.webkitUserSelect = 'none';
    mainContainer.style.msUserSelect = 'none';
    mainContainer.style.mozUserSelect = 'none';
  }
  const feedbackEl = document.getElementById('feedback'); // Feedback-Anzeige
  const hintBox = document.getElementById('hint-box'); // Hinweis-Anzeige
  const remainingEl = document.getElementById('remaining'); // Anzeige verbleibender Fragen
  const wrongEl = document.getElementById('wrong'); // Anzeige falscher Antworten
  const videoLink = document.getElementById('video-link'); // Link zum Erklärvideo
  // Swipe-Gesten für Navigation
  let touchStartX = null;
  let touchStartY = null;
  let mouseDownX = null;
  let mouseDownY = null;
  let mouseIsDown = false;

  // Swipe Logik for mobile Geräte (Touch)
  function handleTouchStart(e) {
    if (e.target.closest('input, textarea, button, .dragdrop-answer, .dropzone')) return;
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }
  function handleTouchEnd(e) {
    if (touchStartX === null || touchStartY === null) return;
    const t = (e.changedTouches && e.changedTouches[0]) || e;
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    // Nur horizontale Swipes mit ausreichender Distanz berücksichtigen (50px)
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && q_idx > 0) {
        goToPrevious();
      } else if (dx < 0) {
        goToNext();
      }
    }
    touchStartX = null;
    touchStartY = null;
  }

  // Swipe Logik für Desktop (Maus)
  function handleMouseDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest('input, textarea, button, .dragdrop-answer, .dropzone')) return;
    mouseIsDown = true;
    mouseDownX = e.clientX;
    mouseDownY = e.clientY;
  }
  function handleMouseUp(e) {
    if (!mouseIsDown || mouseDownX === null || mouseDownY === null) return;
    const dx = e.clientX - mouseDownX;
    const dy = e.clientY - mouseDownY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && q_idx > 0) {
        goToPrevious();
      } else if (dx < 0) {
        goToNext();
      }
    }
    mouseIsDown = false;
    mouseDownX = null;
    mouseDownY = null;
  }

  // Animation für den Wechsel
  function animateSwap(direction) {
    if (!mainContainer) return;
    mainContainer.classList.remove('swap-left', 'swap-right');
    void mainContainer.offsetWidth; // Reflow
    mainContainer.classList.add(direction === 'left' ? 'swap-left' : 'swap-right');
    setTimeout(() => {
      mainContainer.classList.remove('swap-left', 'swap-right');
    }, 400);
  }

  // Render-Funktion: Baut das UI für die aktuelle Frage und hängt Event-Listener an
  function render(swapDirection) {
    // Wenn keine Frage mehr vorhanden ist (Quiz beendet)
    if (!question) {
      questionTitle.textContent = '';
      quizContent.innerHTML = `<div key="end"><h2>Quiz beendet!</h2>`;
      feedbackEl.style.display = 'none';
      hintBox.style.display = 'none';
      // Orange Buttons: Nur Neustart und Menü erlauben
      document.getElementById('submit-btn').disabled = true;
      document.getElementById('skip-btn').disabled = true;
      document.getElementById('hint-btn').disabled = true;
      document.getElementById('menu-btn').disabled = false;
      document.getElementById('menu-btn').onclick = goToMenu;
      return;
    }
    // Frage anzeigen
    questionTitle.textContent = question.question;
    let questionHtml = '';
    // Drag&Drop-Fragetyp
    if (question.question_type === 'drag_drop') {
      questionHtml = `
        <div class="dragdrop-row">
          ${Object.keys(question.answer).map(ex => `
            <div class="dragdrop-example">
              <div>${isImage(ex) ? `<img src="${imageUrl(ex)}" alt="${ex}" class="drag-img" />` : ex}</div>
              <div class="dropzone${dragDropUserAnswers[ex] ? ' filled' : ''}" data-ex="${ex}">
                ${dragDropUserAnswers[ex] ? (
                  (dragDropUserAnswers[ex]) ? `<img src="${imageUrl(dragDropUserAnswers[ex])}" alt="Antwort" class="drag-img" />` : `<span>${dragDropUserAnswers[ex]}</span>`) : '<span style="color:#aaa;">Antwort hierher ziehen</span>'}
              </div>
            </div>
          `).join('')}
        </div>
        <div class="dragdrop-answers">
          ${dragDropOptions.map(ans => `
            <div class="dragdrop-answer${Object.values(dragDropUserAnswers).includes(ans) ? ' used' : ''}" draggable="true" data-ans="${ans}">
              ${isImage(ans) ? `<img src="${imageUrl(ans)}" alt="Antwort" class="drag-img" />` : `<span>${ans}</span>`}
            </div>
          `).join('')}
        </div>
      `;
    } else if (question.question_type === 'multiple_choice') {
      // Multiple-Choice-Fragetyp
      questionHtml = `
        <div class="multiple-choice-row">
          ${question.choices.map(option => `
            <div class="multiple-choice-option">
              <label class="${userInput === option ? 'selected' : ''}${answered ? ' disabled' : ''}" style="display:flex;align-items:center;gap:10px;cursor:pointer;">
                <input type="radio" name="mc" value="${option}" ${userInput === option ? 'checked' : ''} ${answered ? 'disabled' : ''} />
                <span>${option}</span>
              </label>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      // Freitext-Fragetyp
      questionHtml = `
        <div class="text-input-row">
          <input id="answer-input" class="answer-input" type="text" placeholder="Antwort eingeben..." value="${userInput}" ${answered ? 'disabled' : ''} />
        </div>
      `;
    }
    // Frage-HTML einfügen
    quizContent.innerHTML = questionHtml;
    // Swipe-Event-Listener auf mainContainer
    if (mainContainer) {
      mainContainer.removeEventListener('touchstart', handleTouchStart);
      mainContainer.removeEventListener('touchend', handleTouchEnd);
      mainContainer.removeEventListener('mousedown', handleMouseDown);
      mainContainer.removeEventListener('mouseup', handleMouseUp);
      mainContainer.addEventListener('touchstart', handleTouchStart);
      mainContainer.addEventListener('touchend', handleTouchEnd);
      mainContainer.addEventListener('mousedown', handleMouseDown);
      mainContainer.addEventListener('mouseup', handleMouseUp);
    }
    if (swapDirection) animateSwap(swapDirection);
    // Feedback und Hinweis anzeigen
    feedbackEl.textContent = feedback;
    feedbackEl.style.display = feedback ? 'block' : 'none';
    hintBox.textContent = question.hint_text ? `💡 ${question.hint_text}` : '';
    hintBox.style.display = showingHint && question.hint_text ? 'block' : 'none';
    // Fortschritt aktualisieren
    remainingEl.textContent = progress.remaining;
    wrongEl.textContent = progress.wrong;
    // Event-Listener für Drag&Drop
    if (question.question_type === 'drag_drop') {
      quizContent.querySelectorAll('.dragdrop-answer').forEach(el => {
        el.addEventListener('dragstart', e => {
          dragData = el.getAttribute('data-ans');
        });
      });
      quizContent.querySelectorAll('.dropzone').forEach(el => {
        el.addEventListener('dragover', e => e.preventDefault());
        el.addEventListener('drop', e => {
          const ex = el.getAttribute('data-ex');
          if (!answered && dragData && !Object.values(dragDropUserAnswers).includes(dragData)) {
            dragDropUserAnswers[ex] = dragData;
            dragData = null;
            render();
          }
        });
      });
    }
    // Event-Listener für Multiple-Choice
    if (question.question_type === 'multiple_choice') {
      quizContent.querySelectorAll('input[type=radio][name=mc]').forEach(el => {
        el.addEventListener('change', e => {
          userInput = el.value;
          submitAnswer();
        });
      });
    }
    // Event-Listener für Freitext-Eingabe
    if (question.question_type !== 'drag_drop' && question.question_type !== 'multiple_choice') {
      const input = document.getElementById('answer-input');
      if (input) {
        input.addEventListener('input', e => {
          userInput = input.value;
        });
        input.addEventListener('keyup', e => {
          if (e.key === 'Enter') submitAnswer();
        });
      }
    }
    // Orange Buttons immer aktivieren und Event-Listener anhängen
    document.getElementById('submit-btn').disabled = false;
    document.getElementById('skip-btn').disabled = false;
    document.getElementById('hint-btn').disabled = false;
    document.getElementById('submit-btn').onclick = submitAnswer;
    document.getElementById('skip-btn').onclick = skip;
    document.getElementById('hint-btn').onclick = showHintToggle;

    videoLink.style.display = question.video_url ? 'inline-block' : 'none';
    videoLink.href = question.video_url || '#';
  }

  // API calls
  async function loadQuestion(swapDirection) {
    let url = '/api/question';
    let params = [];
    if (categories && categories.length > 0) {
      params.push('categories=' + encodeURIComponent(categories.join(',')));
    }
    if (grade) {
      params.push('grade=' + encodeURIComponent(grade));
    }
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    const res = await fetch(url);
    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }
    if (res.ok) {
      let q = await res.json();
      // Accept any object with a question_type and question as a valid question, even if answer/choices are null (classic)
      if (q && typeof q === 'object' && q.question_type && q.question) {
        if (q.question_type === 'drag_drop' && typeof q.answer === 'string') {
          try { q.answer = JSON.parse(q.answer); } catch { q.answer = {}; }
        }
        if (q.question_type === 'multiple_choice' && typeof q.choices === 'string') {
          try { q.choices = JSON.parse(q.choices); } catch { q.choices = []; }
        }
        question = q;
        userInput = '';
        answered = false;
        feedback = '';
        showingHint = false;
        if (question.question_type === 'drag_drop') {
          dragDropUserAnswers = {};
          dragDropOptions = Object.values(question.answer);
        }
        if (question.question_type === 'multiple_choice') {
          userInput = '';
        }
        await loadProgress();
        render(swapDirection);
      } else {
        question = null;
        render(swapDirection);
      }
    } else {
      question = null;
      render(swapDirection);
    }
  }

  async function submitAnswer() {
    if (answered) {
      await loadQuestion();
      document.getElementById('submit-btn').textContent = 'Antworten';
      return;
    }
    if (question.question_type === 'drag_drop') {
      const userAns = dragDropUserAnswers;
      if (Object.keys(userAns).length !== Object.keys(question.answer).length || Object.values(userAns).some(v => !v)) {
        feedback = 'Bitte ordne allen Beispielen eine Antwort zu.';
        render();
        return;
      }
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: question.id, user_input: userAns })
      });
      const data = await res.json();
      feedback = data.error ? data.error : (data.is_correct ? 'Richtig!' : 'Leider falsch.');
      answered = true;
      document.getElementById('submit-btn').textContent = 'Weiter';

      await loadProgress();
      render();
      return;
    }
    if (question.question_type === 'multiple_choice') {
      if (!userInput) return;
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: question.id, user_input: userInput })
      });
      const data = await res.json();
      feedback = data.error ? data.error : (data.is_correct ? 'Richtig!' : 'Leider falsch.');
      answered = true;
      document.getElementById('submit-btn').textContent = 'Weiter';
      await loadProgress();
      render();
      return;
    }
    if (!userInput) return;
    const res = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_id: question.id, user_input: userInput })
    });
    const data = await res.json();
    feedback = data.error ? data.error : (data.is_correct ? 'Richtig!' : 'Leider falsch.');
    answered = true;
    document.getElementById('submit-btn').textContent = 'Weiter';
    await loadProgress();
    render();
  }

  async function skip() {
    q_idx++;
    await loadQuestion('right');
  }

  async function goToPrevious() {
    if (q_idx > 0) {
      q_idx--;
      await loadQuestion('left');
    }
  }

  async function goToNext() {
    q_idx++;
    await loadQuestion('right');
  }

  async function loadProgress() {
    let url = '/api/progress';
    let params = [];
    if (categories && categories.length > 0) {
      params.push('categories=' + encodeURIComponent(categories.join(',')));
    }
    if (grade) {
      params.push('grade=' + encodeURIComponent(grade));
    }
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    const res = await fetch(url);
    progress = await res.json();
  }

  function showHintToggle() {
    showingHint = !showingHint;
    render();
  }

  // Header-Elemente
  const profilIcon = document.getElementById("profilIcon");
  const dropdown = document.getElementById("profilDropdown");
  // Inhalt auf 2 Buttons reduzieren (Profil zuerst)
  if (dropdown) {
    dropdown.innerHTML =
      `
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
    { name: "Anfänger", icon: "/static/images/anfaenger_medaille.png" },
    { name: "Schüler", icon: "/static/images/schueler_medaille.png" },
    { name: "Mathelehrer", icon: "/static/images/Mathelehrer_Medaille.png" },
    { name: "Professor", icon: "/static/images/Professor_Mathematik_Medaille.png" }
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

  // Start
  loadQuestion();
})();
