<template>
  <transition :name="transitionName" mode="out-in">
    <div v-if="loginOk">
      <div class="container" v-if="question"
        :key="q_idx"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
        @mousedown="handleMouseDown"
        @mouseup="handleMouseUp"
      >
        <div class="user-info">Angemeldet als: <b>test@example.com</b></div>
        <h2>{{ question.question }}</h2>
        <div class="text-input-row">
          <input v-model="userInput" :disabled="answered" class="answer-input" type="text" placeholder="Antwort eingeben..." @keyup.enter="submitAnswer" />
        </div>
        <div class="button-row">
          <button @click="submitAnswer" style="width:160px;">
            {{ answered ? 'Weiter' : 'Antworten' }}
          </button>
          <button @click="skip" style="background:#f59e42;color:#fff;">Überspringen</button>
          <button @click="showHint" style="background:#fbbf24;color:#22223b;">Hinweis</button>
          <button @click="goToMenu" style="background:#64748b;color:#fff;">Zurück zum Menü</button>
        </div>
        <p v-if="feedback" class="message" v-html="feedback"></p>
        <p v-if="showingHint && question && question.hint_text" class="hint-box">💡 {{ question.hint_text }}</p>
        <div class="info">
          <p>Verbleibende Fragen: {{ progress.remaining }}</p>
          <p>Zu wiederholen: {{ progress.wrong }}</p>
        </div>
      </div>
      <div v-else key="end">
        <h2>Quiz beendet!</h2>
        <button @click="reset">Neustarten</button>
        <button @click="goToMenu" style="background:#64748b;color:#fff; margin-left: 12px;">Zurück zum Menü</button>
      </div>
    </div>
    <div v-else-if="loginError" class="user-info" style="color:#ef4444;">{{ loginError }}</div>
  </transition>
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
const transitionName = ref('slide-fade')
const showingHint = ref(false)
const loginOk = ref(false)
const loginError = ref('')

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
      showingHint.value = false
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

function showHint() {
  showingHint.value = !showingHint.value
}

let touchStartX = 0
let touchEndX = 0

function handleTouchStart(e: TouchEvent) {
  touchStartX = e.changedTouches[0].screenX
}
function handleTouchEnd(e: TouchEvent) {
  touchEndX = e.changedTouches[0].screenX
  handleSwipe()
}
function handleSwipe() {
  const diff = touchEndX - touchStartX
  if (Math.abs(diff) > 60) {
    if (diff < 0) {
      // Swipe nach links: nächste Frage
      if (q_idx.value < questionIds.length - 1) {
        transitionName.value = 'slide-left'
        q_idx.value++
        loadQuestion()
      }
    } else {
      // Swipe nach rechts: vorherige Frage (falls möglich)
      if (q_idx.value > 0) {
        transitionName.value = 'slide-right'
        q_idx.value--
        loadQuestion()
      }
    }
  }
}

let mouseDownX = 0
let mouseUpX = 0

function handleMouseDown(e: MouseEvent) {
  mouseDownX = e.screenX
}
function handleMouseUp(e: MouseEvent) {
  mouseUpX = e.screenX
  handleMouseSwipe()
}
function handleMouseSwipe() {
  const diff = mouseUpX - mouseDownX
  if (Math.abs(diff) > 60) {
    if (diff < 0) {
      // Maus nach links: nächste Frage
      if (q_idx.value < questionIds.length - 1) {
        transitionName.value = 'slide-left'
        q_idx.value++
        loadQuestion()
      }
    } else {
      // Maus nach rechts: vorherige Frage
      if (q_idx.value > 0) {
        transitionName.value = 'slide-right'
        q_idx.value--
        loadQuestion()
      }
    }
  }
}

async function loginAndLoad() {
  const loginRes = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'meinpasswort123'
    })
  })
  const loginData = await loginRes.json()
  if (loginRes.ok) {
    loginOk.value = true
    loginError.value = ''
    await loadQuestion()
  } else {
    loginOk.value = false
    loginError.value = loginData.error || 'Login fehlgeschlagen.'
  }
}

onMounted(loginAndLoad)
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
@media screen and (max-width: 900px) {
  .container {
    max-width: 98vw;
    padding: 24px 8vw 24px 8vw;
  }
}
@media screen and (max-width: 600px) {
  .container {
    max-width: 100vw !important;
    padding: 10px !important;
    min-height: unset !important;
    gap: 18px !important;
  }
  h2 {
    font-size: 1.15rem !important;
    margin-bottom: 10px !important;
    text-align: center !important;
  }
  .answer-input {
    max-width: 100vw !important;
    font-size: 1rem !important;
    padding: 10px 8px !important;
    border-radius: 6px !important;
  }
  .button-row {
    flex-direction: column !important;
    gap: 8px !important;
    width: 100% !important;
    margin-top: 6px !important;
    align-items: stretch !important;
  }
  button {
    font-size: 0.98rem !important;
    padding: 9px 0 !important;
    max-width: 100% !important;
    width: 100% !important;
    border-radius: 7px !important;
    margin: 0 !important;
    min-height: 36px !important;
  }
  .info {
    font-size: 0.95em !important;
    margin-top: 10px !important;
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
.hint-box {
  background: #fef9c3;
  color: #b45309;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 12px 18px;
  margin: 12px 0 0 0;
  font-size: 1.08rem;
  text-align: center;
  box-shadow: 0 2px 8px rgba(251,191,36,0.08);
}
.slide-fade-enter-active, .slide-fade-leave-active {
  transition: all 0.35s cubic-bezier(.4,1.3,.6,1);
}
.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(60px);
}
.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-60px);
}
.slide-left-enter-active, .slide-left-leave-active {
  transition: all 0.35s cubic-bezier(.4,1.3,.6,1);
}
.slide-left-enter-from {
  opacity: 0;
  transform: translateX(100%);
}
.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-100%);
}
.slide-right-enter-active, .slide-right-leave-active {
  transition: all 0.35s cubic-bezier(.4,1.3,.6,1);
}
.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-100%);
}
.slide-right-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
.user-info {
  color: #374151;
  font-size: 0.9rem;
  margin-bottom: 16px;
  text-align: center;
  width: 100%;
}
</style>