import { makeCharacterTokens } from "./rules.js";

export function pickQuestions(pool, count, maxDifficulty, random = Math.random) {
  const candidates = pool.filter((question) => question.difficulty <= maxDifficulty);
  if (candidates.length < count) throw new Error("有効な教材が足りません。");
  const shuffled = [...candidates];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled.slice(0, count);
}

export function shuffledTokens(question, random = Math.random) {
  const original = makeCharacterTokens(question);
  if (original.length < 2) return original;
  let tokens = [...original];
  for (let attempts = 0; attempts < 8; attempts += 1) {
    tokens = [...original];
    for (let index = tokens.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1));
      [tokens[index], tokens[target]] = [tokens[target], tokens[index]];
    }
    if (tokens.map((item) => item.character).join("") !== question.word) break;
  }
  if (tokens.map((item) => item.character).join("") === question.word) {
    [tokens[0], tokens[1]] = [tokens[1], tokens[0]];
  }
  return tokens;
}
