document.getElementById("registerForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const passwordRepeat = document.getElementById("passwordRepeat").value.trim();

  if (password !== passwordRepeat) {
    alert("Die Passwörter stimmen nicht überein.");
    return;
  }

  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (response.ok && result.status === "ok") {
      alert("Registrierung erfolgreich! Du kannst dich jetzt einloggen.");
      window.location.href = "login.html";
    } else {
      alert(result.error || "Registrierung fehlgeschlagen.");
    }
  } catch (err) {
    alert("Verbindungsfehler. Bitte versuche es erneut.");
    console.error(err);
  }
});
