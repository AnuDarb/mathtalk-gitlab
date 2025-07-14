# Database

Dieses Verzeichnis enthält die Datenbank, Initialisierungsskripte und Ressourcen für Mathtalk.

## Inhalt

- `database.py`: Initialisierung und Verwaltung der SQLite-Datenbank, User- und Fragenmanagement.
- `fragen.json`: Fragenpool für die Lernplattform (wird in die Datenbank importiert).
- `dictionary.txt`: Wörterbuch für die Auswertung und Ähnlichkeitsbewertung von Antworten.
- `.gitkeep`: Platzhalter für Git.

## Initialisierung

1. Wechsle in dieses Verzeichnis:
   ```sh
   cd Database
   ```
2. Initialisiere die Datenbank:
   ```sh
   python database.py
   ```
   Dadurch wird die Datei `mathtalk.db` erstellt und die Tabellen angelegt.

## Hinweise

- Die Datenbank wird vom Backend verwendet.
- Fragen können über `fragen.json` importiert werden.