document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  // 🛑 Leere Eingaben abfangen
  if (!email || !password) {
    alert("Bitte gib E-Mail und Passwort ein.");
    return;
  }

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (response.ok && result.status === "ok") {
      // ✅ Erfolgreich eingeloggt
      sessionStorage.setItem("email", email);  // 📨 E-Mail speichern
      window.location.href = "/dashboard";     // Weiterleitung zur Dashboard-Seite
    } else {
      // ❌ Login fehlgeschlagen
      alert(result.error || "E-Mail und Passwort stimmen nicht überein.");
    }

  } catch (err) {
    alert("Verbindungsfehler. Bitte versuche es erneut.");
    console.error(err);
  }
});
