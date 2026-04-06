/**
 * Fungsi utilitas untuk mengeksekusi Promise dengan mekanisme Exponential Backoff.
 * Replikasi dari pustaka `tenacity`.
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 4,
  minWaitMs: number = 2000,
  maxWaitMs: number = 10000,
  multiplier: number = 2
): Promise<T> {
  let attempt = 1;
  let currentWait = minWaitMs;

  while (attempt <= maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(`Eksekusi gagal setelah ${maxAttempts} percobaan. Error: ${error}`);
      }
      
      console.warn(`Attempt ${attempt} gagal. Retrying in ${currentWait}ms...`);
      await new Promise((resolve) => setTimeout(resolve, currentWait));
      
      attempt++;
      currentWait = Math.min(currentWait * multiplier, maxWaitMs);
    }
  }
  
  throw new Error("Unreachable state in retry logic");
}