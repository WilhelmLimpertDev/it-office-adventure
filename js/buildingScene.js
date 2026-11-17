import { soundManager } from "./soundManager.js";

const FLOORS = { EG: 500, E1: 340, E2: 180 };
const LIFT_X = 178;
const CALL_LAMP_OFF = 0x475569;
const CALL_LAMP_CALLING = 0xfb923c;
const CALL_LAMP_READY = 0x4ade80;
const DOORS = [
  { floor: "E1", x: 425, label: "IT-Abteilung", kind: "it" },
  { floor: "E1", x: 625, label: "Human Resource (HR)", kind: "locked" },
  { floor: "E2", x: 425, label: "Buchhaltung (FI/CO)", kind: "locked" },
  { floor: "E2", x: 625, label: "WC / Toilette", kind: "wc" }
];

export class BuildingScene extends Phaser.Scene {
  constructor(ui) {
    super({ key: "BuildingScene" });
    this.ui = ui;
    this.lastToiletMsgIndex = -1;
  }

  init(data) {
    this.floor = Object.hasOwn(FLOORS, data.floor) ? data.floor : "EG";
    this.busy = false;
    this.walking = false;
    this.direction = "right";
    this.walkTween = null;
    this.liftTween = null;
    this.stopHum = null;
    this.lastStepAt = -Infinity;
    this.isPlayerInElevator = false;
    this.liftFloor = this.floor;
    this.callLamps = {};
    this.panelButtons = {};
  }

  preload() {
    this.load.spritesheet("player", "./assets/images/player.png", { frameWidth: 64, frameHeight: 64 });
  }

  create() {
    this.drawBuilding();
    this.createLift();
    if (this.textures.exists("player")) {
      for (const [direction, start] of Object.entries({ left: 118, right: 144 })) {
        const key = `walk-${direction}`;
        if (!this.anims.exists(key)) {
          this.anims.create({
            key,
            frames: this.anims.generateFrameNumbers("player", { start, end: start + 7 }),
            frameRate: 10,
            repeat: -1
          });
        }
      }
      this.player = this.add.sprite(this.floor === "EG" ? 350 : 425, FLOORS[this.floor], "player", 143);
    } else {
      this.player = this.add.rectangle(this.floor === "EG" ? 350 : 425, FLOORS[this.floor], 28, 38, 0xfbbf24)
        .setStrokeStyle(2, 0xfef3c7);
    }
    this.player.setDepth(10);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys("A,D");
    this.input.keyboard.on("keydown-ENTER", () => {
      if (document.activeElement !== document.getElementById("game-canvas") || this.ui.isBlockingGame || this.busy) return;
      const door = DOORS.find((item) => item.floor === this.floor && Math.abs(item.x - this.player.x) < 70);
      if (door) this.selectDoor(door);
    });
    this.input.on("pointerdown", (pointer, currentlyOver) => {
      if (this.ui.isBlockingGame || this.busy || currentlyOver.length) return;
      if (Math.abs(pointer.worldY - FLOORS[this.floor]) > 75) return;
      document.getElementById("game-canvas").focus({ preventScroll: true });
      this.ui.hideBuildingNotice();
      this.setInElevator(false);
      this.setBusy(true);
      this.walkTo(Phaser.Math.Clamp(pointer.worldX, this.minX(), 710), () => this.setBusy(false));
    });
    this.ui.setCurrentScene("building");
    this.ui.openBuilding = (floor) => this.scene.restart({ floor });
    this.ui.stopMovement = () => this.pauseMovement();
    this.ui.resumeMovement = () => this.resumeMovement();
    this.ui.enableStart();
    this.events.once("shutdown", () => this.stopElevatorHum());
  }

