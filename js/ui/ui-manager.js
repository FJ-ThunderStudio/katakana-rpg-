export class UIManager {
  constructor() {
    this.scenes = new Map([...document.querySelectorAll(".scene")].map((scene) => [scene.id, scene]));
  }

  show(sceneId) {
    for (const [id, scene] of this.scenes) {
      scene.hidden = id !== sceneId;
      scene.classList.toggle("is-active", id === sceneId);
    }
    document.querySelector(`#${sceneId} h1, #${sceneId} button`)?.focus({ preventScroll: true });
  }

  text(id, value) { document.getElementById(id).textContent = value; }

  setHP(prefix, current, max) {
    this.text(`${prefix}-hp-text`, `${current} / ${max}`);
    document.getElementById(`${prefix}-hp-bar`).style.width = `${Math.max(0, current / max * 100)}%`;
  }
}
