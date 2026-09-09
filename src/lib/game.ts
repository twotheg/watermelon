export interface FruitSpec {
  id: number;
  name: string;
  radius: number;
  color: string;
  gradient: [string, string];
  score: number;
}

export const FRUITS: FruitSpec[] = [
  { id: 0, name: "블루베리", radius: 0.35 * 1.3, color: "#4B3C8C", gradient: ["#6B5CC8", "#2E225A"], score: 2 },
  { id: 1, name: "딸기", radius: 0.46 * 1.3, color: "#E63950", gradient: ["#FF5E78", "#B8001C"], score: 4 },
  { id: 2, name: "포도", radius: 0.58 * 1.3, color: "#7B2D8E", gradient: ["#A855B2", "#4E145F"], score: 8 },
  { id: 3, name: "오렌지", radius: 0.74 * 1.3, color: "#F4A100", gradient: ["#FFBC38", "#D98300"], score: 16 },
  { id: 4, name: "레몬", radius: 0.9 * 1.3, color: "#F9D423", gradient: ["#FFF176", "#E1B600"], score: 32 },
  { id: 5, name: "배", radius: 1.1 * 1.3, color: "#D4E157", gradient: ["#E6EE9C", "#AFB42B"], score: 64 },
  { id: 6, name: "사과", radius: 1.32 * 1.3, color: "#D32F2F", gradient: ["#FF6659", "#9A0007"], score: 128 },
  { id: 7, name: "복숭아", radius: 1.56 * 1.3, color: "#FFAB91", gradient: ["#FFCCBC", "#FF7043"], score: 256 },
  { id: 8, name: "파인애플", radius: 1.85 * 1.3, color: "#FDD835", gradient: ["#FFF59D", "#F9A825"], score: 512 },
  { id: 9, name: "수박", radius: 2.2 * 1.3, color: "#2E7D32", gradient: ["#43A047", "#1B5E20"], score: 1024 },
];

export const BOARD_WIDTH = 12;
export const WALL_THICKNESS = 1;
export const DANGER_RATIO = 0.88; // danger line from bottom (world height * ratio)

export function getMaxSpawnTier(score: number, drops: number): number {
  if (drops < 4) return 1;
  if (score < 500) return 2;
  if (score < 1500) return 3;
  if (score < 3500) return 4;
  if (score < 6000) return 5;
  if (score < 10000) return 6;
  if (score < 15000) return 7;
  return 8; // never spawn the final watermelon directly
}

export function randomSpawnTier(maxTier: number): number {
  // Weighted random: smaller tiers are much more likely
  const weights = Array.from({ length: maxTier + 1 }, (_, i) => (maxTier - i + 1) ** 2.5);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return 0;
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
