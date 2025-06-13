# Aquise-Tool

## Projektübersicht
Das Aquise-Tool ist eine Komplettlösung für die automatisierte B2B-Leadgenerierung und -bewertung. Es findet, bewertet und verwaltet potenzielle Kunden (Leads) mit Fokus auf Unternehmen mit verbesserungswürdigen Websites. Ziel ist es, den Akquise-Prozess maximal effizient, skalierbar und DSGVO-konform zu gestalten.

---

## Hauptziele
- **Automatisiertes Crawling** von Branchenverzeichnissen (z. B. Gelbe Seiten)
- **Konfigurierbares Scoring** für Websites (Qualität, Technik, DSGVO, etc.)
- **Schnelle Lead-Bewertung** (Swipeboard, Browser-Extension)
- **Dashboard** mit Filter, Statistiken und Export
- **DSGVO-Check** und rechtliche Hinweise
- **Nahtlose Integration** von Worker-Prozessen und manueller Bewertung
- **Sicheres Login & User-Management** (NEU)

---

## Features
- **Automatisches Crawling**: Jobs für verschiedene Quellen, Fortschrittsanzeige, Fehlerhandling
- **Scoring-Engine**: Bewertet Websites nach technischen und rechtlichen Kriterien
- **Dashboard**: Übersicht, Filter, Statistiken, Export (CSV)
- **Swipeboard**: Leads schnell bewerten (Frontend & als Browser-Extension)
- **Job-Monitoring**: Status, Neustart, Fehleranzeige für alle Crawling/Scoring-Jobs
- **DSGVO-Check**: Automatische Prüfung auf Impressum, SSL, etc.
- **Browser-Extension**: Bewertungs-Overlay direkt im Tab, Hotkeys, Notizen
- **Login & User-Management (NEU)**: 
  - Sichere Authentifizierung (JWT, Passwort-Hashing)
  - Multi-User, Rollen (user, admin, superadmin)
  - Passwort-Änderung, Logout, Session bleibt erhalten
  - User-Verwaltung (nur für Superadmin): Nutzer anlegen, Rollen ändern, Passwort zurücksetzen

---

## Architektur
```
+-------------------+      +-------------------+      +-------------------+
|   Frontend (React)| <--> |   Backend (Node)  | <--> |   Datenbank (SQL) |
+-------------------+      +-------------------+      +-------------------+
         ^                        ^   ^
         |                        |   |
         |                        |   +--+-------------------+
         |                        |      |   Worker (Crawl/  |
         |                        |      |   Scoring, Node)  |
         |                        |      +-------------------+
         |                        |
         |                        +-------------------+
         |                                        |
         +-------------------+                    |
                             |                    |
                  Extension (Browser) <-----------+
```

### Komponenten
- **Backend:** Node.js/Express, REST-API, Job-Management, Schnittstelle zu Worker & DB
- **Frontend:** React, Dashboard, Swipeboard, Statistiken, Job-Monitoring, **Login & User-Management**
- **Worker:** Node.js-Skripte für Crawling & Scoring (separat startbar)
- **Datenbank:** MySQL/MariaDB, Tabellen für Leads, Jobs, User
- **Extension:** Bewertungs-Overlay im Browser, kommuniziert mit Backend

---

## Technologie-Stack
- **Backend:** Node.js, Express, MySQL/MariaDB, REST-API
- **Frontend:** React, Axios, Chart.js, Material-UI (o.ä.), **Fluent UI für Auth**
- **Worker:** Node.js, Puppeteer, Lighthouse, Wappalyzer
- **Extension:** Vanilla JS, Chrome Extension APIs
- **Dev-Tools:** Nodemon, concurrently, ESLint

---