  drawBuilding() {
    const g = this.add.graphics();
    g.fillStyle(0x0b1728).fillRect(0, 0, 800, 600);
    g.fillStyle(0x16283b);
    for (let x = 0; x < 800; x += 65) {
      const height = 60 + (x * 7 % 95);
      g.fillRect(x, 600 - height, 48, height);
    }
    g.fillStyle(0x1e3447).fillRoundedRect(60, 35, 680, 520, 10);
    g.fillStyle(0x90a7b3).fillRoundedRect(49, 35, 702, 22, 5);
    g.fillStyle(0x415b6b).fillRect(60, 57, 680, 10);
    Object.entries(FLOORS).forEach(([floor, y]) => {
      g.fillStyle(floor === "EG" ? 0x294455 : 0x263e50).fillRect(73, y - 120, 654, 150);
      g.fillStyle(0x3e6273, 0.5).fillRect(270, y - 110, 446, 95);
      g.lineStyle(2, 0x577987, 0.55);
      for (let x = 290; x < 720; x += 70) g.lineBetween(x, y - 110, x, y - 15);
      g.fillStyle(0xc5ac88).fillRect(73, y + 26, 654, 8);
      g.fillStyle(0x405361).fillRect(73, y + 34, 654, 10);
      this.add.text(87, y - 112, floor, {
        fontFamily: "sans-serif", fontSize: "16px", fontStyle: "bold", color: "#b7d6df"
      });
    });
    g.fillStyle(0x101e2b).fillRect(120, 69, 116, 457);
    g.lineStyle(3, 0x617b89).strokeRect(120, 69, 116, 457);
    g.lineStyle(1, 0x304958).lineBetween(130, 73, 130, 525).lineBetween(226, 73, 226, 525);
    this.add.text(400, 22, "BÜRO-GEBÄUDE", {
      fontFamily: "sans-serif", fontSize: "14px", fontStyle: "bold", color: "#cffafe"
    }).setOrigin(0.5);

    g.fillStyle(0x132c39).fillRoundedRect(450, 455, 178, 70, 5);
    g.fillStyle(0x8b684d).fillRoundedRect(442, 469, 194, 12, 3);
    g.fillStyle(0xb78d63).fillRect(449, 481, 180, 39);
    g.fillStyle(0x6a4b38).fillRect(449, 515, 180, 5);
    this.add.text(540, 499, "EMPFANG", {
      fontFamily: "sans-serif", fontSize: "15px", fontStyle: "bold", color: "#fff1d6"
    }).setOrigin(0.5);
    g.fillStyle(0x172b38).fillRoundedRect(504, 441, 40, 25, 3);
    g.fillStyle(0x67b8bc).fillRect(508, 445, 32, 17);
    g.fillStyle(0xe4d5ba).fillCircle(595, 464, 5);
    DOORS.forEach((door) => this.drawDoor(door));
  }

  drawDoor(door) {
    const y = FLOORS[door.floor];
    const g = this.add.graphics();
    g.fillStyle(0x13212d).fillRoundedRect(door.x - 55, y - 98, 110, 124, 4);
    g.fillStyle(door.kind === "it" ? 0x876c50 : 0x4c6070).fillRect(door.x - 49, y - 92, 98, 118);
    g.fillStyle(door.kind === "it" ? 0xf5c777 : 0x294655).fillRoundedRect(door.x - 32, y - 79, 64, 48, 3);
    g.fillStyle(door.kind === "it" ? 0xffe6aa : 0x6b8995, 0.45).fillRect(door.x - 28, y - 75, 56, 8);
    g.fillStyle(0xd9d3bb).fillCircle(door.x + 36, y - 10, 4);
    if (door.kind === "locked") {
      g.lineStyle(3, 0xe7d5a2).strokeRoundedRect(door.x - 8, y - 59, 16, 15, 7);
      g.fillStyle(0xe7d5a2).fillRoundedRect(door.x - 10, y - 51, 20, 15, 3);
      g.fillStyle(0x485763).fillCircle(door.x, y - 44, 2);
    } else if (door.kind === "it") {
      g.fillStyle(0x4ade80).fillCircle(door.x + 43, y - 82, 5);
    }
    this.add.text(door.x, y - 113, door.label, {
      fontFamily: "sans-serif", fontSize: "13px", fontStyle: "bold", color: "#f1f5f9",
      backgroundColor: "#142536", padding: { x: 5, y: 3 }
    }).setOrigin(0.5);
    if (door.kind === "wc") {
      this.add.text(door.x, y - 55, "WC", {
        fontFamily: "sans-serif", fontSize: "17px", fontStyle: "bold", color: "#e2e8f0"
      }).setOrigin(0.5);
    }
    const zone = this.add.zone(door.x, y - 35, 112, 122)
      .setInteractive({ useHandCursor: true });
    zone.on("pointerdown", () => {
      document.getElementById("game-canvas").focus({ preventScroll: true });
      this.selectDoor(door);
    });
  }

