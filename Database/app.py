from flask import Flask, request
from database import init_db, load_questions_from_file

app = Flask(__name__)

@app.route("/")
def home():
    return "🚀 Die Lernplattform läuft!"

# 🔐 Geschützte Initialisierungsroute
@app.route("/init-db")
def initialize():
    secret = request.args.get("secret")
    if secret != "y698ZhPs72904Bncd":
        return "⛔ Nicht autorisiert", 403

    try:
        init_db()
        load_questions_from_file("fragen.json")
        return "✅ Datenbank erfolgreich initialisiert & Fragen geladen!"
    except Exception as e:
        return f"❌ Fehler bei der Initialisierung: {e}", 500
