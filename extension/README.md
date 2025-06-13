# Aquise-Tool Browser-Extension

## Übersicht
Diese Extension unterstützt den Akquise-Workflow, indem sie ein Overlay direkt auf echten Webseiten einblendet. So können Leads (schlechte Websites) effizient bewertet und mit dem Backend synchronisiert werden. Die Extension ist eng mit dem Node.js-Backend verzahnt und für maximale Geschwindigkeit und Interaktivität im B2B-Kontext optimiert.

---

## Features
- **Swipe-Modus:** Bewertungs-Overlay direkt im aktiven Tab (kein IFrame, volle Interaktion mit der Seite)
- **Hotkeys:** Bewertung per Tastatur (Links/Rechts/Enter/Escape)
- **Notizfeld:** Optionales Textfeld für Kommentare zu jedem Lead
- **Synchronisation:** Kommunikation mit lokalem Backend (`http://localhost:5000`)
- **Persistenz:** Aktueller Lead bleibt auch nach Navigation erhalten
- **Statusanzeige:** Fortschritt und verbleibende Leads werden angezeigt

---

## Technologie-Stack
- **Content-Skript:** Vanilla JavaScript (ES6), DOM-Manipulation
- **Browser-API:** Chrome Extension APIs (`chrome.runtime`, `chrome.storage`)
- **Kommunikation:** REST-API Calls zum lokalen Backend (Node.js/Express)
- **UI:** Dynamisch generiertes Overlay (kein Framework)

---

## Architektur & Schnittstellen
### 1. Kommunikation mit Backend
- **Leads abrufen:**
  - `GET http://localhost:5000/api/leads/next` → Nächster Lead
  - `GET http://localhost:5000/api/leads` → Alle Leads (für Fortschritt)
- **Lead bewerten:**
  - `PATCH http://localhost:5000/api/leads/:id` mit `{ manual_status, note }`

### 2. Extension-Komponenten
- **content.js:**
  - Injected in jede Seite, steuert Overlay, Hotkeys, Bewertungslogik
  - Hört auf Nachrichten vom Popup (z.B. „Swipe-Modus starten“)
- **Popup (optional):**
  - Startet den Swipe-Modus per Button

### 3. Datenpersistenz
- **chrome.storage.local:**
  - Speichert aktuellen Lead, damit nach Navigation/Reload weitergeswipt werden kann

---

## Entwicklung & Testing
1. **Extension laden:**
   - Im Browser unter `chrome://extensions/` → Entwicklermodus → „Entpackte Erweiterung laden“ → `extension/`-Ordner auswählen
2. **Backend starten:**
   - Muss auf `http://localhost:5000` laufen (siehe Hauptprojekt-README)
3. **Testen:**
   - Auf beliebige Website gehen, Swipe-Modus starten, Leads bewerten
   - Hotkeys: Links = Ablehnen, Rechts/Enter = Akzeptieren, Escape = Modus beenden

---

## Hinweise & bekannte Einschränkungen
- Viele Seiten blockieren IFrames → echtes Tab-Swipen ist nötig
- Die Extension funktioniert nur mit lokal laufendem Backend
- Keine Authentifizierung/Absicherung der API (nur für lokale Entwicklung gedacht)

---

## ToDos & Ideen für die Zukunft
- **Produktiv-API:** Anbindung an externes/produktives Backend
- **User-Login:** Authentifizierung für mehrere Nutzer
- **Erweiterte Filter:** Leads nach Score, Branche etc. filtern
- **UI-Verbesserungen:** Drag&Drop, Animationen, Dark-Mode
- **Fehlerhandling:** Bessere Rückmeldungen bei API-Fehlern
- **Edge/Firefox-Support:** Anpassung für andere Browser
- **Automatisierte Tests:** E2E- und Integrationstests für die Extension

---

## Kontakt & Wartung
- Hauptentwickler: Florian Balaj
- Bei Fragen/Weiterentwicklung: Siehe Hauptprojekt-README 