<template>
  <div class="menu-container">
    <h1>Mathtalk</h1>
    <div class="dashboard">
      <p>Beantwortet: {{ progress.answered }}</p>
      <p>Verbleibend: {{ progress.remaining }}</p>
      <p>Zu wiederholen: {{ progress.wrong }}</p>
      <p>Gesamt: {{ progress.total_questions }}</p>
    </div>
    <button @click="$router.push('/quiz')">Übungsmodus starten</button>
    <button @click="reset" style="background:#ef4444; color:#fff; margin-top:10px;">Fortschritt zurücksetzen</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const progress = ref({answered: 0, remaining: 0, wrong: 0, total_questions: 0})

async function loadProgress() {
  const res = await fetch('/api/progress')
  progress.value = await res.json()
}

async function reset() {
  await fetch('/api/reset', {method: 'POST'})
  await loadProgress()
}

onMounted(loadProgress)
</script>

<style scoped>
.menu-container { max-width: 400px; margin: 40px auto; background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); padding: 36px 40px 28px 40px; display: flex; flex-direction: column; align-items: center; }
button { background: #3b82f6; color: #fff; border: none; border-radius: 6px; padding: 10px 22px; font-size: 1rem; cursor: pointer; margin-top: 8px; }
button:hover { background: #2563eb; }
.dashboard { margin-bottom: 24px; }
</style>