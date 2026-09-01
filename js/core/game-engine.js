import { DataManager } from "../data/data-manager.js";
import { validateQuestions } from "../data/data-validator.js";
import { filterLoadableImages } from "../data/image-preloader.js";
import { pickQuestions, shuffledTokens } from "../game/question-manager.js";
import {
  answerFromIds, applyCorrect, applyIncorrect, assertSettings, createSession,
  getReviewWords, recordLearning, registerAskedWord
} from "../game/rules.js";
import { UIManager } from "../ui/ui-manager.js";
import { VISUAL_ASSETS } from "../ui/visual-assets.js";

class GameEngine {
  constructor() {
    this.ui = new UIManager();
    this.dataManager = new DataManager();
    this.settings = null;
    this.validQuestions = [];
    this.session = null;
    this.tokens = [];
    this.reviewWords = [];
    this.reviewIndex = 0;
    this.dialog = document.getElementById("quit-dialog");
    this.setupVisualAssetFallbacks();
    this.bindEvents();
  }

  async initialize() {
    try {
      const { settings, questions } = await this.dataManager.loadAll();
      assertSettings(settings);
      const structurallyValid = validateQuestions(questions);
      const imageValid = await filterLoadableImages(structurallyValid);
      const largestCount = settings.modes.demonKing.questionCount;
      if (imageValid.length < largestCount) throw new Error("あそべる もんだいが たりません。");
      this.settings = settings;
      this.validQuestions = imageValid;
      this.renderModes();
      this.ui.show("title-scene");
    } catch (error) {
      console.error(error);
      this.showError("データを よみこめませんでした。せんせいに しらせてください。");
    }
  }

