import { soundManager } from "./soundManager.js";

const IDLE_FRAMES = { up: 104, left: 117, down: 130, right: 143 };
const OFFICE_SIZES = {
  desk: [120, 45],
  desk_dual: [142, 76],
  desk_boss: [160, 82],
  chair: [42, 48],
  plant: [46, 60],
  coffee_bar: [112, 78],
  sofa: [140, 72],
  whiteboard: [150, 68]
};

export class GameScene extends Phaser.Scene {
  constructor(data, ui) {
    super({ key: "OfficeScene" });
    this.officeData = data;
    this.ui = ui;
    this.destination = null;
    this.pendingTarget = null;
  }

  preload() {
    this.load.spritesheet("player", "./assets/images/player.png", { frameWidth: 64, frameHeight: 64 });
    ["floor_tile", "floor_office", ...Object.keys(OFFICE_SIZES)].forEach((key) => {
      this.load.image(key, `./assets/images/${key}.png`);
    });
    const keys = new Set([
      ...this.officeData.npcs.map((npc) => npc.sprite),
      this.officeData.bossQuiz.sprite
    ]);
    keys.forEach((key) => {
      if (key == null || key === "player") return;
      if (typeof key !== "string" || !/^[a-zA-Z0-9_-]+$/.test(key) ||
          key === "__MISSING" || key === "floor_tile" || key === "floor_office" || Object.hasOwn(OFFICE_SIZES, key)) {
        console.warn("Ungültiger Sprite-Schlüssel:", key);
        return;
      }
      this.load.spritesheet(key, `./assets/images/${key}.png`, { frameWidth: 64, frameHeight: 64 });
    });
  }

  hasTexture(key) {
    return typeof key === "string" && key !== "__MISSING" && this.textures.exists(key);
  }

  hasCharacterTexture(key) {
    return typeof key === "string" && key !== "floor_tile" && key !== "floor_office" &&
      !Object.hasOwn(OFFICE_SIZES, key) && this.hasTexture(key);
  }

