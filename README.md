# IT-Office-Adventure

Ein offline nutzbares 2D-Lernspiel mit Phaser 3, JavaScript-Modulen und externen JSON-Spieldaten. Es werden zur Laufzeit keine externen Dienste benötigt.

## Starten

Im Projektordner einen lokalen HTTP-Server starten, zum Beispiel:

```powershell
python -m http.server 8000
```

Anschließend `http://localhost:8000` im Browser öffnen. Das direkte Öffnen von `index.html` als Datei funktioniert wegen der Browser-Sicherheitsregeln für JavaScript-Module und `fetch()` in der Regel nicht.

## Spielen

Im Startmenü „Büro betreten“ auswählen. Ein vorhandener Spielstand kann dort fortgesetzt oder mit „Neues Spiel starten“ gelöscht werden. Erst danach sind Bewegung und Gespräche im Büro aktiv.

Mit einem Klick auf den Boden oder mit WASD beziehungsweise den Pfeiltasten bewegen. Ein Klick auf eine Person lässt die Spielfigur zu ihr laufen; manuelle Bewegung oder ein Bodenklick bricht den Weg ab. Ein Bodenring markiert die Person unter dem Mauszeiger. Beim Gesprächsbeginn blickt sie zur Spielfigur. Dialogtexte erscheinen Zeichen für Zeichen: Ein Klick auf die Antwort- oder Weiter-Schaltfläche zeigt den Text sofort vollständig, der nächste setzt das Gespräch fort. Rollen nach abgeschlossenen Gesprächen im Notizbuch nachlesen; nach drei Gesprächen schaltet die Projektleitung das Quiz frei. Die Auswertung zeigt alle Antworten und erlaubt, das Quiz zu wiederholen oder das Notizbuch zu öffnen. Gehälter sind illustrative Brutto-Jahreswerte und variieren beispielsweise nach Region und Erfahrung.

Freigeschaltete Rollen sowie Abschluss und Punktzahl des zuletzt abgeschlossenen Quiz werden automatisch im `localStorage` des Browsers gespeichert. Der Spielstand ist an Browser und Serveradresse gebunden und kann beim Löschen der Browserdaten verloren gehen. Spielfigurposition und laufende Gespräche oder Quizfragen werden nicht gespeichert. Wenn der Browser die Speicherung blockiert, erscheint ein entsprechender Hinweis.

Die Schritt-, Sprach- und Erfolgstöne werden lokal mit der Web Audio API erzeugt und nach der ersten Interaktion aktiviert. Über „Ton an/aus“ im HUD lassen sie sich stummschalten. Die Stimmlage der Personen kann über `voicePitch` in den Spieldaten angepasst werden.

## Aufbau

- `data/officeData.json`: Rollen, Gespräche und Quizfragen.
- `js/gameScene.js`: Darstellung und Steuerung des Büros.
- `js/uiManager.js`: Dialoge, Notizbuch, Fortschritt und Quiz.
- `js/soundManager.js`: prozedurale Soundeffekte und Stummschaltung.
- `js/main.js`: Laden der Daten und Start des Spiels.
- `css/style.css` und `index.html`: HTML-Oberfläche und Gestaltung.
- `assets/phaser.min.js`: lokal eingebundenes Phaser 3.90.0; Lizenz in `assets/PHASER-LICENSE.txt`.

## Eigene Grafiken

PNG-Dateien können unter `assets/images/` abgelegt werden: `floor_office.png`, `desk_dual.png`, `desk_boss.png`, `chair.png`, `plant.png`, `coffee_bar.png`, `sofa.png`, `whiteboard.png`, `player.png`, `npc_alex.png`, `npc_sam.png`, `npc_mika.png` und `boss_kim.png`. Die Dateinamen der Personen lassen sich über das optionale `sprite`-Feld in den Spieldaten ändern. Fehlende Büro- und Möbelgrafiken werden prozedural erzeugt; für fehlende Personengrafiken erscheinen Rechtecke. Beim Laden können für fehlende Bilder 404-Meldungen in der Browserkonsole erscheinen.

`floor_office.png` wird auf 800 × 600 Pixel skaliert; alternativ wird das ältere `floor_tile.png` gekachelt, sofern keine `floor_office.png` vorhanden ist. Alle Personengrafiken müssen Standard-LPC-Sprite-Sheets mit 64 × 64 Pixeln pro Frame und 13 Spalten sein und werden mit 64 × 64 Pixeln dargestellt. Die Spielfigur verwendet die LPC-Laufanimationen; für NPCs und Projektleitung legt das optionale Feld `facing` die anfängliche Blickrichtung (`up`, `left`, `down` oder `right`) fest, standardmäßig `down`.

Das `furniture`-Array platziert Möbel anhand von `type`, `x` und `y`. `solid: true` blockiert die Spielfigur an der unteren Hälfte des Möbelbildes, `solid: false` macht es durchlässig. Die optionalen Felder `width` und `height` ändern Anzeige- und Kollisionsgröße. Figuren und Möbel werden nach ihrer Y-Position sortiert. Der ältere Typ `desk` und `desk.png` bleiben verwendbar; bei `desk` ist `solid` standardmäßig `true`. Fehlt das Array, bleibt die bisherige Büroeinrichtung erhalten.