  bindEvents() {
    document.addEventListener("click", (event) => {
      const target = event.target.closest("[data-action]");
      if (!target) return;
      const action = target.dataset.action;
      const actions = {
        "show-modes": () => this.ui.show("mode-scene"),
        "show-title": () => this.ui.show("title-scene"),
        "start-mode": () => this.startMode(target.dataset.mode),
        "select-letter": () => this.selectLetter(target.dataset.characterId),
        "remove-letter": () => this.removeLetter(target.dataset.characterId),
        confirm: () => this.confirmAnswer(),
        quit: () => this.openQuitDialog(),
        continue: () => this.closeQuitDialog(),
        "quit-to-title": () => this.quitToTitle(),
        "review-next": () => this.nextReview(),
        retry: () => this.retry(),
        "today-words": () => this.showTodayWords(),
        "end-session": () => this.endSession(),
        reload: () => window.location.reload()
      };
      actions[action]?.();
    });
    this.dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.closeQuitDialog();
    });
    this.dialog.addEventListener("click", (event) => {
      if (event.target === this.dialog) this.closeQuitDialog();
    });
  }

  renderModes() {
    const list = document.getElementById("mode-list");
    list.replaceChildren();
    for (const [id, mode] of Object.entries(this.settings.modes)) {
      const button = document.createElement("button");
      button.className = "mode-button";
      button.dataset.action = "start-mode";
      button.dataset.mode = id;
      button.innerHTML = `<strong>${mode.label}</strong><span>${mode.questionCount}もん</span><span>HP ${mode.playerHP}</span>`;
      list.append(button);
    }
  }

  startMode(modeId) {
    try {
      const mode = this.settings.modes[modeId];
      const selected = pickQuestions(this.validQuestions, mode.questionCount, mode.maxDifficulty);
      this.session = createSession(modeId, this.settings, selected);
      this.applyModeVisuals(modeId);
      this.showCurrentQuestion();
      this.ui.show("battle-scene");
    } catch (error) {
      console.error(error);
      this.showError("このモードに ひつような もんだいが たりません。");
    }
  }

  currentQuestion() { return this.session?.questions[this.session.currentQuestionIndex]; }

  showCurrentQuestion() {
    const question = this.currentQuestion();
    registerAskedWord(this.session, question);
    this.tokens = shuffledTokens(question);
    this.session.selectedCharacterIds = [];
    this.session.inputLocked = false;
    this.ui.text("mode-name", this.session.mode.label);
    this.ui.text("question-progress", `${this.session.currentQuestionIndex + 1} / ${this.session.mode.questionCount} もん`);
    this.ui.setHP("player", this.session.playerHP, this.session.mode.playerHP);
    this.ui.setHP("enemy", this.session.enemyHP, this.session.mode.enemyHP);
    this.ui.text("battle-message", "もじを ならべよう！");
    this.hideHint();
    this.renderLetters();
  }

  renderLetters() {
    const bank = document.getElementById("letter-bank");
    const slots = document.getElementById("answer-slots");
    bank.replaceChildren();
    slots.replaceChildren();
    for (const token of this.tokens) {
      const button = document.createElement("button");
      button.className = "letter-button";
      button.textContent = token.character;
      button.dataset.action = "select-letter";
      button.dataset.characterId = token.id;
      button.setAttribute("aria-label", `${token.character}をえらぶ`);
      if (this.session.selectedCharacterIds.includes(token.id)) {
        button.classList.add("is-selected");
        button.disabled = true;
      }
      bank.append(button);
    }
    for (const id of this.session.selectedCharacterIds) {
      const token = this.tokens.find((item) => item.id === id);
      const button = document.createElement("button");
      button.className = "answer-button";
      button.textContent = token.character;
      button.dataset.action = "remove-letter";
      button.dataset.characterId = id;
      button.setAttribute("aria-label", `${token.character}をもどす`);
      slots.append(button);
    }
    const complete = this.session.selectedCharacterIds.length === this.currentQuestion().characters.length;
    document.getElementById("confirm-answer").disabled = !complete || this.session.inputLocked;
  }

  selectLetter(id) {
    if (this.session.inputLocked || this.session.selectedCharacterIds.includes(id)) return;
    if (this.session.selectedCharacterIds.length >= this.currentQuestion().characters.length) return;
    this.session.selectedCharacterIds.push(id);
    this.renderLetters();
  }

  removeLetter(id) {
    if (this.session.inputLocked) return;
    this.session.selectedCharacterIds = this.session.selectedCharacterIds.filter((item) => item !== id);
    this.renderLetters();
  }

  async confirmAnswer() {
    if (!this.session || this.session.inputLocked) return;
    if (this.session.selectedCharacterIds.length !== this.currentQuestion().characters.length) return;
    this.session.inputLocked = true;
    this.renderLetters();
    const answer = answerFromIds(this.tokens, this.session.selectedCharacterIds);
    if (answer === this.currentQuestion().word) await this.handleCorrect();
    else await this.handleIncorrect();
  }

  async handleCorrect() {
    const question = this.currentQuestion();
    this.ui.text("battle-message", "せいかい！ こうげき！");
    const hero = document.getElementById("hero-image");
    const enemy = document.getElementById("enemy-image");
    hero.classList.add("is-hero-attacking");
    enemy.classList.add("is-enemy-damaged");
    await this.wait(450);
    hero.classList.remove("is-hero-attacking");
    enemy.classList.remove("is-enemy-damaged");
    recordLearning(this.session, question);
    const result = applyCorrect(this.session, this.settings.attackDamage);
    this.ui.setHP("enemy", this.session.enemyHP, this.session.mode.enemyHP);
    await this.wait(350);
    if (result.victory) this.finishBattle("victory");
    else this.showCurrentQuestion();
  }

  async handleIncorrect() {
    const result = applyIncorrect(this.session, this.settings.enemyDamage);
    this.session.selectedCharacterIds = [];
    if (result.damaged) {
      this.ui.text("battle-message", "おしい！ ヒントを みよう");
      const hero = document.getElementById("hero-image");
      const enemy = document.getElementById("enemy-image");
      enemy.classList.add("is-enemy-attacking");
      hero.classList.add("is-hero-damaged");
      await this.wait(400);
      enemy.classList.remove("is-enemy-attacking");
      hero.classList.remove("is-hero-damaged");
      this.ui.setHP("player", this.session.playerHP, this.session.mode.playerHP);
      if (result.defeated) {
        this.finishBattle("defeat");
        return;
      }
      this.showImageHint(false);
      this.session.inputLocked = false;
      this.renderLetters();
      return;
    }
    this.ui.text("battle-message", "こたえを みて もういちど！");
    this.showImageHint(true);
    await this.wait(this.settings.answerDisplayMs);
    document.getElementById("answer-reveal").hidden = true;
    this.session.inputLocked = false;
    this.renderLetters();
  }

  showImageHint(showAnswer) {
    const question = this.currentQuestion();
    const area = document.getElementById("hint-area");
    const image = document.getElementById("hint-image");
    const answer = document.getElementById("answer-reveal");
    area.hidden = false;
    image.src = question.image;
    image.alt = `${question.word}のヒント画像`;
    answer.textContent = question.word;
    answer.hidden = !showAnswer;
  }

  hideHint() {
    document.getElementById("hint-area").hidden = true;
    document.getElementById("answer-reveal").hidden = true;
  }

  finishBattle(outcome) {
    this.session.inputLocked = true;
    this.session.outcome = outcome;
    this.ui.text("result-title", outcome === "victory" ? "しょうり！" : "よく がんばったね");
    document.getElementById("result-icon").textContent = outcome === "victory" ? "🏆" : "🌱";
    const stats = document.getElementById("result-stats");
    stats.innerHTML = `
      <div class="stat-card">モード<strong>${this.session.mode.label}</strong></div>
      <div class="stat-card">すすんだ もんだい<strong>${this.session.currentQuestionIndex + 1}</strong></div>
      <div class="stat-card">せいかいした もんだい<strong>${this.session.solvedCount}</strong></div>
      <div class="stat-card">であった ことば<strong>${this.session.askedWords.length}</strong></div>`;
    document.getElementById("result-next").onclick = () => {
      if (outcome === "victory") this.showTodayWords();
      else this.startReviewFlow();
    };
    this.ui.show("result-scene");
  }

  startReviewFlow() {
    this.reviewWords = getReviewWords(this.session);
    this.reviewIndex = 0;
    if (this.reviewWords.length === 0) {
      this.ui.show("retry-scene");
      return;
    }
    this.renderReview();
    this.ui.show("review-scene");
  }

  renderReview() {
    const item = this.reviewWords[this.reviewIndex];
    this.ui.text("review-progress", `${this.reviewIndex + 1} / ${this.reviewWords.length}`);
    this.ui.text("review-word", item.word);
    const image = document.getElementById("review-image");
    image.src = item.image;
    image.alt = `${item.word}の画像`;
  }

  nextReview() {
    this.reviewIndex += 1;
    if (this.reviewIndex >= this.reviewWords.length) this.ui.show("retry-scene");
    else this.renderReview();
  }

  retry() {
    const modeId = this.session.modeId;
    this.session = null;
    this.startMode(modeId);
  }

  showTodayWords() {
    const list = document.getElementById("words-list");
    list.replaceChildren();
    for (const item of this.session.askedWords) {
      const card = document.createElement("article");
      card.className = "word-card";
      card.innerHTML = `<img src="${item.image}" alt="${item.word}の画像"><strong>${item.word}</strong>`;
      list.append(card);
    }
    this.ui.show("words-scene");
  }

  openQuitDialog() {
    if (!this.session || this.session.inputLocked || this.dialog.open) return;
    this.session.inputLocked = true;
    this.dialog.showModal();
    this.dialog.querySelector('[data-action="continue"]').focus();
  }

  closeQuitDialog() {
    if (!this.dialog.open) return;
    this.dialog.close();
    if (this.session) this.session.inputLocked = false;
    this.renderLetters();
  }

  quitToTitle() {
    if (this.dialog.open) this.dialog.close();
    this.session = null;
    this.tokens = [];
    this.reviewWords = [];
    this.ui.show("title-scene");
  }

  endSession() {
    this.session = null;
    this.tokens = [];
    this.reviewWords = [];
    this.ui.show("title-scene");
  }

  showError(message) {
    this.ui.text("error-message", message);
    this.ui.show("error-scene");
  }

  applyModeVisuals(modeId) {
    const visuals = VISUAL_ASSETS.modes[modeId];
    const battleScene = document.getElementById("battle-scene");
    battleScene.dataset.mode = modeId;
    battleScene.style.setProperty("--battle-background", `url('${visuals.background}')`);
    const enemy = document.getElementById("enemy-image");
    enemy.src = visuals.enemy;
    enemy.alt = visuals.enemyAlt;
  }

  setupVisualAssetFallbacks() {
    document.addEventListener("error", (event) => {
      const target = event.target;
      if (target instanceof HTMLImageElement && target.classList.contains("visual-asset")) {
        target.classList.add("is-visual-missing");
        console.warn("演出用画像を表示できませんでした。ゲームは継続します。", target.src);
      }
    }, true);
  }

  wait(ms) { return new Promise((resolve) => window.setTimeout(resolve, ms)); }
}

const game = new GameEngine();
game.initialize();
