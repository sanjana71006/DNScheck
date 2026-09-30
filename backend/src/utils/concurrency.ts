import pLimit from 'p-limit';
import { ENV } from '../config/env.js';

export const dnsConcurrencyLimit = pLimit(ENV.DNS_MAX_CONCURRENCY);

export async function runWithTimeout<T>(
  promiseFn: () => Promise<T>,
  timeoutMs: number,
  timeoutErrorMsg = 'DNS query timed out'
): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(timeoutErrorMsg);
      (err as any).code = 'TIMEOUT';
      reject(err);
    }, timeoutMs);
  });

  try {
    return await Promise.race([promiseFn(), timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}
