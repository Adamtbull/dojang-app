import { useCallback, useEffect, useRef, useState } from "react";

export function usePlayback(frameCount: number, fps: number) {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [mirror, setMirror] = useState(false);
  const originRef = useRef(0);
  const frameRef = useRef(0);

  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  useEffect(() => {
    setFrame(0);
    setPlaying(false);
  }, [frameCount]);

  useEffect(() => {
    if (!playing || frameCount <= 1) return;
    originRef.current = performance.now() - (frameRef.current / Math.max(fps, 1)) * 1000;
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = (now - originRef.current) / 1000;
      let next = Math.floor(elapsed * Math.max(fps, 1));
      if (loop) {
        next = ((next % frameCount) + frameCount) % frameCount;
        setFrame(next);
        raf = requestAnimationFrame(tick);
      } else if (next >= frameCount - 1) {
        setFrame(frameCount - 1);
        setPlaying(false);
      } else {
        setFrame(next);
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, frameCount, fps, loop]);

  const togglePlay = useCallback(() => {
    if (frameCount <= 1) return;
    setPlaying((p) => {
      if (!p && frameRef.current >= frameCount - 1 && !loop) {
        setFrame(0);
      }
      return !p;
    });
  }, [frameCount, loop]);

  const seek = useCallback(
    (index: number) => {
      const next = Math.max(0, Math.min(frameCount - 1, Math.round(index)));
      setFrame(next);
      if (playing) {
        originRef.current = performance.now() - (next / Math.max(fps, 1)) * 1000;
      }
    },
    [frameCount, fps, playing],
  );

  return {
    frame,
    playing,
    loop,
    mirror,
    setLoop,
    setMirror,
    togglePlay,
    seek,
    setPlaying,
  };
}
