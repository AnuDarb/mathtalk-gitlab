# Mathtalk Backend

Dieses Verzeichnis enthält das Flask-Backend für das Mathtalk-Projekt. Das Backend stellt eine REST-API bereit, über die das Frontend (Vue.js-App) auf Fragen, Fortschritt und Resetfunktionen zugreifen kann.

## Inhalt

- **app.py**  
  Hauptdatei des Flask-Servers mit allen API-Endpunkten für Quiz, Fortschritt und Reset.

- **requirements.txt**  
  Listet die Python-Abhängigkeiten für das Backend (z.B. Flask, sqlite3).

## API-Endpunkte (Auszug)

- `GET /api/questions` – Alle Fragen abrufen
- `GET /api/question/<q_idx>` – Einzelne Frage abrufen
- `POST /api/answer` – Antwort auf eine Frage absenden
- `POST /api/skip` – Frage überspringen
- `POST /api/reset` – Fortschritt zurücksetzen (Resetfunktion)
- `GET /api/progress` – Fortschritt und Statistiken abrufen

## Setup

1. Stelle sicher, dass Python installiert ist.
2. Installiere die Abhängigkeiten:
   ```bash
   pip install -r requirements.txt
   ```
3. Starte das Backend:
   ```bash
   python app.py
   ```
   Der Server läuft standardmäßig auf [http://127.0.0.1:5000](http://127.0.0.1:5000).

4. Stelle sicher, dass die Datei `mathtalk.db` im richtigen Verzeichnis liegt (siehe [../Database](../Database)).

## Hinweise

- Das Backend ist für die Nutzung mit dem Frontend (Vue.js) ausgelegt.
- Die API verwendet Sessions für den Nutzerfortschritt.
