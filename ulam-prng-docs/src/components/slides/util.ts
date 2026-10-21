import { logChoose } from '@/lib/stats'

const superscriptDigits = '⁰¹²³⁴⁵⁶⁷⁸⁹'

/** 12 as ¹², for powers. */
export const superscript = (n: number) =>
  String(n)
    .split('')
    .map((d) => superscriptDigits[Number(d)] ?? d)
    .join('')

export function binomialPmf(k: number, n: number, p: number): number {
  return Math.exp(logChoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p))
}
