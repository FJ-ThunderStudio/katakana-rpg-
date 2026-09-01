export function validateQuestions(questions) {
  if (!Array.isArray(questions)) throw new Error("教材データの形式が正しくありません。");
  const ids = new Set();
  return questions.filter((question) => {
    if (!question || typeof question.id !== "string" || ids.has(question.id)) return false;
    ids.add(question.id);
    return typeof question.word === "string" && question.word.length > 0 &&
      Array.isArray(question.characters) && question.characters.join("") === question.word &&
      typeof question.image === "string" && question.image.length > 0 &&
      Number.isInteger(question.difficulty);
  });
}
