<template>
  <div class="container" v-if="question">
    <h2>{{ question.question }}</h2>
    <div class="text-input-row">
      <input v-model="userInput" :disabled="answered" class="answer-input" type="text" placeholder="Antwort eingeben..." @keyup.enter="submitAnswer" />
    </div>
    <div class="button-row">
      <button @click="submitAnswer" style="width:160px;">
        {{ answered ? 'Weiter' : 'Antworten' }}
      </button>
      <button @click="skip" style="background:#f59e42;color:#fff;">Überspringen</button>
      <button @click="goToMenu" style="background:#64748b;color:#fff;">Zurück zum Menü</button>
    </div>
    <p v-if="feedback" class="message">{{ feedback }}</p>
    <div class="info">
      <p>Verbleibende Fragen: {{ progress.remaining }}</p>
      <p>Zu wiederholen: {{ progress.wrong }}</p>
    </div>
  </div>
  <div v-else>
    <h2>Quiz beendet!</h2>
    <button @click="reset">Neustarten</button>
    <button @click="goToMenu" style="background:#64748b;color:#fff; margin-left: 12px;">Zurück zum Menü</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const question = ref<any>(null)
const userInput = ref('')
const answered = ref(false)
const feedback = ref('')
const q_idx = ref(0)
const progress = ref({remaining: 0, wrong: 0})
const category = ref<string | null>(null)
let questionIds: number[] = []

async function loadQuestion() {
  if (!category.value && route.query.category) {
    category.value = String(route.query.category)
  }
  // Hole alle Fragen-IDs für die Kategorie (nur beim ersten Mal)
  if (questionIds.length === 0) {
    const res = await fetch(`/api/questions${category.value ? `?category=${category.value}` : ''}`)
    if (res.ok) {
      const questions = await res.json()
      questionIds = questions.map((q: any) => q.id)
    }
  }
  if (q_idx.value < questionIds.length) {
    const res = await fetch(`/api/question/${q_idx.value}${category.value ? `?category=${category.value}` : ''}`)
    if (res.ok) {
      question.value = await res.json()
      userInput.value = ''
      answered.value = false
      feedback.value = ''
      await loadProgress()
    } else {
      question.value = null
    }
  } else {
    question.value = null
  }
}

async function submitAnswer() {
  if (answered.value) {
    q_idx.value++
    await loadQuestion()
    return
  }
  if (!userInput.value) return
  // Sende Nutzereingabe an neuen Endpunkt
  const res = await fetch('/api/evaluate', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      question_id: question.value.id,
      user_input: userInput.value
    })
  })
  const data = await res.json()
  if (data.error) {
    feedback.value = data.error
  } else {
    feedback.value = data.is_correct ? 'Richtig!' : 'Leider falsch.'
  }
  answered.value = true
  await loadProgress()
}

async function skip() {
  await fetch(`/api/skip${category.value ? `?category=${category.value}` : ''}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({q_idx: q_idx.value})
  })
  q_idx.value++
  await loadQuestion()
}

async function reset() {
  await fetch(`/api/reset${category.value ? `?category=${category.value}` : ''}`, {method: 'POST'})
  q_idx.value = 0
  questionIds = []
  await loadQuestion()
}

async function loadProgress() {
  const res = await fetch('/api/progress')
  progress.value = await res.json()
}

function goToMenu() {
  router.push('/')
}

onMounted(loadQuestion)
</script>

<style scoped>
.container {
  max-width: 720px;
  min-height: 520px;
  margin: 60px auto;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 6px 32px rgba(0,0,0,0.10);
  padding: 48px 48px 36px 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 28px;
}
@media (max-width: 900px) {
  .container {
    max-width: 98vw;
    padding: 24px 8vw 24px 8vw;
  }
}
@media (max-width: 600px) {
  .container {
    max-width: 100vw;
    padding: 16px 2vw 16px 2vw;
    border-radius: 0;
    min-height: unset;
  }
  .answer-input {
    max-width: 100vw;
    font-size: 1rem;
  }
}
.text-input-row {
  width: 100%;
  margin-bottom: 18px;
  display: flex;
  justify-content: center;
}
.answer-input {
  width: 100%;
  max-width: 320px;
  padding: 12px 16px;
  font-size: 1.08rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  outline: none;
  margin-bottom: 0;
}
.button-row {
  display: flex;
  flex-direction: row;
  gap: 12px;
  justify-content: center;
  width: 100%;
  margin-top: 8px;
}
button {
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 14px 28px;
  font-size: 1.08rem;
  cursor: pointer;
  margin-top: 0;
  margin-bottom: 0;
  width: 100%;
  max-width: 320px;
  transition: background 0.2s;
}
button:hover {
  background: #2563eb;
}
.message {
  color: #16a34a;
  font-weight: 500;
  margin-bottom: 18px;
  text-align: center;
}
.info {
  color: #64748b;
  font-size: 0.98em;
  margin-top: 18px;
  text-align: center;
}
</style>