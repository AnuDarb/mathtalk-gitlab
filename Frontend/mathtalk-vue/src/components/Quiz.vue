<template>
  <div class="container" v-if="question">
    <h2>{{ question.question }}</h2>
    <div class="choices">
      <label v-for="(choice, idx) in question.choices" :key="idx">
        <input type="radio" v-model="selected" :value="idx" :disabled="answered">
        <span style="font-weight:bold; margin-right:8px;">{{ ['A)', 'B)', 'C)', 'D)'][idx] }}</span>{{ choice }}
      </label>
    </div>
    <div class="button-row">
      <button  @click="submitAnswer" style="width:160px;">
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
import { useRouter } from 'vue-router'

const router = useRouter()

const question = ref<any>(null)
const selected = ref<number|null>(null)
const answered = ref(false)
const feedback = ref('')
const q_idx = ref(0)
const progress = ref({remaining: 0, wrong: 0})

async function loadQuestion() {
  const res = await fetch(`/api/question/${q_idx.value}`)
  if (res.ok) {
    question.value = await res.json()
    selected.value = null
    answered.value = false
    feedback.value = ''
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
  const res = await fetch('/api/answer', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({q_idx: q_idx.value, choice: selected.value})
  })
  const data = await res.json()
  feedback.value = data.feedback
  answered.value = true
  await loadProgress()
}

async function skip() {
  await fetch('/api/skip', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({q_idx: q_idx.value})
  })
  q_idx.value++
  await loadQuestion()
}

async function reset() {
  await fetch('/api/reset', {method: 'POST'})
  q_idx.value = 0
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
  max-width: 400px;
  margin: 40px auto;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  padding: 36px 40px 28px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.choices label {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  padding: 10px 16px;
  border-radius: 8px;
  background: #f7fafc;
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
  padding: 10px 22px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 8px;
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