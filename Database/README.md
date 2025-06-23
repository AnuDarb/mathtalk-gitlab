# Mathtalk Database

Dieses Verzeichnis enthält die Datenbank und zugehörige Initialisierungsskripte für das Mathtalk-Projekt.

## Inhalt

- **mathtalk.db**  
  Die SQLite-Datenbankdatei mit allen Fragen und Fortschrittsdaten.

- **init_db.py**  
  Python-Skript zum Anlegen der Datenbanktabellen und Hinzufügen von Beispiel-Fragen.  
  Führe dieses Skript aus, um die Datenbank zu initialisieren:
  ```bash
  python init_db.py
  ```

- **requirements.txt**  
  Listet die Python-Abhängigkeiten für die Datenbank-Initialisierung (z.B. Flask).

## Hinweise

- Die Datenbank wird von der Flask-Backend-App verwendet.
- Passe ggf. den Pfad zur Datenbank in den Python-Skripten an, falls du das Projekt verschiebst.

## Setup

1. Stelle sicher, dass Python installiert ist oder benutze das Virtual Environment (venv) mit `.\venv\bin\Activate.ps1` für PowerShell unter Windows 
2. Installiere die Abhängigkeiten:
   ```bash
   py -m pip install -r requirements.txt
   ```
3. Initialisiere die Datenbank:
   ```bash
   py init_db.py
   ```
4. Die Datei `mathtalk.db` wird im gleichen Verzeichnis erstellt.