  createLift() {
    this.lift = this.add.container(LIFT_X, FLOORS[this.floor]);
    const g = this.add.graphics();
    g.fillStyle(0x91aab3).fillRoundedRect(-48, -104, 96, 130, 5);
    g.fillStyle(0x284653).fillRect(-42, -98, 84, 119);
    g.fillStyle(0x4e7a86, 0.65).fillRect(-37, -93, 74, 90);
    g.lineStyle(2, 0xb9d7d9, 0.6).lineBetween(-32, -78, 32, -78);
    g.fillStyle(0xd5b98c).fillRect(-42, 18, 84, 8);
    g.fillStyle(0x67e8f9).fillCircle(32, -88, 3);
    this.lift.add(g);
    this.createElevatorPanel();
    Object.keys(FLOORS).forEach((floor) => this.createCallButton(floor));
  }

  createCallButton(floor) {
    const x = 254;
    const y = FLOORS[floor] - 45;
    const g = this.add.graphics();
    g.fillStyle(0x0f1d29).fillRoundedRect(x - 10, y - 17, 20, 34, 4);
    g.lineStyle(1, 0x7f98a5).strokeRoundedRect(x - 10, y - 17, 20, 34, 4);
    this.add.text(x, y - 9, "▲▼", { fontFamily: "sans-serif", fontSize: "7px", color: "#94a3b8" }).setOrigin(0.5);
    const lamp = this.add.circle(x, y + 6, 6, CALL_LAMP_OFF).setStrokeStyle(2, 0xcbd5e1);
    lamp.setInteractive({ useHandCursor: true });
    lamp.on("pointerdown", () => {
      document.getElementById("game-canvas").focus({ preventScroll: true });
      this.callLift(floor);
    });
    this.callLamps[floor] = lamp;
  }

  createElevatorPanel() {
    this.elevatorPanel = this.add.container(LIFT_X, FLOORS[this.floor]).setDepth(11).setVisible(false);
    const frame = this.add.graphics();
    frame.fillStyle(0x0f1d29).fillRoundedRect(15, -94, 28, 70, 4);
    frame.lineStyle(1, 0x7f98a5).strokeRoundedRect(15, -94, 28, 70, 4);
    this.elevatorPanel.add(frame);
    ["E2", "E1", "EG"].forEach((floor, i) => {
      const button = this.add.rectangle(29, -81 + i * 21, 22, 17, 0x334155).setStrokeStyle(1, 0x94a3b8);
      const label = this.add.text(29, -81 + i * 21, floor, {
        fontFamily: "sans-serif", fontSize: "10px", fontStyle: "bold", color: "#e2e8f0"
      }).setOrigin(0.5);
      button.setInteractive({ useHandCursor: true });
      button.on("pointerdown", () => {
        document.getElementById("game-canvas").focus({ preventScroll: true });
        this.selectFloor(floor);
      });
      this.elevatorPanel.add([button, label]);
      this.panelButtons[floor] = { button, label };
    });
    this.refreshPanel();
  }

  refreshPanel() {
    Object.entries(this.panelButtons).forEach(([floor, { button, label }]) => {
      const active = floor === this.liftFloor;
      button.setFillStyle(active ? 0x67e8f9 : 0x334155);
      label.setColor(active ? "#082f49" : "#e2e8f0");
    });
  }

  setInElevator(value) {
    this.isPlayerInElevator = value;
    this.elevatorPanel.setVisible(value);
  }

  minX() {
    return this.liftFloor === this.floor ? 100 : 245;
  }

  flashLamp(floor, color) {
    this.callLamps[floor].setFillStyle(color);
    this.time.delayedCall(700, () => this.callLamps[floor]?.setFillStyle(CALL_LAMP_OFF));
  }

  callLift(floor) {
    if (this.ui.isBlockingGame || this.busy || this.isPlayerInElevator || floor !== this.floor) return;
    this.ui.hideBuildingNotice();
    this.setBusy(true);
    const enter = () => this.walkTo(LIFT_X, () => {
      this.setInElevator(true);
      this.setBusy(false);
    });
    if (this.liftFloor === floor) {
      this.flashLamp(floor, CALL_LAMP_READY);
      enter();
      return;
    }
    this.callLamps[floor].setFillStyle(CALL_LAMP_CALLING);
    this.moveLift(floor, false, () => {
      this.flashLamp(floor, CALL_LAMP_READY);
      enter();
    });
  }