## API-Überblick (Auszug)
- `GET /api/leads` – Alle Leads (mit Filteroptionen)
- `GET /api/leads/next` – Nächster Lead für Bewertung
- `PATCH /api/leads/:id` – Lead bewerten (Status, Notiz)
- `POST /api/jobs` – Neuen Crawl-/Scoring-Job anlegen
- `GET /api/jobs` – Alle Jobs (Status, Fortschritt)
- `PATCH /api/jobs/:id/restart` – Job neu starten
- **`POST /api/auth/login` – Login (NEU)**
- **`GET /api/auth/users` – Nutzerliste (nur für Superadmin) (NEU)**
- **`POST /api/auth/users` – Nutzer anlegen (nur für Superadmin) (NEU)**
- **`PATCH /api/auth/users/:id/password` – Passwort ändern/zurücksetzen (NEU)**
- **`PATCH /api/auth/users/:id/role` – Rolle ändern (nur für Superadmin) (NEU)**

Weitere Endpunkte siehe Backend-Code und OpenAPI-Doku (in Planung).

---

## Setup & Start
1. **Backend:**
   - `cd backend && npm install`
   - `npm run dev` (Entwicklung) oder `npm start` (Produktion)
2. **Frontend:**
   - `cd frontend && npm install`
   - `npm start`
3. **Worker:**
   - Separates Terminal: `node src/services/crawlerWorker.js`
4. **Datenbank:**
   - MySQL/MariaDB starten, ggf. Migrationen ausführen (siehe `db/`)
   - **User-Tabelle für Authentifizierung anlegen (NEU):**
     ```sql
     CREATE TABLE users (
       id INT AUTO_INCREMENT PRIMARY KEY,
       username VARCHAR(50) NOT NULL UNIQUE,
       password_hash VARCHAR(255) NOT NULL,
       role VARCHAR(20) DEFAULT 'user'
     );
     ```
   - Beim ersten Start wird automatisch ein Admin-User `admin`/`admin` angelegt (Passwort bitte ändern!)
5. **Extension:**
   - Im Browser als entpackte Erweiterung laden (`extension/`)

---

## Entwicklung & Testing
- **Backend/Worker:**
  - Hot-Reload mit `nodemon`
  - Tests und Linting (in Planung)
- **Frontend:**
  - React Dev Server, Hot-Reload
  - Komponenten-Tests (in Planung)
  - **Login- und User-Management-UI mit Fluent UI (NEU)**
- **Extension:**
  - Manuelles Testen im Browser

---

## Bisherige Meilensteine (chronologisch)
- Projektstruktur und Grundgerüst (Backend, Frontend, DB, Extension)
- API für Leads, Jobs, Status, Fortschritt
- Worker für Crawling & Scoring (zunächst kombiniert, später getrennt)
- Dashboard, Filter, Statistiken, Export
- Fortschrittsanzeigen für Jobs, Button-Blocking
- Swipeboard (Frontend), später als Browser-Extension
- Fehlerbehandlung: Worker, Jobs, Migrationen
- Extension: Overlay, Hotkeys, Notizen, echte Tab-Steuerung
- **Login & User-Management (NEU)**

---

## Roadmap & ToDos
- [x] Authentifizierung & User-Management (NEU)
- [ ] Erweiterte Filter & Segmentierung
- [ ] Produktiv-API & Deployment
- [ ] Automatisierte Tests (Backend, Frontend, Extension)
- [ ] Erweiterte DSGVO-Checks
- [ ] Multi-User/Team-Funktionen
- [ ] UI/UX-Verbesserungen (Dark-Mode, Animationen, etc.)
- [ ] Edge/Firefox-Support für Extension

---

## Bekannte Probleme & Hinweise
- Viele Zielseiten blockieren IFrames (daher echte Tab-Steuerung nötig)
- API aktuell ohne Authentifizierung (nur für lokale Entwicklung)
- Fehler bei DB-Migrationen können zu hängenden Jobs führen (siehe Logs)
- **Logout-Button (Frontend) ist noch in Arbeit**

---

## Kontakt & Wartung
- Hauptentwickler: Florian Balaj
- Bei Fragen/Weiterentwicklung: Siehe Extension-README und Quellcode-Kommentare 

---

## Anti-Bot & Captcha-Solver (NEU)

