<template>
  <div class="menu-container">
    <h1>Mathtalk</h1>
    <div class="dashboard">
      <div>
        <span>Beantwortet</span>
        <div class="dashboard-value">{{ progress.answered }}</div>
      </div>
      <div>
        <span>Verbleibend</span>
        <div class="dashboard-value">{{ progress.remaining }}</div>
      </div>
      <div>
        <span>Wiederholen</span>
        <div class="dashboard-value">{{ progress.wrong }}</div>
      </div>
      <div>
        <span>Gesamt</span>
        <div class="dashboard-value">{{ progress.total_questions }}</div>
      </div>
    </div>
    <h2>Wähle einen Themenbereich:</h2>
    <div class="category-auswahl">
      <label v-for="category in categories" :key="category.value" style="display:block; margin-bottom:6px;">
        <input type="radio" v-model="selectedcategory" :value="category.value" />
        {{ category.label }}
      </label>
    </div>
    <button @click="startQuiz" :disabled="!selectedcategory">Übungsmodus starten</button>
    <button @click="reset" style="background:#ef4444; color:#fff; margin-top:10px;">Fortschritt zurücksetzen</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const progress = ref({answered: 0, remaining: 0, wrong: 0, total_questions: 0})
const categories = [
  { label: 'Zahlen und Terme', value: 'zahlen_terme' },
  { label: 'Funktionen und Algebra', value: 'funktionen_algebra' },
  { label: 'Geometrie und Raum', value: 'geometrie_raum' },
  { label: 'Stochastik', value: 'stochastik' }
]
const selectedcategory = ref(categories[0].value)

async function loadProgress() {
  const res = await fetch('/api/progress')
  progress.value = await res.json()
}

async function reset() {
  await fetch('/api/reset', {method: 'POST'})
  await loadProgress()
}

function startQuiz() {
  if (selectedcategory.value) {
    router.push({ path: '/quiz', query: { category: selectedcategory.value } })
  }
}

onMounted(loadProgress)
</script>

<style scoped>
.menu-container {
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
h1 {
  margin-bottom: 0;
  font-size: 2.2rem;
  letter-spacing: 1px;
}
.dashboard {
  margin-bottom: 0;
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  background: #f3f4f6;
  border-radius: 10px;
  padding: 18px 24px;
  font-size: 1.08rem;
  box-sizing: border-box;
  gap: 8px;
}
.dashboard > div {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.dashboard span {
  font-size: 1.02rem;
  color: #64748b;
  margin-bottom: 2px;
}
.dashboard-value {
  font-size: 1.32rem;
  font-weight: bold;
  color: #22223b;
  margin-top: 2px;
}
.category-auswahl {
  margin-bottom: 0;
  width: 100%;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.category-auswahl label {
  display: flex;
  align-items: center;
  font-size: 1.08rem;
  gap: 10px;
}
button {
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 8px;
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
</style>