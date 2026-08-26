/** OpenPose BODY_25 joint indices. */
export const J = {
  NOSE: 0,
  NECK: 1,
  R_SHOULDER: 2,
  R_ELBOW: 3,
  R_WRIST: 4,
  L_SHOULDER: 5,
  L_ELBOW: 6,
  L_WRIST: 7,
  MID_HIP: 8,
  R_HIP: 9,
  R_KNEE: 10,
  R_ANKLE: 11,
  L_HIP: 12,
  L_KNEE: 13,
  L_ANKLE: 14,
  R_EYE: 15,
  L_EYE: 16,
  R_EAR: 17,
  L_EAR: 18,
  L_BIG_TOE: 19,
  L_SMALL_TOE: 20,
  L_HEEL: 21,
  R_BIG_TOE: 22,
  R_SMALL_TOE: 23,
  R_HEEL: 24,
} as const;

export const JOINT_COUNT = 25;
export const KEYPOINT_STRIDE = 3;
export const KEYPOINT_LENGTH = JOINT_COUNT * KEYPOINT_STRIDE;

export const JOINT_NAMES: readonly string[] = [
  "Nose",
  "Neck",
  "RShoulder",
  "RElbow",
  "RWrist",
  "LShoulder",
  "LElbow",
  "LWrist",
  "MidHip",
  "RHip",
  "RKnee",
  "RAnkle",
  "LHip",
  "LKnee",
  "LAnkle",
  "REye",
  "LEye",
  "REar",
  "LEar",
  "LBigToe",
  "LSmallToe",
  "LHeel",
  "RBigToe",
  "RSmallToe",
  "RHeel",
];

/**
 * Official OpenPose BODY_25 render pairs
 * (POSE_BODY_25_PAIRS_RENDER_GPU in openpose/pose/poseParametersRender.hpp).
 */
export const BONES: readonly [number, number][] = [
  [J.NECK, J.MID_HIP],
  [J.NECK, J.R_SHOULDER],
  [J.NECK, J.L_SHOULDER],
  [J.R_SHOULDER, J.R_ELBOW],
  [J.R_ELBOW, J.R_WRIST],
  [J.L_SHOULDER, J.L_ELBOW],
  [J.L_ELBOW, J.L_WRIST],
  [J.MID_HIP, J.R_HIP],
  [J.R_HIP, J.R_KNEE],
  [J.R_KNEE, J.R_ANKLE],
  [J.MID_HIP, J.L_HIP],
  [J.L_HIP, J.L_KNEE],
  [J.L_KNEE, J.L_ANKLE],
  [J.NECK, J.NOSE],
  [J.NOSE, J.R_EYE],
  [J.R_EYE, J.R_EAR],
  [J.NOSE, J.L_EYE],
  [J.L_EYE, J.L_EAR],
  [J.L_ANKLE, J.L_BIG_TOE],
  [J.L_BIG_TOE, J.L_SMALL_TOE],
  [J.L_ANKLE, J.L_HEEL],
  [J.R_ANKLE, J.R_BIG_TOE],
  [J.R_BIG_TOE, J.R_SMALL_TOE],
  [J.R_ANKLE, J.R_HEEL],
];

/** RGB triples per BODY_25 joint (POSE_BODY_25_COLORS_RENDER_GPU). */
export const OPENPOSE_JOINT_COLORS: readonly [number, number, number][] = [
  [255, 0, 85],
  [255, 0, 0],
  [255, 85, 0],
  [255, 170, 0],
  [255, 255, 0],
  [170, 255, 0],
  [85, 255, 0],
  [0, 255, 0],
  [255, 0, 0],
  [0, 255, 85],
  [0, 255, 170],
  [0, 255, 255],
  [0, 170, 255],
  [0, 85, 255],
  [0, 0, 255],
  [255, 0, 170],
  [170, 0, 255],
  [255, 0, 255],
  [85, 0, 255],
  [0, 0, 255],
  [0, 0, 255],
  [0, 0, 255],
  [0, 255, 255],
  [0, 255, 255],
  [0, 255, 255],
];

export function openPoseJointCss(index: number): string {
  const rgb = OPENPOSE_JOINT_COLORS[index] ?? [232, 237, 247];
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

export const LIMB_JOINTS = {
  rightArm: [J.R_SHOULDER, J.R_ELBOW, J.R_WRIST] as const,
  leftArm: [J.L_SHOULDER, J.L_ELBOW, J.L_WRIST] as const,
  rightLeg: [J.R_HIP, J.R_KNEE, J.R_ANKLE] as const,
  leftLeg: [J.L_HIP, J.L_KNEE, J.L_ANKLE] as const,
};

/** MediaPipe Pose landmark indices (33). */
export const MP = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;