  generateOfficeTextures() {
    this.generatedOfficeTextures = this.generatedOfficeTextures ?? new Set();
    const make = (key, width, height, draw) => {
      if (this.hasTexture(key)) return;
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      draw(g);
      g.generateTexture(key, width, height);
      g.destroy();
      this.generatedOfficeTextures.add(key);
    };

    make("floor_office", 800, 600, (g) => {
      g.fillStyle(0x263646).fillRect(0, 0, 800, 600);
      for (let y = 70; y < 600; y += 40) {
        for (let x = 0; x < 800; x += 40) {
          g.fillStyle((x / 40 + y / 40) % 2 < 1 ? 0x2d4051 : 0x293b4b, 0.65)
            .fillRect(x + 1, y + 1, 38, 38);
        }
      }
      g.lineStyle(1, 0x182b3a, 0.45);
      for (let x = 0; x <= 800; x += 40) g.lineBetween(x, 70, x, 600);
      for (let y = 70; y <= 600; y += 40) g.lineBetween(0, y, 800, y);
      g.fillStyle(0x172b3a).fillRect(0, 0, 800, 70);
      g.fillStyle(0x315569).fillRect(14, 8, 772, 45);
      g.fillStyle(0x567e91).fillRect(18, 12, 764, 36);
      g.fillStyle(0xa6c8cf, 0.22).fillRect(18, 12, 764, 8);
      g.fillStyle(0x223e4d);
      for (let x = 140; x < 800; x += 155) g.fillRect(x, 8, 5, 45);
      g.fillStyle(0xb78d63).fillRect(0, 55, 800, 12);
      g.fillStyle(0x74563f).fillRect(0, 67, 800, 4);
      g.fillStyle(0x1b2b38).fillRect(0, 70, 12, 530).fillRect(788, 70, 12, 530);
    });

    make("desk_dual", 142, 76, (g) => {
      g.fillStyle(0x101923, 0.3).fillEllipse(71, 68, 132, 15);
      g.fillStyle(0x49392f).fillRoundedRect(7, 29, 128, 40, 4);
      g.fillStyle(0xb9875b).fillRoundedRect(4, 25, 134, 35, 4);
      g.fillStyle(0xd5a574).fillRect(9, 28, 124, 3);
      g.lineStyle(1, 0x8c6448, 0.6).lineBetween(12, 52, 130, 52);
      [31, 76].forEach((x) => {
        g.fillStyle(0x263746).fillRect(x + 15, 36, 4, 8).fillRect(x + 9, 42, 16, 3);
        g.fillStyle(0x121f2b).fillRoundedRect(x, 4, 36, 29, 2);
        g.fillStyle(0x1a3444).fillRect(x + 3, 7, 30, 22);
        g.fillStyle(0x54d8ca, 0.8).fillRect(x + 6, 11, 12, 2).fillRect(x + 9, 16, 18, 2);
        g.fillStyle(0x8ea8f1, 0.8).fillRect(x + 6, 21, 15, 2);
      });
      g.fillStyle(0x253442).fillRoundedRect(49, 47, 42, 7, 2);
      g.lineStyle(1, 0x7d99a2, 0.7);
      for (let x = 53; x < 89; x += 5) g.lineBetween(x, 49, x + 2, 49);
      g.fillStyle(0x52636c).fillRoundedRect(99, 45, 17, 11, 2);
      g.fillStyle(0xd5dfe0).fillEllipse(107, 50, 5, 7);
      g.fillStyle(0xf1dfc4).fillCircle(122, 39, 5);
      g.fillStyle(0x654738).fillCircle(122, 39, 3);
    });

    make("desk_boss", 160, 82, (g) => {
      g.fillStyle(0x101923, 0.3).fillEllipse(80, 73, 150, 16);
      g.fillStyle(0x3e302b).fillRoundedRect(5, 30, 150, 43, 5);
      g.fillStyle(0x80563c).fillRoundedRect(4, 25, 152, 40, 5);
      g.fillStyle(0xb7865d).fillRect(9, 28, 142, 4);
      g.fillStyle(0x172a36).fillRoundedRect(57, 8, 48, 30, 3);
      g.fillStyle(0x355c6a).fillRect(60, 11, 42, 24);
      g.fillStyle(0x7ab5be, 0.7).fillRect(64, 15, 23, 2).fillRect(68, 20, 27, 2);
      g.fillStyle(0x9aa9ad).fillRoundedRect(53, 38, 56, 6, 2);
      g.fillStyle(0x394b59).fillRect(15, 35, 28, 16);
      g.fillStyle(0xc8d4d0).fillRect(17, 37, 24, 3);
      g.fillStyle(0x8b5960).fillRect(19, 42, 28, 12);
      g.fillStyle(0xe4cba7).fillRect(21, 44, 24, 3);
      g.fillStyle(0xf3e7d2).fillCircle(134, 43, 5);
      g.fillStyle(0x634638).fillCircle(134, 43, 3);
    });

    make("chair", 42, 48, (g) => {
      g.fillStyle(0x0d1822, 0.3).fillEllipse(21, 42, 37, 10);
      g.lineStyle(3, 0x81909a).lineBetween(21, 28, 21, 41).lineBetween(7, 40, 35, 40);
      g.fillStyle(0x192a38).fillRoundedRect(7, 3, 28, 26, 8);
      g.fillStyle(0x426071).fillRoundedRect(10, 5, 22, 19, 6);
      g.fillStyle(0x243b4a).fillRoundedRect(8, 25, 26, 13, 5);
      g.fillStyle(0x91a3aa).fillCircle(7, 41, 3).fillCircle(35, 41, 3);
    });

    make("plant", 46, 60, (g) => {
      g.fillStyle(0x101923, 0.25).fillEllipse(23, 55, 34, 8);
      g.lineStyle(2, 0x366c43).lineBetween(23, 44, 23, 12).lineBetween(23, 36, 9, 20).lineBetween(23, 32, 37, 17);
      g.fillStyle(0x286a43).fillEllipse(12, 19, 18, 11).fillEllipse(34, 17, 18, 12).fillEllipse(21, 10, 12, 19);
      g.fillStyle(0x3d9660).fillEllipse(10, 28, 15, 10).fillEllipse(35, 28, 16, 11).fillEllipse(24, 22, 14, 17);
      g.fillStyle(0xd2c7b5).fillRoundedRect(12, 40, 22, 16, 3);
      g.fillStyle(0xf0e3ce).fillRect(10, 39, 26, 4);
      g.fillStyle(0xa89b88).fillRect(15, 53, 16, 2);
    });

    make("coffee_bar", 112, 78, (g) => {
      g.fillStyle(0x101923, 0.3).fillEllipse(56, 71, 106, 12);
      g.fillStyle(0x725542).fillRoundedRect(5, 31, 102, 39, 3);
      g.fillStyle(0xb38a64).fillRoundedRect(3, 27, 106, 9, 2);
      g.lineStyle(1, 0x433a34).lineBetween(56, 37, 56, 66);
      g.fillStyle(0xe3c69d).fillRect(48, 45, 3, 8).fillRect(61, 45, 3, 8);
      g.fillStyle(0x1c2a32).fillRoundedRect(18, 4, 33, 25, 4);
      g.fillStyle(0x90a7a5).fillRect(23, 8, 23, 5);
      g.fillStyle(0x527a78).fillRect(25, 16, 10, 8);
      g.fillStyle(0xece3d3).fillRoundedRect(39, 19, 8, 8, 2);
      [69, 84, 98].forEach((x) => {
        g.fillStyle(0xf1e4d4).fillRoundedRect(x, 19, 10, 9, 2);
        g.lineStyle(1, 0xd4c4ae).strokeCircle(x + 10, 23, 3);
      });
    });

    make("sofa", 140, 72, (g) => {
      g.fillStyle(0x101923, 0.3).fillEllipse(70, 64, 130, 13);
      g.fillStyle(0x263c48).fillRoundedRect(5, 8, 130, 53, 10);
      g.fillStyle(0x52737a).fillRoundedRect(12, 13, 116, 28, 7);
      g.fillStyle(0x688d90).fillRoundedRect(14, 33, 54, 22, 5).fillRoundedRect(72, 33, 54, 22, 5);
      g.fillStyle(0x3b5961).fillRoundedRect(4, 30, 12, 32, 5).fillRoundedRect(124, 30, 12, 32, 5);
      g.fillStyle(0xd9b57a).fillRoundedRect(19, 18, 18, 14, 3);
    });

    make("whiteboard", 150, 68, (g) => {
      g.fillStyle(0x12212a, 0.35).fillRoundedRect(3, 4, 145, 62, 3);
      g.fillStyle(0x9baeb0).fillRoundedRect(1, 1, 148, 63, 3);
      g.fillStyle(0xe8efea).fillRect(5, 5, 140, 53);
      g.lineStyle(1, 0xb4c4bf).lineBetween(52, 8, 52, 56).lineBetween(98, 8, 98, 56);
      g.fillStyle(0xf2cf76).fillRect(12, 25, 15, 12).fillRect(32, 40, 15, 12);
      g.fillStyle(0x83cbd2).fillRect(59, 25, 15, 12).fillRect(78, 40, 15, 12);
      g.fillStyle(0xa3d99e).fillRect(105, 25, 15, 12).fillRect(124, 40, 15, 12);
      g.fillStyle(0x6a8083).fillRect(7, 60, 136, 3);
    });
  }

