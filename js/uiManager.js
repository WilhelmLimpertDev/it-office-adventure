import { soundManager } from "./soundManager.js";

const STORAGE_KEY = "it_office_adventure_save_v1";

export class UIManager {
  constructor(data) {
    this.data = data;
    this.isGameStarted = false;
    this.unlockedRoles = new Set();
    this.quizCompleted = false;
    this.lastQuizScore = 0;
    this.storageWarning = "";
    this.activeNpc = null;
    this.dialogueIndex = 0;
    this.typewriterTimer = null;
    this.quizIndex = 0;
    this.quizScore = 0;
    this.quizAnswers = [];
    this.dialogue = document.getElementById("dialogue-overlay");
    this.notebook = document.getElementById("notebook-overlay");
    this.quiz = document.getElementById("quiz-overlay");
    this.notebookButton = document.getElementById("notebook-button");
    this.soundButton = document.getElementById("sound-toggle");
    this.status = document.getElementById("game-status");
    this.startScreen = document.getElementById("start-screen");
    this.startButton = document.getElementById("start-game-btn");
    this.continueButton = document.getElementById("continue-game-btn");
    this.startStatus = document.getElementById("start-status");
    this.quizStorageStatus = document.getElementById("quiz-storage-status");
    this.quizBody = document.getElementById("quiz-body");
    this.quizResult = document.getElementById("quiz-result-screen");
    document.getElementById("start-title").textContent = data.meta.title;
    document.getElementById("start-subtitle").textContent = data.meta.subtitle;
    document.getElementById("start-mission").textContent = data.meta.missionText;
    this.startButton.addEventListener("click", () => {
      if (this.isGameStarted || this.startButton.disabled) return;
      this.resetProgress();
      this.startGame();
    });
    this.continueButton.addEventListener("click", () => this.startGame());
    this.notebookButton.addEventListener("click", () => this.toggleNotebook());
    this.soundButton.addEventListener("click", () => {
      const muted = soundManager.toggleMute();
      this.soundButton.textContent = muted ? "🔇 Ton aus" : "🔊 Ton an";
      this.soundButton.setAttribute("aria-pressed", String(!muted));
    });
    document.getElementById("notebook-close").addEventListener("click", () => this.toggleNotebook(false));
    document.getElementById("quiz-close").addEventListener("click", () => this.closeQuiz());
    document.getElementById("quiz-retry").addEventListener("click", () => {
      this.resetQuizAttempt();
      this.renderQuestion();
    });
    document.getElementById("quiz-notebook").addEventListener("click", () => {
      this.closeQuiz();
      this.toggleNotebook(true);
    });
    document.getElementById("quiz-return").addEventListener("click", () => this.closeQuiz());
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (!this.notebook.hidden) this.toggleNotebook(false);
        else if (!this.quiz.hidden) this.closeQuiz();
      }
    });
    this.loadProgress();
  }

  reportStorageError(message, error) {
    console.error(message, error);
    this.storageWarning = message;
    if (!this.isGameStarted) this.startStatus.textContent = message;
    else if (!this.quiz.hidden) this.quizStorageStatus.textContent = message;
    else this.showStatus(message);
  }

  saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        unlockedIds: [...this.unlockedRoles],
        quizCompleted: this.quizCompleted,
        lastQuizScore: this.lastQuizScore
      }));
      this.storageWarning = "";
      this.quizStorageStatus.textContent = "";
    } catch (error) {
      this.reportStorageError("Der Fortschritt konnte nicht gespeichert werden. Prüfe die Browser-Speichereinstellungen.", error);
    }
  }

  loadProgress() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const progress = JSON.parse(saved);
        if (!progress || typeof progress !== "object" || !Array.isArray(progress.unlockedIds) ||
            !progress.unlockedIds.every((id) => typeof id === "string") ||
            typeof progress.quizCompleted !== "boolean" ||
            !Number.isInteger(progress.lastQuizScore) || progress.lastQuizScore < 0) {
          throw new Error("Ungültiges Spielstandformat");
        }
        const validIds = new Set(this.data.npcs.map((npc) => npc.id));
        this.unlockedRoles = new Set(progress.unlockedIds.filter((id) => validIds.has(id)));
        this.quizCompleted = progress.quizCompleted;
        this.lastQuizScore = progress.lastQuizScore;
        if (progress.unlockedIds.some((id) => !validIds.has(id))) {
          this.reportStorageError("Einige gespeicherte Rollen sind in dieser Spielversion nicht verfügbar.", new Error("Unbekannte Rollen-ID"));
        }
      }
    } catch (error) {
      this.reportStorageError("Der Spielstand konnte nicht geladen werden. Ein neues Spiel kann gestartet werden.", error);
    }
    this.updateNotebookButton();
    this.updateStartMenu();
  }

  resetProgress() {
    this.unlockedRoles.clear();
    this.quizCompleted = false;
    this.lastQuizScore = 0;
    this.resetQuizAttempt();
    this.updateNotebookButton();
    this.updateStartMenu();
    try {
      localStorage.removeItem(STORAGE_KEY);
      this.storageWarning = "";
      this.startStatus.textContent = "";
      this.quizStorageStatus.textContent = "";
    } catch (error) {
      this.reportStorageError("Der gespeicherte Spielstand konnte nicht gelöscht werden. Prüfe die Browser-Speichereinstellungen.", error);
    }
  }

  updateStartMenu() {
    const hasProgress = this.unlockedRoles.size > 0;
    this.continueButton.hidden = !hasProgress;
    this.continueButton.classList.toggle("hidden", !hasProgress);
    this.continueButton.textContent = `Spielstand fortsetzen (${this.unlockedRoles.size}/${this.data.npcs.length} Rollen) ▶`;
    this.startButton.textContent = hasProgress ? "Neues Spiel starten" : "Büro betreten ▶";
    this.startButton.classList.toggle("button-secondary", hasProgress);
  }

  get isBlockingGame() {
    return !this.isGameStarted || !this.dialogue.hidden || !this.notebook.hidden || !this.quiz.hidden;
  }

  enableStart() {
    if (this.isGameStarted) return;
    this.startStatus.textContent = this.storageWarning;
    this.startButton.disabled = false;
    this.continueButton.disabled = false;
    (this.continueButton.hidden ? this.startButton : this.continueButton).focus({ preventScroll: true });
  }

  startGame() {
    if (this.isGameStarted || this.startButton.disabled) return;
    this.isGameStarted = true;
    if (this.storageWarning) this.showStatus(this.storageWarning);
    soundManager.unlock().then(() => soundManager.playCollect());
    const canvas = document.getElementById("game-canvas");
    canvas.inert = false;
    document.querySelector(".hud").inert = false;
    canvas.focus({ preventScroll: true });
    this.startScreen.inert = true;
    this.startScreen.setAttribute("aria-hidden", "true");
    this.startScreen.classList.add("hidden");
    this.startScreen.querySelector(".start-card").classList.add("hidden");
    setTimeout(() => { this.startScreen.hidden = true; }, 300);
  }

  showStatus(message) {
    this.status.textContent = message;
  }

  startDialogue(npc) {
    if (this.isBlockingGame) return;
    this.showStatus("");
    this.activeNpc = npc;
    this.dialogueIndex = 0;
    this.dialogue.hidden = false;
    this.renderDialogue();
  }

  renderDialogue() {
    const step = this.activeNpc.dialogue[this.dialogueIndex];
    document.getElementById("dialogue-speaker").textContent = step.speaker;
    const text = document.getElementById("dialogue-text");
    const characters = Array.from(step.text);
    text.textContent = "";
    document.getElementById("dialogue-announcement").textContent = `${step.speaker}: ${step.text}`;
    clearInterval(this.typewriterTimer);
    this.typewriterTimer = null;
    let index = 0;
    let visibleCharacters = 0;
    if (characters.length) {
      this.typewriterTimer = setInterval(() => {
        const character = characters[index++];
        text.textContent += character;
        if (!/\s/u.test(character) && ++visibleCharacters % 2 === 0) {
          soundManager.playVoiceBlip(this.activeNpc.voicePitch);
        }
        if (index === characters.length) {
          clearInterval(this.typewriterTimer);
          this.typewriterTimer = null;
        }
      }, 28);
    }
    const actions = document.getElementById("dialogue-actions");
    actions.replaceChildren();
    const advance = () => {
      if (this.typewriterTimer !== null) {
        clearInterval(this.typewriterTimer);
        this.typewriterTimer = null;
        text.textContent = step.text;
        return;
      }
      this.dialogueIndex += 1;
      if (this.dialogueIndex < this.activeNpc.dialogue.length) {
        this.renderDialogue();
      } else {
        const isNewRole = !this.unlockedRoles.has(this.activeNpc.id);
        this.unlockedRoles.add(this.activeNpc.id);
        if (isNewRole) soundManager.playCollect();
        this.updateNotebookButton();
        this.showStatus(`${this.activeNpc.roleTitle} wurde im Notizbuch freigeschaltet.`);
        if (isNewRole) this.saveProgress();
        this.activeNpc = null;
        this.dialogue.hidden = true;
      }
    };
    if (step.choices && step.choices.length) {
      step.choices.forEach((choice) => actions.append(this.createButton(choice, advance)));
    } else {
      const label = this.dialogueIndex === this.activeNpc.dialogue.length - 1 ? "Gespräch beenden" : "Weiter";
      actions.append(this.createButton(label, advance));
    }
  }

  updateNotebookButton() {
    this.notebookButton.textContent = `Notizbuch (${this.unlockedRoles.size}/${this.data.npcs.length})`;
  }

  toggleNotebook(open = this.notebook.hidden) {
    if (open && (!this.isGameStarted || !this.dialogue.hidden || !this.quiz.hidden)) return;
    this.notebook.hidden = !open;
    this.notebookButton.setAttribute("aria-expanded", String(open));
    if (open) {
      this.renderNotebook();
      document.getElementById("notebook-close").focus();
    } else {
      this.notebookButton.focus();
    }
  }

  renderNotebook() {
    const cards = document.getElementById("notebook-cards");
    cards.replaceChildren();
    const roles = this.data.npcs.filter((npc) => this.unlockedRoles.has(npc.id));
    if (!roles.length) {
      cards.append(this.element("p", "Noch keine Rollen entdeckt. Sprich zuerst mit dem Team im Büro."));
      return;
    }
    roles.forEach((npc) => {
      const card = this.element("article", "", "card");
      card.append(this.element("h3", npc.roleTitle), this.element("p", `${npc.name} · ${npc.department}`));
      card.append(this.element("strong", "Hauptaufgaben"));
      const tasks = document.createElement("ul");
      npc.cardData.tasks.forEach((task) => tasks.append(this.element("li", task)));
      card.append(tasks);
      this.appendField(card, "Erfahrung / Ausbildung", npc.cardData.experience);
      this.appendField(card, "Tech-Stack", npc.cardData.techStack.join(", "));
      this.appendField(card, "Gehalt", npc.cardData.salaryRange);
      cards.append(card);
    });
  }

  startQuiz() {
    if (this.isBlockingGame) return;
    const remaining = this.data.bossQuiz.minUnlockedRoles - this.unlockedRoles.size;
    if (remaining > 0) {
      this.showStatus(`Sprich zuerst mit ${remaining} weiteren ${remaining === 1 ? "Person" : "Personen"}, um das Quiz freizuschalten.`);
      return;
    }
    this.showStatus("");
    this.resetQuizAttempt();
    this.quiz.hidden = false;
    this.quizStorageStatus.textContent = this.storageWarning;
    this.renderQuizIntro();
    document.getElementById("quiz-close").focus();
  }

  resetQuizAttempt() {
    this.quizIndex = 0;
    this.quizScore = 0;
    this.quizAnswers = [];
    this.quizBody.hidden = false;
    this.quizResult.hidden = true;
    this.quizResult.classList.add("hidden");
  }

  renderQuizIntro() {
    const body = document.getElementById("quiz-body");
    body.replaceChildren(
      this.element("p", this.data.bossQuiz.introText),
      this.createButton("Quiz starten", () => this.renderQuestion())
    );
  }

  renderQuestion() {
    const questions = this.data.bossQuiz.questions;
    const question = questions[this.quizIndex];
    const body = document.getElementById("quiz-body");
    const options = this.element("div", "", "quiz-options");
    question.options.forEach((option, index) => {
      options.append(this.createButton(option, () => this.answerQuestion(index)));
    });
    body.replaceChildren(
      this.element("p", `Frage ${this.quizIndex + 1} von ${questions.length}`),
      this.element("h3", question.question),
      options
    );
    options.querySelector("button").focus();
  }

  answerQuestion(index) {
    const question = this.data.bossQuiz.questions[this.quizIndex];
    const correct = index === question.correctIndex;
    if (correct) this.quizScore += 1;
    this.quizAnswers.push({ question, correct });
    const body = document.getElementById("quiz-body");
    const feedback = this.element("div", "", "feedback");
    feedback.append(
      this.element("strong", correct ? "Richtig!" : `Nicht ganz. Richtig ist: ${question.options[question.correctIndex]}.`),
      this.element("p", question.explanation)
    );
    this.quizIndex += 1;
    const last = this.quizIndex === this.data.bossQuiz.questions.length;
    if (last) {
      this.quizCompleted = true;
      this.lastQuizScore = this.quizScore;
      this.saveProgress();
    }
    const next = this.createButton(last ? "Auswertung anzeigen" : "Nächste Frage", () => {
      if (last) this.renderQuizResult();
      else this.renderQuestion();
    });
    body.replaceChildren(feedback, next);
    next.focus();
  }

  renderQuizResult() {
    const total = this.data.bossQuiz.questions.length;
    const ratio = this.quizScore / total;
    document.getElementById("quiz-result-score").textContent = `${this.quizScore} von ${total} richtig`;
    document.getElementById("quiz-result-rank").textContent = ratio === 1
      ? "🏆 IT-Karriere-Experte"
      : ratio >= 0.5 ? "⭐ Auf dem besten Weg in die IT" : "📚 Guter Start – schau nochmal ins Notizbuch!";
    const answers = document.getElementById("quiz-result-answers");
    answers.replaceChildren();
    this.quizAnswers.forEach(({ question, correct }) => {
      const item = this.element("li", "", correct ? "correct" : "incorrect");
      item.append(this.element("strong", `${correct ? "✅ Richtig" : "❌ Falsch"}: ${question.question}`));
      if (!correct) item.append(this.element("p", `Richtige Rolle: ${question.options[question.correctIndex]}`));
      answers.append(item);
    });
    this.quizBody.hidden = true;
    this.quizResult.hidden = false;
    this.quizResult.classList.remove("hidden");
    document.getElementById("quiz-result-title").focus();
    if (ratio >= 0.5) soundManager.playVictory();
  }

  closeQuiz() {
    this.quiz.hidden = true;
    if (this.storageWarning) this.showStatus(this.storageWarning);
    this.notebookButton.focus();
  }

  createButton(label, onClick) {
    const button = this.element("button", label);
    button.type = "button";
    button.addEventListener("click", onClick);
    return button;
  }

  element(tag, text, className) {
    const element = document.createElement(tag);
    element.textContent = text;
    if (className) element.className = className;
    return element;
  }

  appendField(parent, label, value) {
    const field = document.createElement("p");
    field.append(this.element("strong", `${label}: `), document.createTextNode(value));
    parent.append(field);
  }
}
