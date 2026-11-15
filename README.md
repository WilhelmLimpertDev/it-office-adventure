# IT-Office-Adventure

Ein offline nutzbares 2D-Lernspiel mit Phaser 3, JavaScript-Modulen und externen JSON-Spieldaten. Es werden zur Laufzeit keine externen Dienste benötigt.

## Starten

Im Projektordner einen lokalen HTTP-Server starten, zum Beispiel:

```powershell
python -m http.server 8000
```

Anschließend `http://localhost:8000` im Browser öffnen. Das direkte Öffnen von `index.html` als Datei funktioniert wegen der Browser-Sicherheitsregeln für JavaScript-Module und `fetch()` in der Regel nicht.

## Spielen

Mit einem Klick auf den Boden oder mit WASD beziehungsweise den Pfeiltasten bewegen. Die farbigen Personen anklicken, ihre Gespräche beenden und die Rollen im Notizbuch nachlesen. Nach drei abgeschlossenen Gesprächen schaltet die Projektleitung das Quiz frei. Der Fortschritt gilt für die aktuelle Sitzung und wird beim Neuladen zurückgesetzt. Gehälter sind illustrative Brutto-Jahreswerte und variieren beispielsweise nach Region und Erfahrung.

## Aufbau

- `data/officeData.json`: Rollen, Gespräche und Quizfragen.
- `js/gameScene.js`: Darstellung und Steuerung des Büros.
- `js/uiManager.js`: Dialoge, Notizbuch, Fortschritt und Quiz.
- `js/main.js`: Laden der Daten und Start des Spiels.
- `css/style.css` und `index.html`: HTML-Oberfläche und Gestaltung.
- `assets/phaser.min.js`: lokal eingebundenes Phaser 3.90.0; Lizenz in `assets/PHASER-LICENSE.txt`.

## Eigene Grafiken

PNG-Dateien können unter `assets/images/` abgelegt werden: `floor_tile.png`, `desk.png`, `player.png`, `npc_junior_dev.png`, `npc_devops.png`, `npc_security.png` und `boss.png`. Die Dateinamen der Personen lassen sich über das optionale `sprite`-Feld in den Spieldaten ändern. Fehlende Bilder werden einzeln durch die bisherigen Rechtecke ersetzt; beim Laden können dafür 404-Meldungen in der Browserkonsole erscheinen.

Der Boden wird gekachelt und Personen werden auf 42 × 52 Pixel skaliert. `player.png` muss ein Standard-LPC-Sprite-Sheet mit 64 × 64 Pixeln pro Frame und 13 Spalten sein; die Spielfigur wird mit 64 × 64 Pixeln dargestellt und verwendet die LPC-Laufanimationen. Schreibtische werden über das optionale `furniture`-Array platziert und haben standardmäßig 120 × 45 Pixel; `width` und `height` ändern ihre Anzeige- und Kollisionsgröße. Sie blockieren die Spielfigur auch dann, wenn noch keine Schreibtischgrafik vorhanden ist. Fehlt das Array, bleibt die bisherige Büroeinrichtung erhalten.
