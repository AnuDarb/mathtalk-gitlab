# Mathtalk – Schnellstart

Dieses Projekt besteht aus drei Teilen:
- **Backend**: Flask-API (Python)
- **Frontend**: Vue.js Single Page Application
- **Database**: SQLite-Datenbank, Initialisierungsskripte und Evaluierungsfunktionen

---

## 1. Datenbank initialisieren

1. Wechsle ins `Database`-Verzeichnis:
   ```powershell
   cd .\Database
   ```
2. (Optional) Aktiviere das Virtual Environment:
   ```powershell
   ..\Scripts\Activate.ps1
   ```
3. Installiere die Abhängigkeiten:
   ```powershell
   py -m pip install -r requirements.txt
   ```
4. Initialisiere die Datenbank:
   ```powershell
   py database.py
   ```
   Die Datei `mathtalk.db` wird im Verzeichnis erstellt.

---

## 2. Backend starten (Flask-API)

1. Wechsle ins `Backend`-Verzeichnis:
   ```powershell
   cd ..\Backend
   ```
2. Installiere die Abhängigkeiten:
   ```powershell
   pip install -r requirements.txt
   ```
3. Starte das Backend:
   ```powershell
   python app.py
   ```
   Das Backend läuft auf [http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## 3. Frontend starten (Vue.js)

1. Wechsle ins Frontend-Verzeichnis:
   ```powershell
   cd ..\Frontend\mathtalk-vue
   ```
2. Installiere die Abhängigkeiten:
   ```powershell
   npm install
   ```
3. Starte das Frontend im Entwicklungsmodus:
   ```powershell
   npm run dev
   ```
   Die App ist erreichbar unter [http://localhost:5173](http://localhost:5173) und kommuniziert per Proxy mit dem Backend.

---

## Hinweise
- Die API-URL ist im Frontend als Proxy konfiguriert (`/api` → Flask-Backend).
- Für den Produktivbetrieb ggf. CORS im Backend aktivieren.
- Weitere Details siehe die README-Dateien in den jeweiligen Unterordnern.
