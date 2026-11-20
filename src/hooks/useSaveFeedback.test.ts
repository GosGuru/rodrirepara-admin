import { describe, expect, test } from 'bun:test';
import { createSaveController } from './useSaveFeedback';

describe('createSaveController (universal save state machine)', () => {
  test('transitions idle -> saving -> success ONLY after real promise resolves, then triggers onConfirmed', async () => {
    const states: string[] = [];
    let resolveOp!: (v: string) => void;
    const op = () => new Promise<string>((r) => { resolveOp = r; });

    const ctrl = createSaveController({
      onStateChange: (s) => states.push(s.status),
      successHoldMs: 25,
    });

    let confirmedValue = '';
    const runPromise = ctrl.run(op, (val) => { confirmedValue = val; });

    // Must be saving while promise is pending, never success prematurely
    expect(ctrl.getState().status).toBe('saving');
    expect(confirmedValue).toBe('');

    // Duplicate call while in-flight must be ignored (anti-double-submit)
    let secondCalled = false;
    const dup = await ctrl.run(async () => { secondCalled = true; return 'dup'; });
    expect(secondCalled).toBe(false);
    expect(dup).toBe(false);

    // Resolve real persistence
    resolveOp('client-99');
    await Promise.resolve();
    await Promise.resolve();
    expect(ctrl.getState().status).toBe('success');

    const ok = await runPromise;
    expect(ok).toBe(true);
    expect(confirmedValue).toBe('client-99');
    expect(states).toEqual(['saving', 'success']);
  });

  test('on failure, never enters success, preserves error, and allows immediate retry', async () => {
    const states: string[] = [];
    const ctrl = createSaveController({
      onStateChange: (s) => states.push(s.status),
      successHoldMs: 10,
    });

    const first = await ctrl.run(async () => {
      throw new Error('Fallo de red');
    });
    expect(first).toBe(false);
    expect(ctrl.getState().status).toBe('error');
    expect(ctrl.getState().error).toContain('No se guardó');
    expect(states).not.toContain('success');

    // Retry immediately works without being locked
    let retried = false;
    const second = await ctrl.run(async () => {
      retried = true;
      return 'ok';
    });
    expect(retried).toBe(true);
    expect(second).toBe(true);
    expect(ctrl.getState().status).toBe('success');
  });
});
