// three.js materials cannot read CSS variables, so scenes copy the shared tokens once.
const token = (name: string, fallback: string) => {
  try {
    return (
      getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim() || fallback
    );
  } catch {
    return fallback;
  }
};

export type SceneColors = ReturnType<typeof readSceneColors>;

export const readSceneColors = () => ({
  sky: token("--qadam-scene-sky", "#dfeceb"),
  paper: token("--qadam-paper", "#f5f3eb"),
  ground: token("--qadam-surface-muted", "#e9e9df"),
  bounce: token("--qadam-line-hover", "#b8c5b6"),
  plot: token("--qadam-white", "#fffefa"),
  selected: token("--qadam-lime", "#d7f36a"),
  green: token("--qadam-green", "#164c3e"),
  subtle: token("--qadam-surface-subtle", "#f0f0e6"),
  rule: token("--qadam-muted-light", "#7d8a7f"),
});
