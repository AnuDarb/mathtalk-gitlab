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
        json_path = os.path.join(os.path.dirname(__file__), "fragen.json")
        load_questions_from_file(json_path)
        return "✅ Datenbank erfolgreich initialisiert & Fragen geladen!"
    except Exception as e:
        return f"❌ Fehler bei der Initialisierung: {e}", 500
