# Backend

Dieses Verzeichnis enthält das Flask-Backend für die Mathtalk-Lernplattform.

## Inhalt

- `app.py`: Haupt-API-Server (Flask), Schnittstelle zum Frontend und zur Datenbank.

## Starten

1. Stelle sicher, dass die Abhängigkeiten installiert sind (`pip install -r ../requirements.txt`).
2. Starte das Backend mit:
   ```sh
   python app.py
   ```
3. Das Backend läuft standardmäßig auf [http://127.0.0.1:5000](http://127.0.0.1:5000).

## Hinweise

- Die API kommuniziert mit der SQLite-Datenbank im `Database`-Ordner.
- Für die Nutzung ist eine initialisierte Datenbank erforderlich (siehe [Database/README.md](../Database/README.md)).