/**
 * Packing 32-bit words into a short string, and back out again.
 * @module codec
 * @internal
 */

/** URL safe base64: nothing here needs escaping in a query string or a path. */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/**
 * Encodes words as four base64 characters per three bytes. The word count is
 * always a multiple of three bytes' worth, so there is no padding to trim.
 * @internal
 */
export function encodeWords(words: number[]): string {
  const bytes = new Uint8Array(words.length * 4);
  for (let i = 0; i < words.length; i++) {
    const w = words[i] >>> 0;
    bytes[i * 4] = (w >>> 24) & 0xff;
    bytes[i * 4 + 1] = (w >>> 16) & 0xff;
    bytes[i * 4 + 2] = (w >>> 8) & 0xff;
    bytes[i * 4 + 3] = w & 0xff;
  }

  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const group = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out +=
      ALPHABET[(group >>> 18) & 63] +
      ALPHABET[(group >>> 12) & 63] +
      ALPHABET[(group >>> 6) & 63] +
      ALPHABET[group & 63];
  }
  return out;
}

/**
 * Decodes exactly `count` words back out, throwing on anything that is not a
 * string of the right length in the right alphabet.
 * @internal
 */
export function decodeWords(encoded: string, count: number): number[] {
  if (typeof encoded !== "string" || encoded.length !== Math.ceil((count * 4) / 3) * 4) {
    throw new Error("Not a serialised generator: wrong length");
  }

  const bytes = new Uint8Array(count * 4);
  let byte = 0;
  for (let i = 0; i < encoded.length; i += 4) {
    let group = 0;
    for (let j = 0; j < 4; j++) {
      const digit = ALPHABET.indexOf(encoded[i + j]);
      if (digit < 0) throw new Error("Not a serialised generator: unexpected character");
      group = (group << 6) | digit;
    }
    bytes[byte++] = (group >>> 16) & 0xff;
    bytes[byte++] = (group >>> 8) & 0xff;
    bytes[byte++] = group & 0xff;
  }

  const words: number[] = [];
  for (let i = 0; i < count; i++) {
    words.push(
      ((bytes[i * 4] << 24) |
        (bytes[i * 4 + 1] << 16) |
        (bytes[i * 4 + 2] << 8) |
        bytes[i * 4 + 3]) >>>
        0,
    );
  }
  return words;
}
