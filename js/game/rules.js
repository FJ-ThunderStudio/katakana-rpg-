export const MODE_ORDER = ["normal", "challenge", "demonKing"];

export function assertSettings(settings) {
  if (!settings || settings.attackDamage !== 10 || settings.enemyDamage !== 20 || settings.answerDisplayMs !== 3000) {
    throw new Error("バトル設定が正式仕様と一致しません。");
  }
  for (const id of MODE_ORDER) {
    const mode = settings.modes?.[id];
    if (!mode || mode.enemyHP !== mode.questionCount * settings.attackDamage) {
      throw new Error(`${id} のHP設定が一致しません。`);
    }
  }
  const expected = {
    normal: [10, 100, 100],
    challenge: [20, 160, 200],
    demonKing: [30, 220, 300]
  };
  for (const [id, values] of Object.entries(expected)) {
    const mode = settings.modes[id];
    if ([mode.questionCount, mode.playerHP, mode.enemyHP].some((value, index) => value !== values[index])) {
      throw new Error(`${id} のモード設定が正式仕様と一致しません。`);
    }
  }
  return true;
}

export function createSession(modeId, settings, questions) {
  const mode = settings.modes[modeId];
  return {
    modeId,
    mode,
    questions,
    playerHP: mode.playerHP,
    enemyHP: mode.enemyHP,
    currentQuestionIndex: 0,
    solvedCount: 0,
    mistakeCountForCurrentQuestion: 0,
    supportLevel: "none",
    askedWords: [],
    learningHistory: [],
    selectedCharacterIds: [],
    inputLocked: false,
    outcome: null
  };
}

export function registerAskedWord(session, question) {
  if (!session.askedWords.some((item) => item.id === question.id)) {
    session.askedWords.push({ id: question.id, word: question.word, image: question.image });
  }
}

export function applyIncorrect(session, enemyDamage = 20) {
  session.mistakeCountForCurrentQuestion += 1;
  if (session.mistakeCountForCurrentQuestion === 1) {
    session.playerHP = Math.max(0, session.playerHP - enemyDamage);
    session.supportLevel = "imageHint";
    if (session.playerHP === 0) session.outcome = "defeat";
    return { damaged: true, hint: "imageHint", defeated: session.outcome === "defeat" };
  }
  session.supportLevel = "answerShown";
  return { damaged: false, hint: "answerShown", defeated: false };
}

export function applyCorrect(session, attackDamage = 10) {
  session.enemyHP = Math.max(0, session.enemyHP - attackDamage);
  session.solvedCount += 1;
  const isFinal = session.currentQuestionIndex === session.questions.length - 1;
  if (isFinal) {
    if (session.enemyHP !== 0) throw new Error("最終問題で敵HPが0になりません。");
    session.outcome = "victory";
    return { victory: true };
  }
  session.currentQuestionIndex += 1;
  session.mistakeCountForCurrentQuestion = 0;
  session.supportLevel = "none";
  session.selectedCharacterIds = [];
  return { victory: false };
}

export function recordLearning(session, question) {
  session.learningHistory.push({
    id: question.id,
    word: question.word,
    image: question.image,
    mistakeCount: session.mistakeCountForCurrentQuestion,
    supportLevel: session.supportLevel
  });
}

export function getReviewWords(session) {
  const byId = new Map();
  for (const item of session.learningHistory) {
    if (item.mistakeCount > 0 || item.supportLevel !== "none") byId.set(item.id, item);
  }
  const current = session.questions[session.currentQuestionIndex];
  if (session.outcome === "defeat" && session.mistakeCountForCurrentQuestion > 0 && current) {
    byId.set(current.id, {
      id: current.id,
      word: current.word,
      image: current.image,
      mistakeCount: session.mistakeCountForCurrentQuestion,
      supportLevel: session.supportLevel
    });
  }
  return [...byId.values()];
}

export function makeCharacterTokens(question) {
  return question.characters.map((character, index) => ({
    id: `${question.id}-${index}`,
    character
  }));
}

export function answerFromIds(tokens, selectedIds) {
  const map = new Map(tokens.map((token) => [token.id, token.character]));
  return selectedIds.map((id) => map.get(id)).join("");
}
