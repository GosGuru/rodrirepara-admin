import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

export type SaveFeedbackState = {
  status: SaveStatus;
  error: string;
};

const DEFAULT_ERROR = 'No se guardó. Revisá los datos o el espacio disponible y volvé a intentar.';

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function createSaveController(options?: {
  onStateChange?: (state: SaveFeedbackState) => void;
  successHoldMs?: number;
  defaultError?: string;
}) {
  let state: SaveFeedbackState = { status: 'idle', error: '' };
  let inFlight = false;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const fallbackError = options?.defaultError ?? DEFAULT_ERROR;

  const emit = (next: SaveFeedbackState) => {
    state = next;
    if (!disposed) {
      options?.onStateChange?.(next);
    }
  };

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const reset = () => {
    clearTimer();
    inFlight = false;
    emit({ status: 'idle', error: '' });
  };

  const setValidationError = (message: string) => {
    clearTimer();
    inFlight = false;
    emit({ status: 'error', error: message });
  };

  const mount = () => {
    disposed = false;
  };

  const dispose = () => {
    disposed = true;
    clearTimer();
  };

  const run = async <T,>(
    operation: () => Promise<T>,
    onConfirmed?: (result: T) => void,
    runOptions?: { successHoldMs?: number },
  ): Promise<boolean> => {
    if (inFlight || state.status === 'success') return false;
    clearTimer();
    inFlight = true;
    emit({ status: 'saving', error: '' });

    let result: T;
    try {
      result = await operation();
    } catch {
      inFlight = false;
      emit({ status: 'error', error: fallbackError });
      return false;
    }

    if (disposed) return true;
    emit({ status: 'success', error: '' });

    const configuredHold = runOptions?.successHoldMs ?? options?.successHoldMs ?? 800;
    const holdMs = prefersReducedMotion() ? Math.min(configuredHold, 550) : configuredHold;

    await new Promise<void>((resolve) => {
      if (holdMs <= 0) {
        resolve();
        return;
      }
      timer = setTimeout(() => {
        timer = null;
        resolve();
      }, holdMs);
    });

    if (disposed) return true;
    inFlight = false;
    onConfirmed?.(result);
    return true;
  };

  return {
    getState: () => state,
    isBusy: () => inFlight || state.status === 'saving' || state.status === 'success',
    run,
    reset,
    setValidationError,
    mount,
    dispose,
  };
}

export function useSaveFeedback(options?: {
  successHoldMs?: number;
  defaultError?: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [state, setState] = useState<SaveFeedbackState>({ status: 'idle', error: '' });
  const onBusyRef = useRef(options?.onBusyChange);
  onBusyRef.current = options?.onBusyChange;

  const controllerRef = useRef<ReturnType<typeof createSaveController> | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = createSaveController({
      successHoldMs: options?.successHoldMs,
      defaultError: options?.defaultError,
      onStateChange: (next) => {
        setState(next);
        onBusyRef.current?.(next.status === 'saving' || next.status === 'success');
      },
    });
  }

  useEffect(() => {
    controllerRef.current?.mount();
    return () => {
      controllerRef.current?.dispose();
    };
  }, []);

  const run = useCallback(
    <T,>(
      operation: () => Promise<T>,
      onConfirmed?: (result: T) => void,
      runOptions?: { successHoldMs?: number },
    ) => controllerRef.current!.run(operation, onConfirmed, runOptions),
    [],
  );

  const reset = useCallback(() => {
    controllerRef.current?.reset();
  }, []);

  const setValidationError = useCallback((message: string) => {
    controllerRef.current?.setValidationError(message);
  }, []);

  return {
    status: state.status,
    error: state.error,
    busy: state.status === 'saving' || state.status === 'success',
    run,
    reset,
    setValidationError,
  };
}
