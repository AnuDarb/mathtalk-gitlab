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
        <div v-if="question.question_type === 'drag_drop'">
          <div class="dragdrop-row">
            <div v-for="(ex, idx) in Object.keys(question.answer)" :key="ex" class="dragdrop-example" @dragover.prevent @drop="onDrop(ex)">
              <div>
                <template v-if="isImage(ex)">
                  <img :src="imageUrl(ex)" alt="Beispiel" class="drag-img" />
                </template>
                <template v-else>
                  {{ ex }}
                </template>
              </div>
              <div class="dropzone" :class="{filled: !!dragDropUserAnswers[ex]}" >
                <template v-if="dragDropUserAnswers[ex]">
                  <img v-if="isImage(dragDropUserAnswers[ex])" :src="imageUrl(dragDropUserAnswers[ex])" alt="Antwort" class="drag-img" />
                  <span v-else>{{ dragDropUserAnswers[ex] }}</span>
                </template>
                <span v-else style="color:#aaa;">Antwort hierher ziehen</span>
              </div>
            </div>
          </div>
          <div class="dragdrop-answers">
            <div v-for="ans in dragDropOptions" :key="ans" class="dragdrop-answer"
              draggable="true"
              @dragstart="onDragStart(ans)"
              :class="{used: Object.values(dragDropUserAnswers).includes(ans)}"
            >
              <img v-if="isImage(ans)" :src="imageUrl(ans)" alt="Antwort" class="drag-img" />
              <span v-else>{{ ans }}</span>
            </div>
          </div>
        </div>
        <div v-else class="text-input-row">
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
const dragDropUserAnswers = ref<Record<string, string>>({})
const dragDropOptions = ref<string[]>([])
const questionsList = ref<any[]>([])
const dragData = ref<string | null>(null)

async function loadQuestionsOnce() {
  if (!category.value && route.query.category) {
    category.value = String(route.query.category)
  }
  // Filter für nur Drag&Drop-Fragen
  const onlyDragDrop = route.query.only_drag_drop === '1'
  if (!questionsList.value.length) {
    const res = await fetch(`/api/questions${category.value ? `?category=${category.value}` : ''}`)
    if (res.ok) {
      let questions = await res.json()
      if (onlyDragDrop) {
        questions = questions.filter((q: any) => q.question_type === 'drag_drop')
      }
      questionsList.value = questions
      questionIds = questions.map((q: any) => q.id)
    }
  }
}

async function loadQuestion() {
  if (q_idx.value < questionIds.length && questionsList.value.length) {
    const q = questionsList.value[q_idx.value]
    // answer ggf. parsen
    if (q.question_type === 'drag_drop' && typeof q.answer === 'string') {
      try {
        q.answer = JSON.parse(q.answer)
      } catch (e) {
        q.answer = {}
      }
    }
    question.value = q
    userInput.value = ''
    answered.value = false
    feedback.value = ''
    showingHint.value = false
    // Drag&Drop-Init
    if (question.value.question_type === 'drag_drop') {
      dragDropUserAnswers.value = {}
      dragDropOptions.value = Object.values(question.value.answer)
    }
    await loadProgress()
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
  if (question.value.question_type === 'drag_drop') {
    // Prüfe, ob alle Felder ausgefüllt
    const userAns = dragDropUserAnswers.value
    if (Object.keys(userAns).length !== Object.keys(question.value.answer).length || Object.values(userAns).some(v => !v)) {
      feedback.value = 'Bitte ordne allen Beispielen eine Antwort zu.'
      return
    }
    // Sende Zuordnung als user_input
    const res = await fetch('/api/evaluate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        question_id: question.value.id,
        user_input: userAns
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
    await loadQuestionsOnce()
    await loadQuestion()
  } else {
    loginOk.value = false
    loginError.value = loginData.error || 'Login fehlgeschlagen.'
  }
}

function onDragStart(ans: string) {
  dragData.value = ans
}
function onDrop(ex: string) {
  if (!answered.value && dragData.value) {
    // Nur eine Antwort pro Beispiel, Antwort darf nicht doppelt vergeben werden
    if (!Object.values(dragDropUserAnswers.value).includes(dragData.value)) {
      dragDropUserAnswers.value[ex] = dragData.value
    }
    dragData.value = null
  }
}

function isImage(val: string) {
  return typeof val === 'string' && val.startsWith('images/') && (val.endsWith('.png') || val.endsWith('.jpg') || val.endsWith('.jpeg') || val.endsWith('.svg'))
}
function imageUrl(val: string) {
  return isImage(val) ? `/static/${val}` : ''
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
.dragdrop-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}
.dragdrop-example {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #f9fafb;
}
.dragdrop-example div {
  flex: 1;
  font-size: 1rem;
  color: #374151;
}
.dragdrop-answers {
  display: flex;
  flex-direction: row;
  gap: 16px;
  margin-top: 18px;
  justify-content: center;
  flex-wrap: wrap;
}
.dragdrop-answer {
  background: #e0e7ef;
  color: #22223b;
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 1.08rem;
  cursor: grab;
  border: 1px solid #cbd5e1;
  user-select: none;
  transition: background 0.2s, color 0.2s;
}
.dragdrop-answer.used {
  opacity: 0.5;
  pointer-events: none;
}
.dropzone {
  min-width: 80px;
  min-height: 32px;
  border: 2px dashed #cbd5e1;
  border-radius: 6px;
  padding: 6px 12px;
  margin-left: 16px;
  display: inline-block;
  vertical-align: middle;
  background: #f8fafc;
  transition: border 0.2s;
}
.dropzone.filled {
  border-style: solid;
  border-color: #3b82f6;
  background: #e0f2fe;
}
.drag-img {
  max-width: 240px;
  max-height: 240px;
  display: inline-block;
  vertical-align: middle;
  margin: 0 4px;
}
</style>