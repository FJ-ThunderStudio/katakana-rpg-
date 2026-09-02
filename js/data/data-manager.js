export class DataManager {
  async loadJSON(path) {
    const response = await fetch(path, { cache: "no-cache" });
    if (!response.ok) throw new Error(`${path} を読み込めません。`);
    return response.json();
  }

  async loadAll() {
    const [settings, questions] = await Promise.all([
      this.loadJSON("data/settings.json"),
      this.loadJSON("data/questions.json")
    ]);
    return { settings, questions };
  }
}
