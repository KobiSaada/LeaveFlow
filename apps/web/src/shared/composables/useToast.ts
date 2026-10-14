import { reactive } from 'vue';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

const toasts = reactive<Toast[]>([]);
let nextId = 1;

/** App-wide notifications, rendered by <ToastHost> in an aria-live region. */
export function useToast() {
  function dismiss(id: number): void {
    const index = toasts.findIndex((t) => t.id === id);
    if (index !== -1) toasts.splice(index, 1);
  }

  function show(message: string, kind: ToastKind = 'success', timeoutMs = 5000): void {
    const id = nextId++;
    toasts.push({ id, message, kind });
    setTimeout(() => dismiss(id), timeoutMs);
  }

  return { toasts, show, dismiss };
}
