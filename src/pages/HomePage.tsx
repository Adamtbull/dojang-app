import { Link } from "react-router-dom";
import { AvatarStage } from "../components/AvatarStage";
import { sampleFrontKick } from "../pose/readyStance";
import { useLibrary } from "../hooks/useLibrary";
import { MovementCard } from "../components/MovementCard";
import { useMemo } from "react";

export function HomePage() {
  const { movements } = useLibrary();
  const demo = useMemo(() => sampleFrontKick(48), []);
  const recent = movements.slice(0, 4);

  return (
    <div className="space-y-8 pb-4">
      <section className="overflow-hidden rounded-2xl border border-navy-line/80 bg-navy-card">
        <AvatarStage idle className="h-[420px] w-full" />
        <div className="space-y-3 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-dojang-teal">
            Personal movement library
          </p>
          <h1 className="font-display text-5xl leading-none text-ink">
            Film a kick.
            <br />
            Keep the form.
          </h1>
          <p className="text-sm leading-relaxed text-muted">
            Upload a short clip. Dojang reads your pose on this device and plays it back as a
            cartoon taekwondo practitioner — no cloud, no account.
          </p>
          <Link
            to="/upload"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-dojang-red py-3.5 text-sm font-semibold text-white"
          >
            Upload a movement
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-3xl text-ink">Three steps</h2>
        <ol className="space-y-2">
          {[
            { n: "01", t: "Upload", d: "Drop a phone clip of a kick, stretch, or drill." },
            { n: "02", t: "Extract", d: "On-device pose estimation builds a BODY_25 skeleton." },
            { n: "03", t: "Name & save", d: "Replay the avatar, tag it, and keep it in your library." },
          ].map((step) => (
            <li
              key={step.n}
              className="flex gap-3 rounded-2xl border border-navy-line/70 bg-navy-card p-4"
            >
              <span className="font-display text-3xl text-dojang-red">{step.n}</span>
              <div>
                <p className="font-semibold">{step.t}</p>
                <p className="text-sm text-muted">{step.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-3xl text-ink">Sample kick</h2>
          <span className="text-[11px] uppercase tracking-wider text-muted">Renderer demo</span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-navy-line/80">
          <AvatarStage frames={demo} autoPlay fps={24} className="h-[360px] w-full" />
        </div>
        <p className="text-xs text-muted">
          This ap-chagi is synthesized so you can judge the character. Your uploads use real
          MediaPipe landmarks from the video.
        </p>
      </section>

      {recent.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-3xl text-ink">Recent</h2>
            <Link to="/library" className="text-sm text-dojang-teal">
              Library
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {recent.map((m) => (
              <MovementCard key={m.id} movement={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
