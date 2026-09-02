import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { validateQuestions } from "../js/data/data-validator.js";
import { makeCharacterTokens } from "../js/game/rules.js";

const questions = JSON.parse(fs.readFileSync("data/questions.json", "utf8"));
const settings = JSON.parse(fs.readFileSync("data/settings.json", "utf8"));
const hintManifest = JSON.parse(fs.readFileSync("hint-images-manifest.json", "utf8"));
const engine = fs.readFileSync("js/core/game-engine.js", "utf8");
const css = ["css/layout.css", "css/components.css", "css/responsive.css"]
  .map((file) => fs.readFileSync(file, "utf8")).join("\n");

const find = (id) => questions.find((question) => question.id === id);
const expectedNewIds = [
  "cake", "cup", "soup", "shirt", "bed", "ball", "cabbage", "cookie",
  "juice", "soccer", "kitchen", "ticket", "cap", "chalk", "shampoo", "truck",
  "shutter", "jet", "camp", "character", "champion", "music", "skateboard", "icecream"
];

test("Q01: 全60語を問題データとして読み込める", () => assert.equal(validateQuestions(questions).length, 60));
test("Q02: Lv1は20語", () => assert.equal(questions.filter((q) => q.difficulty === 1).length, 20));
test("Q03: Lv2は20語", () => assert.equal(questions.filter((q) => q.difficulty === 2).length, 20));
test("Q04: Lv3は20語", () => assert.equal(questions.filter((q) => q.difficulty === 3).length, 20));
test("Q05: 合計60語", () => assert.equal(questions.length, 60));
test("Q06: Normalは10問", () => assert.equal(settings.modes.normal.questionCount, 10));
test("Q07: Challengeは20問", () => assert.equal(settings.modes.challenge.questionCount, 20));
test("Q08: Demon Kingは30問", () => assert.equal(settings.modes.demonKing.questionCount, 30));

test("Q09: 拗音の小さい文字は独立要素", () => {
  assert.deepEqual(find("shirt").characters, ["シ", "ャ", "ツ"]);
  assert.deepEqual(find("juice").characters, ["ジ", "ュ", "ー", "ス"]);
  assert.deepEqual(find("chalk").characters, ["チ", "ョ", "ー", "ク"]);
});
test("Q10: 促音ッは独立要素", () => {
  for (const id of ["kitchen", "jet", "shutter"]) assert.ok(find(id).characters.includes("ッ"));
});
test("Q11: 長音ーは独立要素", () => {
  for (const id of ["cake", "juice", "music"]) assert.ok(find(id).characters.includes("ー"));
});
test("Q12: ジェットのェは独立要素", () => assert.deepEqual(find("jet").characters, ["ジ", "ェ", "ッ", "ト"]));
test("Q13: 同じ文字を含む問題も内部IDが重複しない", () => {
  for (const id of ["banana", "tomato", "ambulance", "champion"]) {
    const tokens = makeCharacterTokens(find(id));
    assert.equal(new Set(tokens.map((token) => token.id)).size, tokens.length, id);
  }
});

test("Q14: 初回出題ではヒントを隠す", () => {
  assert.match(engine, /showCurrentQuestion\(\)[\s\S]*hideHint\(\)/);
  assert.match(engine, /hideHint\(\)[\s\S]*hint-area[\s\S]*hidden = true/);
});
test("Q15: 1回目不正解後は画像ヒントのみ", () => {
  assert.match(engine, /if \(result\.damaged\)[\s\S]*showImageHint\(false\)/);
});
test("Q16: 2回目以降は画像と正解を3秒表示", () => {
  assert.match(engine, /showImageHint\(true\)[\s\S]*wait\(this\.settings\.answerDisplayMs\)/);
  assert.equal(settings.answerDisplayMs, 3000);
});
test("Q17: 60語すべての画像パスが有効", () => {
  const manifestByFile = new Map(hintManifest.files.map((entry) => [entry.file, entry]));
  assert.equal(hintManifest.count, 60);
  for (const question of questions) {
    const expectedFile = `${question.id === "strawberry" ? "strawberry-jam" : question.id}.png`;
    const configuredFile = question.image.split("/").pop();
    assert.equal(configuredFile, expectedFile, question.word);
    assert.ok(fs.existsSync(question.image), question.image);
    const entry = manifestByFile.get(configuredFile);
    assert.ok(entry, configuredFile);
    const hash = crypto.createHash("sha256").update(fs.readFileSync(question.image)).digest("hex");
    assert.equal(hash, entry.sha256, configuredFile);
  }
});
test("Q18: 旧SVGヒント画像が混在していない", () => {
  assert.ok(questions.every((question) => question.image.endsWith(".png")));
  assert.equal(fs.readdirSync("assets/images/words").filter((name) => name.endsWith(".svg")).length, 0);
});
test("Q19: Chromebook向けヒント画像表示を維持", () => {
  assert.match(css, /hint-area img[\s\S]*object-fit: contain/);
  assert.match(css, /max-height: 700px/);
});
test("Q20: 60語化しても固定ゲームルールは不変", () => {
  assert.deepEqual(
    Object.values(settings.modes).map((mode) => [mode.questionCount, mode.playerHP, mode.enemyHP]),
    [[10,100,100],[20,160,200],[30,220,300]]
  );
  assert.equal(settings.attackDamage, 10);
  assert.equal(settings.enemyDamage, 20);
  assert.deepEqual(expectedNewIds.map((id) => find(id)?.id), expectedNewIds);
});
