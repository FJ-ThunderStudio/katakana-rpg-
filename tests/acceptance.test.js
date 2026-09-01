import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  answerFromIds, applyCorrect, applyIncorrect, assertSettings, createSession,
  getReviewWords, makeCharacterTokens, recordLearning, registerAskedWord
} from "../js/game/rules.js";
import { pickQuestions } from "../js/game/question-manager.js";
import { validateQuestions } from "../js/data/data-validator.js";
import { filterLoadableImages } from "../js/data/image-preloader.js";

const settings = JSON.parse(fs.readFileSync("data/settings.json", "utf8"));
const questions = JSON.parse(fs.readFileSync("data/questions.json", "utf8"));
const html = fs.readFileSync("index.html", "utf8");
const engine = fs.readFileSync("js/core/game-engine.js", "utf8");
const css = ["css/base.css", "css/layout.css", "css/components.css", "css/responsive.css"].map((file) => fs.readFileSync(file, "utf8")).join("\n");

test("A01: 3モードは10/20/30問を重複なく抽選できる", () => {
  const valid = validateQuestions(questions);
  for (const [id, mode] of Object.entries(settings.modes)) {
    const picked = pickQuestions(valid, mode.questionCount, mode.maxDifficulty, () => .42);
    assert.equal(picked.length, mode.questionCount, id);
    assert.equal(new Set(picked.map((item) => item.id)).size, mode.questionCount);
  }
});

test("A02: HPとダメージ固定値", () => assert.equal(assertSettings(settings), true));

test("A03: 最終問題正解が勝利主条件で敵HPは同時に0", () => {
  const modeQuestions = questions.slice(0, 10);
  const session = createSession("normal", settings, modeQuestions);
  for (let index = 0; index < 9; index += 1) assert.equal(applyCorrect(session, 10).victory, false);
  assert.equal(session.enemyHP, 10);
  assert.equal(applyCorrect(session, 10).victory, true);
  assert.equal(session.enemyHP, 0);
});

test("A04: 同一問題の初回誤答だけ20ダメージ", () => {
  const session = createSession("normal", settings, questions.slice(0, 10));
  assert.equal(applyIncorrect(session, 20).damaged, true);
  assert.equal(session.playerHP, 80);
  assert.equal(session.supportLevel, "imageHint");
});

test("A05: 2回目以降はHP不変でanswerShown", () => {
  const session = createSession("normal", settings, questions.slice(0, 10));
  applyIncorrect(session, 20);
  applyIncorrect(session, 20);
  applyIncorrect(session, 20);
  assert.equal(session.playerHP, 80);
  assert.equal(session.supportLevel, "answerShown");
  assert.equal(settings.answerDisplayMs, 3000);
});

test("A06: 同一文字は内部IDで区別される", () => {
  const question = questions.find((item) => item.word === "バナナ");
  const tokens = makeCharacterTokens(question);
  assert.equal(new Set(tokens.map((item) => item.id)).size, tokens.length);
  assert.equal(answerFromIds(tokens, tokens.map((item) => item.id)), question.word);
  assert.match(html, /id="confirm-answer"[^>]+disabled/);
  assert.match(engine, /inputLocked/);
});

test("A07: 画像欠損は除外され代替後不足を判定できる", async () => {
  const sample = questions.slice(0, 3);
  const filtered = await filterLoadableImages(sample, (src) => src.includes("banana") ? Promise.reject(new Error()) : Promise.resolve());
  assert.equal(filtered.length, 2);
  assert.ok(fs.existsSync(questions[0].image));
});

test("A08: HP0で敗北し復習対象を抽出する", () => {
  const session = createSession("normal", settings, questions.slice(0, 10));
  session.playerHP = 20;
  registerAskedWord(session, questions[0]);
  const result = applyIncorrect(session, 20);
  assert.equal(result.defeated, true);
  assert.equal(session.playerHP, 0);
  assert.equal(getReviewWords(session).length, 1);
  assert.match(html, /id="review-scene"/);
  assert.match(html, /id="retry-scene"/);
});

test("A09: 新規セッションは全状態を初期化する", () => {
  const first = createSession("normal", settings, questions.slice(0, 10));
  first.playerHP = 20; first.askedWords.push(questions[0]); first.solvedCount = 4;
  const retried = createSession("normal", settings, questions.slice(1, 11));
  assert.equal(retried.playerHP, 100);
  assert.equal(retried.solvedCount, 0);
  assert.deepEqual(retried.askedWords, []);
  assert.notEqual(first.questions[0].id, retried.questions[0].id);
});

test("A10: 今日のことばは正否によらず実出題を出題順で保持", () => {
  const session = createSession("normal", settings, questions.slice(0, 10));
  registerAskedWord(session, questions[0]);
  registerAskedWord(session, questions[1]);
  registerAskedWord(session, questions[0]);
  assert.deepEqual(session.askedWords.map((item) => item.id), [questions[0].id, questions[1].id]);
});

test("A11: やめるモーダルは背面停止と継続を実装", () => {
  assert.match(html, /id="quit-dialog"/);
  assert.match(engine, /session\.inputLocked = true/);
  assert.match(engine, /closeQuitDialog/);
  assert.match(engine, /event\.target === this\.dialog/);
});

test("A12: タイトルへ戻るとセッションを破棄", () => {
  assert.match(engine, /quitToTitle\(\)[\s\S]*this\.session = null/);
});

test("A13: enemyHP不整合で設定エラー", () => {
  const broken = structuredClone(settings);
  broken.modes.normal.enemyHP = 90;
  assert.throws(() => assertSettings(broken));
});

test("A14: 静的配信・相対パス・外部APIなし", () => {
  assert.doesNotMatch(html, /(?:src|href)=["']https?:\/\//);
  assert.match(engine, /data\/settings\.json|initialize/);
  assert.doesNotMatch(engine, /XMLHttpRequest|WebSocket|localStorage|document\.cookie/);
});

test("A15: Chromebook向けレスポンシブと非hover依存", () => {
  assert.match(css, /100dvh/);
  assert.match(css, /max-height: 700px/);
  assert.match(css, /focus-visible/);
  assert.doesNotMatch(css, /:hover/);
});

test("A16: 安全性・HP負数防止・勝敗後ロック", () => {
  const session = createSession("normal", settings, questions.slice(0, 10));
  session.playerHP = 1;
  applyIncorrect(session, 20);
  assert.equal(session.playerHP, 0);
  assert.match(engine, /finishBattle[\s\S]*inputLocked = true/);
});
