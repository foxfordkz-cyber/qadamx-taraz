/** JSON Schema string lengths count Unicode code points, without normalization. */
export function codePointLength(value: string): number {
  return Array.from(value).length;
}
