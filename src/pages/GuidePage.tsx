export function GuidePage() {
  const tips = [
    {
      t: "Plain background",
      d: "Stand in front of a wall or empty space. Busy rooms confuse the pose model.",
    },
    {
      t: "Full body in frame",
      d: "Keep head and feet visible the whole clip. Cropped kicks make the avatar collapse.",
    },
    {
      t: "Steady camera",
      d: "Lock the phone on a chair or stand. If the camera moves, the avatar drifts.",
    },
    {
      t: "Side or 45° view",
      d: "Front kicks and stretches read best from the side. Sparring combos work from a slight angle.",
    },
    {
      t: "Short clips",
      d: "Five seconds is plenty. Dojang samples 30 frames a second and caps reads at 20 seconds.",
    },
    {
      t: "Bright, even light",
      d: "Face a window or overhead light. Silhouettes against a bright window hide joints.",
    },
  ];

  return (
    <div className="space-y-4 pb-6">
      <header>
        <h1 className="font-display text-4xl text-ink">Guide</h1>
        <p className="text-sm text-muted">How to film a clip the avatar can learn.</p>
      </header>
      <ol className="space-y-3">
        {tips.map((tip, i) => (
          <li key={tip.t} className="rounded-2xl border border-navy-line/70 bg-navy-card p-4">
            <p className="font-display text-2xl text-dojang-red">{String(i + 1).padStart(2, "0")}</p>
            <h2 className="mt-1 font-semibold">{tip.t}</h2>
            <p className="text-sm text-muted">{tip.d}</p>
          </li>
        ))}
      </ol>
      <p className="rounded-2xl bg-navy-card p-4 text-xs leading-relaxed text-muted">
        Everything runs on this device. After the first load, the model and app cache in your
        browser so you can extract movements offline.
      </p>
    </div>
  );
}