### Automatische reCAPTCHA-Lösung
- Das System erkennt jetzt automatisch reCAPTCHA-Audio-Captchas während des Crawlings (z. B. bei Gelbe Seiten).
- Wird ein Captcha erkannt, wird es automatisch per Audio-Challenge gelöst:
  1. Der Crawler erkennt das Captcha-Frame und klickt auf die Checkbox.
  2. Die Audio-Challenge wird ausgewählt und die Audio-URL extrahiert.
  3. Die Audiodatei wird an einen lokalen Python-Service geschickt, der mit SpeechRecognition und ffmpeg das Audio in Text umwandelt.
  4. Die Antwort wird automatisch ins Captcha-Feld eingetragen und bestätigt.
  5. Der Crawl läuft danach automatisch weiter.

### Architektur & Integration
- **Node.js (Puppeteer):** Erkennt und steuert das Captcha, kommuniziert mit dem Python-Service.
- **Python-Service (Flask):** Läuft auf Port 5005, nimmt POST-Requests mit einer Audio-URL entgegen und liefert den erkannten Text zurück.
- **ffmpeg:** Wird für die Audio-Umwandlung benötigt und ist systemweit installiert.

### Vorteile
- Vollautomatisches Lösen von reCAPTCHA-Audio-Challenges ohne manuelles Eingreifen
- Robustes Fehlerhandling und Logging
- Flexible Erweiterbarkeit für weitere Captcha-Typen

### Nutzung
- Die Integration ist im Crawler vollautomatisch aktiv. Es ist kein zusätzlicher manueller Schritt nötig.
- Voraussetzung: Der Python-Service läuft und ffmpeg ist installiert.

### Live-Scoring Queue System
Das System implementiert ein intelligentes Queue-System für die Echtzeitüberwachung des Scoring-Prozesses:

#### Funktionsweise
- **8er-Batch-System:** Es werden immer maximal 8 Leads gleichzeitig in der Queue angezeigt
- **Intelligente Batch-Verarbeitung:**
  - Nur Leads mit gültiger Domain werden in die Queue aufgenommen
  - Ein Batch wird erst dann als abgeschlossen betrachtet, wenn alle 8 Leads bewertet sind
  - Vermeidet "hängende" Bewertungen: Wenn nach einem unbewerteten Lead ein bewerteter kommt, wird der Batch übersprungen
  
#### Live-Status Features
- **Aktuelle Bewertung:** Der gerade bewertete Lead wird hervorgehoben
- **Fortschrittsanzeige:** Zeigt den Gesamtfortschritt (z.B. "84 von 7114 Leads bewertet (1%)")
- **Status-Indikatoren:** 
  - "Wird bewertet..." für den aktuellen Lead
  - "Wartet" für noch nicht bewertete Leads
  - "Fertig" für bereits bewertete Leads
- **Automatisches Update:** Die Ansicht aktualisiert sich alle 1,5 Sekunden via Polling

#### Technische Implementation
- **Backend-Endpunkt:** `/api/scoring/live-status` liefert:
  - Aktuelle Queue (max. 8 Leads)
  - Aktuell bewerteter Lead
  - Bewertungsergebnisse
  - Gesamtfortschritt
- **Optimierte Datenbankabfragen:** 
  - Effiziente Batch-Verarbeitung durch geschickte SQL-Queries
  - Vermeidung von Datenbanküberlastung durch Polling-Intervall
- **Fehlertoleranz:** 
  - Automatische Erkennung und Überspringen problematischer Batches
  - Robuste Fortschrittsverfolgung auch bei Verbindungsabbrüchen

#### Besonderheiten
- Live-Ansicht nur verfügbar während ein Scoring-Job aktiv läuft
- Automatischer Wechsel zum nächsten Batch nach Abschluss des aktuellen
- Visuelle Hervorhebung des aktuell bewerteten Leads für bessere Übersicht
- Score-Farbkodierung: Grün (≥60), Gelb (≥30), Rot (<30) 




mysql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'akant0350365035300';
FLUSH PRIVILEGES;
EXIT;


# .env updaten:
cd /opt/aquise-tool/backend
sed -i 's/DB_PASSWORD=/DB_PASSWORD=akant0350365035300/g' .env