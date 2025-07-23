
// Dieses Skript rendert das Quiz-UI und steuert die gesamte Logik für den Übungsmodus

(function() {

  // Hilfsfunktionen
  // Prüft, ob der Wert ein Bildpfad ist (nur bestimmte Bildformate erlaubt)
  function isImage(val) {
    return typeof val === 'string' && val.startsWith('static/images/') && (val.endsWith('.png') || val.endsWith('.jpg') || val.endsWith('.jpeg') || val.endsWith('.svg'));
  }
  // Gibt die URL für ein Bild zurück, falls es ein Bild ist, sonst leerer String
  function imageUrl(val) {
    return isImage(val) ?  val : '';
  }


  // Zustandsvariablen
  let question = null; // Aktuelle Frage
  let userInput = ''; // Benutzereingabe (Text oder Auswahl)
  let answered = false; // Wurde die aktuelle Frage schon beantwortet?
  let feedback = ''; // Feedback-Text (richtig/falsch)
  let q_idx = 0; // Index der aktuellen Frage (für Skip)
  let progress = {remaining: 0, wrong: 0}; // Fortschritt: verbleibende und falsche Antworten

  // Kategorien aus URL-Parametern holen (können mehrere sein)
  let categories = null;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('categories')) {
      // Kann mehrfach vorkommen: ?categories=foo&categories=bar
      categories = params.getAll('categories');
    }
  } catch (e) {}
  let questionIds = []; // IDs der gestellten Fragen (optional)
  let showingHint = false; // Wird der Hinweis angezeigt?
  let dragDropUserAnswers = {}; // User-Antworten für Drag&Drop-Fragen
  let dragDropOptions = []; // Antwortmöglichkeiten für Drag&Drop
  let dragData = null; // Aktuell gezogene Antwort bei Drag&Drop


  // Referenzen auf DOM-Elemente
  const questionTitle = document.getElementById('question-title'); // Überschrift der Frage
  const quizContent = document.getElementById('quiz-content'); // Container für die Frage und Eingabe
  const feedbackEl = document.getElementById('feedback'); // Feedback-Anzeige
  const hintBox = document.getElementById('hint-box'); // Hinweis-Anzeige
  const remainingEl = document.getElementById('remaining'); // Anzeige verbleibender Fragen
  const wrongEl = document.getElementById('wrong'); // Anzeige falscher Antworten

  // Render-Funktion: Baut das UI für die aktuelle Frage und hängt Event-Listener an
  function render() {
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
      document.getElementById('submit-btn').onclick = reset;
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
              <div>${isImage(ex) ? `<img src="${imageUrl(ex)}" alt="Beispiel" class="drag-img" />` : ex}</div>
              <div class="dropzone${dragDropUserAnswers[ex] ? ' filled' : ''}" data-ex="${ex}">
                ${dragDropUserAnswers[ex] ? (isImage(dragDropUserAnswers[ex]) ? `<img src="${imageUrl(dragDropUserAnswers[ex])}" alt="Antwort" class="drag-img" />` : `<span>${dragDropUserAnswers[ex]}</span>`) : '<span style="color:#aaa;">Antwort hierher ziehen</span>'}
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
    document.getElementById('menu-btn').disabled = false;
    document.getElementById('submit-btn').onclick = submitAnswer;
    document.getElementById('skip-btn').onclick = skip;
    document.getElementById('hint-btn').onclick = showHintToggle;
    document.getElementById('menu-btn').onclick = goToMenu;
  }

  // API calls
  async function loadQuestion() {
    let url = '/api/question';
    if (categories && categories.length > 0) {
      url += '?categories=' + encodeURIComponent(categories.join(','));
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
        render();
      } else {
        question = null;
        render();
      }
    } else {
      question = null;
      render();
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
        headers: {'Content-Type': 'application/json'},
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
        headers: {'Content-Type': 'application/json'},
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
      headers: {'Content-Type': 'application/json'},
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
    await loadQuestion();
  }

  async function reset() {
    let url = '/api/reset';
    if (categories && categories.length > 0) {
      url += '?categories=' + encodeURIComponent(categories.join(','));
    }
    await fetch(url, {method: 'POST'});
    q_idx = 0;
    questionIds = [];
    await loadQuestion();
  }

  async function loadProgress() {
    let url = '/api/progress';
    if (categories && categories.length > 0) {
      url += '?categories=' + encodeURIComponent(categories.join(','));
    }
    const res = await fetch(url);
    progress = await res.json();
  }

  function goToMenu() {
    window.location.href = '/dashboard';
  }

  function showHintToggle() {
    showingHint = !showingHint;
    render();
  }

  // Start
  loadQuestion();
})();
