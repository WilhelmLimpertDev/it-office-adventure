import { UIManager } from "./uiManager.js";

async function startGame() {
  try {
    const response = await fetch("./data/officeData.json");
    if (!response.ok) {
      throw new Error(`Bürodaten konnten nicht geladen werden (HTTP ${response.status}).`);
    }
    const data = await response.json();
    if (!window.Phaser) {
      throw new Error("Die lokale Phaser-Datei ./assets/phaser.min.js konnte nicht geladen werden.");
    }
    const { GameScene } = await import("./gameScene.js");

    document.title = data.meta.title;
    document.getElementById("game-title").textContent = data.meta.title;
    document.getElementById("welcome-text").textContent = data.meta.welcomeText;
    const ui = new UIManager(data);
    new Phaser.Game({
      type: Phaser.AUTO,
      parent: "game-canvas",
      width: 800,
      height: 600,
      backgroundColor: "#1e293b",
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 }, debug: false } },
      scene: new GameScene(data, ui)
    });
  } catch (error) {
    console.error("Spielstart fehlgeschlagen:", error);
    document.getElementById("welcome-text").textContent =
      `Das Spiel konnte nicht gestartet werden: ${error.message} Starte es über einen lokalen HTTP-Server.`;
    document.getElementById("start-status").textContent =
      `Das Spiel konnte nicht gestartet werden: ${error.message} Starte es über einen lokalen HTTP-Server.`;
  }
}

startGame();
