from flask import Flask, request, jsonify, session
from database import init_db, load_questions_from_file, login_user
import os

app = Flask(__name__)
app.secret_key = "dein-geheimer_schlüssel"  # Für Session-Handling

@app.route("/")
def home():
    return "🚀 Die Lernplattform läuft!"

# 🔐 Datenbank-Initialisierung
@app.route("/init-db")
def initialize():
    secret = request.args.get("secret")
    if secret != "y698ZhPs72904Bncd":
        return "⛔ Nicht autorisiert", 403

    try:
        json_path = os.path.join(os.path.dirname(__file__), "fragen.json")
        init_db()
        load_questions_from_file(json_path)
        return "✅ Datenbank erfolgreich initialisiert & Fragen geladen!"
    except Exception as e:
        return f"❌ Fehler bei der Initialisierung: {e}", 500

# 🔐 Login-API
@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if login_user(email, password):
        session["user"] = email
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "message": "E-Mail oder Passwort falsch."}), 401

