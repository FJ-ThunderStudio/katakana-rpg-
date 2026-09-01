export async function filterLoadableImages(questions, loader = defaultImageLoader) {
  const results = await Promise.all(questions.map(async (question) => {
    try {
      await loader(question.image);
      return question;
    } catch (error) {
      console.warn("画像を読み込めない教材を除外しました。", question.id, error);
      return null;
    }
  }));
  return results.filter(Boolean);
}

function defaultImageLoader(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(src);
    image.onerror = () => reject(new Error("image load failed"));
    image.src = src;
  });
}
