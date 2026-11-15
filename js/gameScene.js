export class GameScene extends Phaser.Scene {
  constructor(data, ui) {
    super({ key: "OfficeScene" });
    this.officeData = data;
    this.ui = ui;
    this.destination = null;
  }

  preload() {
    this.load.spritesheet("player", "./assets/images/player.png", { frameWidth: 64, frameHeight: 64 });
    const keys = new Set([
      "floor_tile", "desk", "boss",
      ...this.officeData.npcs.map((npc) => npc.sprite),
      this.officeData.bossQuiz.sprite
    ]);
    keys.forEach((key) => {
      if (key == null || key === "player") return;
      if (typeof key !== "string" || !/^[a-zA-Z0-9_-]+$/.test(key) || key === "__MISSING") {
        console.warn("Ungültiger Sprite-Schlüssel:", key);
        return;
      }
      this.load.image(key, `./assets/images/${key}.png`);
    });
  }

  hasTexture(key) {
    return typeof key === "string" && key !== "__MISSING" && this.textures.exists(key);
  }

  create() {
    if (this.hasTexture("floor_tile")) {
      this.add.tileSprite(400, 300, 800, 600, "floor_tile");
    } else {
      this.add.rectangle(400, 300, 800, 600, 0x334155);
    }
    this.add.rectangle(400, 35, 800, 70, 0x1e293b);
    this.add.rectangle(12, 335, 24, 530, 0x1e293b);
    this.add.rectangle(788, 335, 24, 530, 0x1e293b);
    this.add.text(35, 22, "IT-OFFICE", { fontFamily: "sans-serif", fontSize: "16px", color: "#94a3b8", fontStyle: "bold" });

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
    this.playerLabel = this.add.text(400, 450, "Du", {
      fontFamily: "sans-serif",
      fontSize: "14px",
      color: "#ffffff",
      backgroundColor: "#0f172a",
      padding: { x: 6, y: 2 }
    }).setOrigin(0.5);
    this.updatePlayerMarkers();
    this.events.on("postupdate", this.updatePlayerMarkers, this);

    const furniture = this.officeData.furniture ?? [
      { type: "desk", x: 180, y: 175 },
      { type: "desk", x: 405, y: 130 },
      { type: "desk", x: 610, y: 265 },
      { type: "desk", x: 700, y: 160, width: 125, height: 35 }
    ];
    furniture.forEach((item) => this.addFurniture(item));

    this.officeData.npcs.forEach((npc) => {
      this.addCharacter(npc, Phaser.Display.Color.HexStringToColor(npc.color).color, () => this.ui.startDialogue(npc));
    });
    this.addCharacter(this.officeData.bossQuiz, 0xfb7185, () => this.ui.startQuiz());

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys("W,A,S,D");
    this.input.on("pointerdown", (pointer, currentlyOver) => {
      if (this.ui.isBlockingGame || currentlyOver.length) return;
      this.destination = new Phaser.Math.Vector2(
        Phaser.Math.Clamp(pointer.worldX, 14, 786),
        Phaser.Math.Clamp(pointer.worldY, 19, 581)
      );
    });
  }

  addFurniture(item) {
    if (item.type !== "desk") {
      console.warn("Unbekannter Möbeltyp:", item.type);
      return;
    }
    const width = item.width ?? 120;
    const height = item.height ?? 45;
    let desk;
    if (this.hasTexture("desk")) {
      desk = this.physics.add.staticImage(item.x, item.y, "desk").setDisplaySize(width, height);
      desk.refreshBody();
    } else {
      desk = this.add.rectangle(item.x, item.y, width, height, 0x8b735e).setStrokeStyle(3, 0x5b4638);
      this.physics.add.existing(desk, true);
      if (height === 45) this.add.rectangle(item.x, item.y - 6, 34, 20, 0x1e293b);
    }
    this.physics.add.collider(this.player, desk, () => {
      if (this.destination) {
        this.destination = null;
        this.player.body.setVelocity(0);
      }
    });
  }

  addCharacter(character, color, onClick) {
    let figure;
    if (this.hasTexture(character.sprite)) {
      figure = this.physics.add.sprite(character.x, character.y, character.sprite)
        .setDisplaySize(42, 52).setImmovable(true);
    } else {
      figure = this.add.rectangle(character.x, character.y, 42, 52, color)
        .setStrokeStyle(2, 0xffffff);
    }
    figure.setInteractive({ useHandCursor: true });
    figure.on("pointerdown", () => {
      this.destination = null;
      this.player.body.setVelocity(0);
      onClick();
    });
    this.add.text(character.x, character.y - 36, character.name, {
      fontFamily: "sans-serif",
      fontSize: "14px",
      color: "#ffffff",
      backgroundColor: "#0f172a",
      padding: { x: 5, y: 2 }
    }).setOrigin(0.5);
  }

  updatePlayerMarkers() {
    this.playerRing.setPosition(this.player.x, this.player.y + this.player.displayHeight / 2 - 2);
    this.playerLabel.setPosition(this.player.x, this.player.y - this.player.displayHeight / 2 - 12);
  }

  update() {
    this.updatePlayerMarkers();
    if (this.ui.isBlockingGame) {
      this.destination = null;
      this.player.body.setVelocity(0);
    } else {
      const x = Number(this.cursors.right.isDown || this.wasd.D.isDown) - Number(this.cursors.left.isDown || this.wasd.A.isDown);
      const y = Number(this.cursors.down.isDown || this.wasd.S.isDown) - Number(this.cursors.up.isDown || this.wasd.W.isDown);
      const speed = 180;
      if (x || y) {
        this.destination = null;
        const direction = new Phaser.Math.Vector2(x, y).normalize().scale(speed);
        this.player.body.setVelocity(direction.x, direction.y);
      } else if (this.destination) {
        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.destination.x, this.destination.y);
        if (distance < 5) {
          this.destination = null;
          this.player.body.setVelocity(0);
        } else {
          this.physics.moveTo(this.player, this.destination.x, this.destination.y, Math.min(speed, distance * 10));
        }
      } else {
        this.player.body.setVelocity(0);
      }
    }

    if (this.hasTexture("player")) {
      const { x, y } = this.player.body.velocity;
      if (Math.hypot(x, y) > 5) {
        this.playerDirection = Math.abs(x) > Math.abs(y)
          ? (x < 0 ? "left" : "right")
          : (y < 0 ? "up" : "down");
        this.player.anims.play(`walk-${this.playerDirection}`, true);
      } else {
        this.player.anims.stop();
        this.player.setFrame({ up: 104, left: 117, down: 130, right: 143 }[this.playerDirection]);
      }
    }
  }
}
