export interface RandomSource { next(): number }
export class CryptoRandomSource implements RandomSource {
  next(): number { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 0x100000000; }
}
export function sampleWithoutReplacement<T>(items: readonly T[], count:number, random:RandomSource): T[] {
  if (count > items.length) throw new Error('not-enough-items');
  const copy = [...items];
  for (let i=0;i<count;i++) {
    const r = random.next();
    if (!Number.isFinite(r) || r < 0 || r >= 1) throw new Error('invalid-random');
    const j = i + Math.floor(r * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0,count);
}
