document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Bitte E-Mail und Passwort eingeben.");
    return;
  }

  const submitBtn = this.querySelector("button[type='submit']");
  if (submitBtn) submitBtn.disabled = true;

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Gleiche Origin -> Cookies/Session werden automatisch gesetzt
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (response.ok && result.status === "ok") {
      // Session wird serverseitig gesetzt; danach weiter zum Dashboard
      window.location.href = "/dashboard";
    } else {
      alert(result.error || "Login fehlgeschlagen.");
    }
  } catch (err) {
    alert("Verbindungsfehler. Bitte versuche es erneut.");
    console.error(err);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});
