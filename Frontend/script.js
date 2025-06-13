const questions = [
    {
        question: "Was ist 2 + 2?",
        answers: ["3", "4", "5", "6"],
        correct: 1
    },
    {
        question: "Wie viele Tage hat eine Woche?",
        answers: ["5", "6", "7", "8"],
        correct: 2
    },
    {
        question: "Welche Farbe hat der Himmel?",
        answers: ["Grün", "Blau", "Rot", "Gelb"],
        correct: 1
    }
];

let currentQuestion = 0;
let score = 0;

function showQuestion() {
    const q = questions[currentQuestion];
    document.getElementById('question').textContent = q.question;
    const answersDiv = document.getElementById('answers');
    answersDiv.innerHTML = '';
    q.answers.forEach((answer, idx) => {
        const btn = document.createElement('button');
        btn.textContent = answer;
        btn.onclick = () => selectAnswer(idx);
        answersDiv.appendChild(btn);
    });
    document.getElementById('next-btn').style.display = 'none';
    document.getElementById('result').textContent = '';
}

function selectAnswer(idx) {
    const q = questions[currentQuestion];
    const buttons = document.querySelectorAll('#answers button');
    buttons.forEach((btn, i) => {
        btn.disabled = true;
        if (i === q.correct) {
            btn.style.background = '#a5d6a7';
        }
        if (i === idx && i !== q.correct) {
            btn.style.background = '#ef9a9a';
        }
    });
    if (idx === q.correct) {
        score++;
        document.getElementById('result').textContent = 'Richtig!';
    } else {
        document.getElementById('result').textContent = 'Falsch!';
    }
    document.getElementById('next-btn').style.display = 'block';
}

document.getElementById('next-btn').onclick = () => {
    currentQuestion++;
    if (currentQuestion < questions.length) {
        showQuestion();
    } else {
        showResult();
    }
};

function showResult() {
    document.getElementById('question').textContent = 'Quiz beendet!';
    document.getElementById('answers').innerHTML = '';
    document.getElementById('next-btn').style.display = 'none';
    document.getElementById('result').textContent = `Du hast ${score} von ${questions.length} richtig beantwortet.`;
}

showQuestion();
