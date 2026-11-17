/**
 * 防抖函数 — 在 delay 毫秒内多次调用只执行最后一次
 */
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = ((...args: any[]) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  }) as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return debounced;
}
