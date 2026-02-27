/**
 * Background images for Artboard grid.
 * Images: /public/bg/Potterylikepoetry-1.jpg ... Potterylikepoetry-24.jpg
 */
export const BG_IMAGES = Array.from({ length: 24 }, (_, i) => `/bg/Potterylikepoetry-${i + 1}.jpg`);

export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
