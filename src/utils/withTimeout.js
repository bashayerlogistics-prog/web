export function withTimeout(promise, ms = 10000, label = 'request') {
  const timeoutMs = Math.max(500, Number(ms) || 10000);
  let timer = 0;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = window.setTimeout(() => {
        const err = new Error(`${label} timed out`);
        err.code = 'timeout';
        reject(err);
      }, timeoutMs);
    }),
  ]).finally(() => {
    if (timer) window.clearTimeout(timer);
  });
}
