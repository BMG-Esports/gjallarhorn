/**
 * Compute the average of an array.
 */
export function average(...args: number[]) {
  return args.length ? args.reduce((a, b) => a + b, 0) / args.length : 0;
}