  create() {
    this.destination = null;
    this.pendingTarget = null;
    this.path = [];
    this.pathBlocked = false;
    this.pathRetries = 0;
    this.lastStepAt = -Infinity;
    const hasOfficeFloor = this.hasTexture("floor_office") && !this.generatedOfficeTextures?.has("floor_office");
    this.generateOfficeTextures();
    if (!hasOfficeFloor && this.hasTexture("floor_tile")) {
      this.add.tileSprite(400, 300, 800, 600, "floor_tile").setDepth(0);
      this.add.rectangle(400, 35, 800, 70, 0x1e293b).setDepth(0);
      this.add.rectangle(12, 335, 24, 530, 0x1e293b).setDepth(0);
      this.add.rectangle(788, 335, 24, 530, 0x1e293b).setDepth(0);
      this.add.text(35, 22, "IT-OFFICE", {
        fontFamily: "sans-serif", fontSize: "16px", color: "#94a3b8", fontStyle: "bold"
      }).setDepth(0);
    } else {
      this.add.image(400, 300, "floor_office").setDisplaySize(800, 600).setDepth(0);
    }
    this.sortedObjects = [];
    this.solidFurniture = this.physics.add.staticGroup();

    this.playerRing = this.add.ellipse(400, 516, 44, 14, 0x38bdf8, 0.45)
      .setStrokeStyle(2, 0xffffff, 0.9);
    this.playerDirection = "down";
    if (this.hasTexture("player")) {
      for (const [direction, start] of Object.entries({ up: 105, left: 118, down: 131, right: 144 })) {
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
      this.player = this.physics.add.sprite(400, 490, "player", 130).setDisplaySize(64, 64);
      this.player.body.setSize(28, 20);
      this.player.body.setOffset(18, 42);
    } else {
      this.player = this.add.rectangle(400, 490, 28, 38, 0xfbbf24).setStrokeStyle(2, 0xfef3c7);
      this.physics.add.existing(this.player);
    }
    this.player.body.setCollideWorldBounds(true);
    this.lastPlayerPosition = { x: this.player.x, y: this.player.y };
    this.playerLabel = this.add.text(400, 450, "Du", {
      fontFamily: "sans-serif",
      fontSize: "14px",
      color: "#ffffff",
      backgroundColor: "#0f172a",
      padding: { x: 6, y: 2 }
    }).setOrigin(0.5).setDepth(2000);
    this.sortedObjects.push(this.player);
    this.updatePlayerMarkers();
    this.events.on("postupdate", this.updatePlayerMarkers, this);

    const furniture = this.officeData.furniture ?? [
      { type: "desk", x: 180, y: 175 },
      { type: "desk", x: 405, y: 130 },
      { type: "desk", x: 610, y: 265 },
      { type: "desk", x: 700, y: 160, width: 125, height: 35 }
    ];
    furniture.forEach((item) => this.addFurniture(item));
    this.physics.add.collider(this.player, this.solidFurniture, () => {
      if (this.destination) {
        if (this.pendingTarget) {
          this.pathBlocked = true;
        }
        this.destination = null;
        this.path = [];
        this.player.body.setVelocity(0);
      }
    });

    this.officeData.npcs.forEach((npc) => {
      this.addCharacter(npc, Phaser.Display.Color.HexStringToColor(npc.color).color, () => this.ui.startDialogue(npc));
    });
    this.addCharacter(this.officeData.bossQuiz, 0xfb7185, () => this.ui.startQuiz());
    this.updateDepths();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys("W,A,S,D");
    this.input.on("pointerdown", (pointer, currentlyOver) => {
      if (this.ui.isBlockingGame || currentlyOver.length) return;
      this.pendingTarget = null;
      this.path = [];
      this.pathBlocked = false;
      this.destination = new Phaser.Math.Vector2(
        Phaser.Math.Clamp(pointer.worldX, 14, 786),
        Phaser.Math.Clamp(pointer.worldY, 19, 581)
      );
    });
    this.ui.enableStart();
  }

  addFurniture(item) {
    if (!Object.hasOwn(OFFICE_SIZES, item.type)) {
      console.warn("Unbekannter Möbeltyp:", item.type);
      return;
    }
    const [defaultWidth, defaultHeight] = OFFICE_SIZES[item.type];
    const width = item.width ?? defaultWidth;
    const height = item.height ?? defaultHeight;
    // Legacy "desk" entries use the new desk artwork when no desk.png exists.
    const key = item.type === "desk" && !this.hasTexture("desk") ? "desk_dual" : item.type;
    const furniture = this.add.image(item.x, item.y, key).setDisplaySize(width, height);
    this.sortedObjects.push(furniture);
    if (item.solid ?? item.type === "desk") {
      this.solidFurniture.add(furniture);
      furniture.body.updateFromGameObject();
      furniture.body.setSize(width, height / 2);
      furniture.body.setOffset(0, height / 2);
    }
    if (item.type === "whiteboard" && this.generatedOfficeTextures.has("whiteboard")) {
      ["TO DO", "DOING", "DONE"].forEach((title, index) => {
        this.add.text(item.x - width / 2 + width * (0.18 + index * 0.31), item.y - height * 0.31, title, {
          fontFamily: "sans-serif", fontSize: `${Math.max(6, Math.round(height * 0.11))}px`,
          fontStyle: "bold", color: "#49636a"
        }).setOrigin(0.5).setDepth(item.y + 0.01);
      });
    }
  }

  addCharacter(character, color, onClick) {
    const ring = this.add.ellipse(character.x, character.y + 30, 44, 14, 0x38bdf8, 0.25)
      .setStrokeStyle(2, 0xffffff, 0.8).setVisible(false).setDepth(character.y - 0.01);
    let figure;
    if (this.hasCharacterTexture(character.sprite)) {
      figure = this.physics.add.sprite(character.x, character.y, character.sprite, IDLE_FRAMES[character.facing] ?? IDLE_FRAMES.down)
        .setDisplaySize(64, 64).setImmovable(true);
    } else {
      figure = this.add.rectangle(character.x, character.y, 42, 52, color)
        .setStrokeStyle(2, 0xffffff);
    }
    figure.setInteractive({ useHandCursor: true });
    this.sortedObjects.push(figure);
    figure.on("pointerover", () => ring.setVisible(true));
    figure.on("pointerout", () => ring.setVisible(false));
    figure.on("pointerdown", () => {
      if (this.ui.isBlockingGame) return;
      this.destination = null;
      this.player.body.setVelocity(0);
      this.pendingTarget = { figure, character, onClick };
      this.path = [];
      this.pathBlocked = false;
      this.pathRetries = 0;
      this.ui.showStatus("");
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, figure.x, figure.y) >= 70) {
        const path = this.findPathToCharacter(figure);
        if (!path) {
          this.pendingTarget = null;
          this.ui.showStatus("Kein freier Weg zur Person. Versuche es von einer anderen Stelle aus.");
          return;
        }
        this.path = path;
        this.destination = this.path.shift();
      }
    });
    this.add.text(character.x, character.y - figure.displayHeight / 2 - 12, character.name, {
      fontFamily: "sans-serif",
      fontSize: "14px",
      color: "#ffffff",
      backgroundColor: "#0f172a",
      padding: { x: 5, y: 2 }
    }).setOrigin(0.5).setDepth(2000);
  }

  findPathToCharacter(figure) {
    const spacing = 10;
    const columns = 81;
    const rows = 61;
    const body = this.player.body;
    const offsetX = (body.offset.x - this.player.displayOriginX) * this.player.scaleX;
    const offsetY = (body.offset.y - this.player.displayOriginY) * this.player.scaleY;
    const obstacles = this.solidFurniture.getChildren().map((item) => item.body);
    const clear = (col, row) => {
      if (col < 0 || col >= columns || row < 0 || row >= rows) return false;
      const left = col * spacing + offsetX - 4;
      const top = row * spacing + offsetY - 4;
      const right = left + body.width + 8;
      const bottom = top + body.height + 8;
      return left >= 0 && top >= 0 && right <= 800 && bottom <= 600 &&
        obstacles.every((obstacle) =>
          right <= obstacle.left || left >= obstacle.right || bottom <= obstacle.top || top >= obstacle.bottom);
    };
    const startCol = Phaser.Math.Clamp(Math.round(this.player.x / spacing), 0, columns - 1);
    const startRow = Phaser.Math.Clamp(Math.round(this.player.y / spacing), 0, rows - 1);
    const startKey = startRow * columns + startCol;
    const heuristic = (col, row) => Math.max(0,
      Math.hypot(col * spacing - figure.x, row * spacing - figure.y) - 65);
    const start = { col: startCol, row: startRow, cost: 0, score: heuristic(startCol, startRow), parent: null };
    const open = [start];
    const best = new Map([[startKey, start]]);
    const closed = new Set();
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

    while (open.length) {
      let lowest = 0;
      for (let i = 1; i < open.length; i++) {
        if (open[i].score < open[lowest].score) lowest = i;
      }
      const current = open.splice(lowest, 1)[0];
      const key = current.row * columns + current.col;
      if (closed.has(key)) continue;
      closed.add(key);
      if (Math.hypot(current.col * spacing - figure.x, current.row * spacing - figure.y) < 65) {
        const path = [];
        for (let node = current; node.parent; node = node.parent) {
          path.push(new Phaser.Math.Vector2(node.col * spacing, node.row * spacing));
        }
        if (!path.length) path.push(new Phaser.Math.Vector2(current.col * spacing, current.row * spacing));
        return path.reverse();
      }
      directions.forEach(([dx, dy]) => {
        const col = current.col + dx;
        const row = current.row + dy;
        const nextKey = row * columns + col;
        if (!clear(col, row) || closed.has(nextKey) ||
            (dx && dy && (!clear(current.col + dx, current.row) || !clear(current.col, current.row + dy)))) return;
        const cost = current.cost + (dx && dy ? Math.SQRT2 * spacing : spacing);
        const previous = best.get(nextKey);
        if (previous && previous.cost <= cost) return;
        const node = { col, row, cost, score: cost + heuristic(col, row), parent: current };
        best.set(nextKey, node);
        open.push(node);
      });
    }
    return null;
  }

  startPendingInteraction() {
    const { figure, character, onClick } = this.pendingTarget;
    this.pendingTarget = null;
    this.destination = null;
    this.path = [];
    this.pathBlocked = false;
    this.player.body.setVelocity(0, 0);
    if (this.hasCharacterTexture(character.sprite) && (this.player.x !== figure.x || this.player.y !== figure.y)) {
      const angle = Phaser.Math.Angle.Between(figure.x, figure.y, this.player.x, this.player.y);
      const direction = Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))
        ? (Math.cos(angle) < 0 ? "left" : "right")
        : (Math.sin(angle) < 0 ? "up" : "down");
      figure.setFrame(IDLE_FRAMES[direction]);
    }
    onClick();
  }

  updateDepths() {
    this.sortedObjects.forEach((object) => object.setDepth(object.y));
    this.playerRing.setDepth(this.player.y - 0.01);
  }

  updatePlayerMarkers() {
    this.playerRing.setPosition(this.player.x, this.player.y + this.player.displayHeight / 2 - 2);
    this.playerLabel.setPosition(this.player.x, this.player.y - this.player.displayHeight / 2 - 12);
  }

  update(time) {
    this.updatePlayerMarkers();
    this.updateDepths();
    if (this.ui.isBlockingGame) {
      this.destination = null;
      this.pendingTarget = null;
      this.path = [];
      this.pathBlocked = false;
      this.player.body.setVelocity(0);
    } else {
      const x = Number(this.cursors.right.isDown || this.wasd.D.isDown) - Number(this.cursors.left.isDown || this.wasd.A.isDown);
      const y = Number(this.cursors.down.isDown || this.wasd.S.isDown) - Number(this.cursors.up.isDown || this.wasd.W.isDown);
      const speed = 180;
      if (x || y) {
        this.destination = null;
        this.pendingTarget = null;
        this.path = [];
        this.pathBlocked = false;
        const direction = new Phaser.Math.Vector2(x, y).normalize().scale(speed);
        this.player.body.setVelocity(direction.x, direction.y);
      } else if (this.pendingTarget && Phaser.Math.Distance.Between(
        this.player.x, this.player.y, this.pendingTarget.figure.x, this.pendingTarget.figure.y
      ) < 70) {
        this.startPendingInteraction();
      } else if (this.pendingTarget && this.pathBlocked) {
        this.pathBlocked = false;
        this.pathRetries += 1;
        const path = this.pathRetries <= 3 ? this.findPathToCharacter(this.pendingTarget.figure) : null;
        if (path) {
          this.path = path;
          this.destination = this.path.shift();
        } else {
          this.pendingTarget = null;
          this.ui.showStatus("Der Weg ist versperrt. Versuche es von einer anderen Stelle aus.");
        }
      } else if (this.destination) {
        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.destination.x, this.destination.y);
        if (distance < 3) {
          this.destination = this.path.shift() ?? null;
        }
        if (this.destination) {
          const remaining = Phaser.Math.Distance.Between(
            this.player.x, this.player.y, this.destination.x, this.destination.y
          );
          this.physics.moveTo(this.player, this.destination.x, this.destination.y, Math.min(speed, remaining * 16));
        } else {
          this.player.body.setVelocity(0);
          if (this.pendingTarget) {
            this.pendingTarget = null;
            this.ui.showStatus("Die Person ist nicht erreichbar. Versuche es von einer anderen Stelle aus.");
          }
        }
      } else {
        this.player.body.setVelocity(0);
      }
    }

    const moved = Phaser.Math.Distance.Between(
      this.player.x, this.player.y, this.lastPlayerPosition.x, this.lastPlayerPosition.y
    );
    if (moved > 0.1 && this.player.body.speed > 5 && time - this.lastStepAt >= 280) {
      soundManager.playStep();
      this.lastStepAt = time;
    }
    this.lastPlayerPosition.x = this.player.x;
    this.lastPlayerPosition.y = this.player.y;

    if (this.hasTexture("player")) {
      const { x, y } = this.player.body.velocity;
      if (Math.hypot(x, y) > 5) {
        this.playerDirection = Math.abs(x) > Math.abs(y)
          ? (x < 0 ? "left" : "right")
          : (y < 0 ? "up" : "down");
        this.player.anims.play(`walk-${this.playerDirection}`, true);
      } else {
        this.player.anims.stop();
        this.player.setFrame(IDLE_FRAMES[this.playerDirection]);
      }
    }
  }
}
