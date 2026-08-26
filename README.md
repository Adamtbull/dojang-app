# Dojang (도장)

Personal martial-arts movement library. Upload a short clip, extract a pose skeleton in the browser, and replay it as a cartoon taekwondo avatar. Everything stays on-device.

Pose data is OpenPose **BODY_25** (`x,y,c` × 25). Phone clips are read with MediaPipe and converted. You can also import an OpenPose `--write_json` zip; the OpenPose C++ source tree itself cannot run in the browser.

```bash
npm install
npm run dev
npm test
npm run build
```

Open `http://localhost:5173`.
