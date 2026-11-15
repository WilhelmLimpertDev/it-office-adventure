import { soundManager } from "./soundManager.js";

export class UIManager {
  constructor(data) {
    this.data = data;
    this.unlockedRoles = new Set();
    this.activeNpc = null;
    this.dialogueIndex = 0;
    this.typewriterTimer = null;
    this.quizIndex = 0;
    this.quizScore = 0;
    this.dialogue = document.getElementById("dialogue-overlay");
    this.notebook = document.getElementById("notebook-overlay");
    this.quiz = document.getElementById("quiz-overlay");
    this.notebookButton = document.getElementById("notebook-button");
    this.soundButton = document.getElementById("sound-toggle");
    this.status = document.getElementById("game-status");
    this.notebookButton.addEventListener("click", () => this.toggleNotebook());
    this.soundButton.addEventListener("click", () => {
      const muted = soundManager.toggleMute();
      this.soundButton.textContent = muted ? "🔇 Ton aus" : "🔊 Ton an";
      this.soundButton.setAttribute("aria-pressed", String(!muted));
    });
    document.getElementById("notebook-close").addEventListener("click", () => this.toggleNotebook(false));
    document.getElementById("quiz-close").addEventListener("click", () => this.closeQuiz());
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (!this.notebook.hidden) this.toggleNotebook(false);
        else if (!this.quiz.hidden) this.closeQuiz();
      }
    });
    this.updateNotebookButton();
  }

  get isBlockingGame() {
    return !this.dialogue.hidden || !this.notebook.hidden || !this.quiz.hidden;
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
    if (open && (!this.dialogue.hidden || !this.quiz.hidden)) return;
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
    this.quizIndex = 0;
    this.quizScore = 0;
    this.quiz.hidden = false;
    this.renderQuizIntro();
    document.getElementById("quiz-close").focus();
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
    const body = document.getElementById("quiz-body");
    const feedback = this.element("div", "", "feedback");
    feedback.append(
      this.element("strong", correct ? "Richtig!" : `Nicht ganz. Richtig ist: ${question.options[question.correctIndex]}.`),
      this.element("p", question.explanation)
    );
    this.quizIndex += 1;
    const last = this.quizIndex === this.data.bossQuiz.questions.length;
    const next = this.createButton(last ? "Auswertung anzeigen" : "Nächste Frage", () => {
      if (last) this.renderQuizResult();
      else this.renderQuestion();
    });
    body.replaceChildren(feedback, next);
    next.focus();
  }

  renderQuizResult() {
    const body = document.getElementById("quiz-body");
    body.replaceChildren(
      this.element("h3", "Auswertung"),
      this.element("p", `Du hast ${this.quizScore} von ${this.data.bossQuiz.questions.length} Fragen richtig beantwortet.`),
      this.createButton("Quiz erneut spielen", () => {
        this.quizIndex = 0;
        this.quizScore = 0;
        this.renderQuestion();
      })
    );
  }

  closeQuiz() {
    this.quiz.hidden = true;
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