  moveLift(floor, withPlayer, onArrival) {
    this.stopHum = soundManager.startElevatorHum();
    this.liftTween = this.tweens.add({
      targets: withPlayer ? [this.lift, this.player] : [this.lift],
      y: FLOORS[floor],
      duration: Math.abs(FLOORS[floor] - FLOORS[this.liftFloor]) * 7,
      ease: "Sine.easeInOut",
      onUpdate: () => this.elevatorPanel.setY(this.lift.y),
      onComplete: () => {
        this.liftTween = null;
        this.stopElevatorHum();
        this.liftFloor = floor;
        if (withPlayer) this.floor = floor;
        this.elevatorPanel.setY(this.lift.y);
        this.refreshPanel();
        soundManager.playElevatorBell();
        onArrival();
      }
    });
  }

  setBusy(busy) {
    this.busy = busy;
  }

  selectFloor(floor) {
    if (this.ui.isBlockingGame || this.busy || !this.isPlayerInElevator || !Object.hasOwn(FLOORS, floor)) return;
    if (floor === this.liftFloor) return;
    this.ui.hideBuildingNotice();
    this.setBusy(true);
    this.moveLift(floor, true, () => this.setBusy(false));
  }

  selectDoor(door) {
    if (this.ui.isBlockingGame || this.busy) return;
    this.ui.hideBuildingNotice();
    if (door.floor !== this.floor) {
      this.ui.showBuildingNotice("Nimm den Fahrstuhl: Rufknopf drücken und die Etage im Fahrstuhl wählen.");
      return;
    }
    this.setInElevator(false);
    this.setBusy(true);
    this.walkTo(door.x, () => {
      this.setBusy(false);
      if (door.kind === "it") {
        soundManager.playDoor();
        this.scene.start("OfficeScene");
      } else if (door.kind === "locked") {
        soundManager.playLocked();
        this.ui.showBuildingNotice("Diese Level sind in dieser Test-Version noch nicht spielbar!");
      } else {
        soundManager.playToilet();
        this.ui.showBuildingNotice(this.pickToiletMessage(), { portrait: "player", speaker: "Du" });
      }
    });
  }

  pickToiletMessage() {
    const fallback = "Wegen Verstopfung geschlossen! Der Hausmeister wurde bereits informiert.";
    const loaded = this.ui.data?.toiletMessages;
    const messages = Array.isArray(loaded) && loaded.length ? loaded : [fallback];
    let index = Math.floor(Math.random() * messages.length);
    if (messages.length > 1 && index === this.lastToiletMsgIndex) {
      index = (index + 1 + Math.floor(Math.random() * (messages.length - 1))) % messages.length;
    }
    this.lastToiletMsgIndex = index;
    return messages[index];
  }

  walkTo(x, onArrival) {
    const distance = Math.abs(x - this.player.x);
    if (distance < 1) {
      onArrival();
      return;
    }
    this.setWalking(x < this.player.x ? "left" : "right");
    this.walkTween = this.tweens.add({
      targets: this.player,
      x,
      duration: distance / 0.18,
      onComplete: () => {
        this.walkTween = null;
        this.setIdle();
        onArrival();
      }
    });
  }

  setWalking(direction) {
    this.direction = direction;
    this.walking = true;
    if (this.player.anims) this.player.anims.play(`walk-${direction}`, true);
  }

  setIdle() {
    this.walking = false;
    if (this.player.anims) {
      this.player.anims.stop();
      this.player.setFrame(this.direction === "left" ? 117 : 143);
    }
  }

  stopElevatorHum() {
    if (this.stopHum) this.stopHum();
    this.stopHum = null;
  }

  pauseMovement() {
    if (this.walkTween) this.walkTween.pause();
    if (this.liftTween) this.liftTween.pause();
    this.stopElevatorHum();
    if (this.player.anims) this.player.anims.stop();
  }

  resumeMovement() {
    if (this.walkTween) {
      this.walkTween.resume();
      this.setWalking(this.direction);
    }
    if (this.liftTween) {
      this.stopHum = soundManager.startElevatorHum();
      this.liftTween.resume();
    }
  }

  update(time, delta) {
    if (this.ui.isBlockingGame) return;
    if (!this.busy) {
      const direction = Number(this.cursors.right.isDown || this.wasd.D.isDown) -
        Number(this.cursors.left.isDown || this.wasd.A.isDown);
      if (direction) {
        this.ui.hideBuildingNotice();
        this.setInElevator(false);
        this.player.x = Phaser.Math.Clamp(this.player.x + direction * delta * 0.18, this.minX(), 710);
        this.setWalking(direction < 0 ? "left" : "right");
      } else if (this.walking) {
        this.setIdle();
      }
    }
    if (this.walking && time - this.lastStepAt >= 280) {
      soundManager.playStep();
      this.lastStepAt = time;
    }
  }
}
