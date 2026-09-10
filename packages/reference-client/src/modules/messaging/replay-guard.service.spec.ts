import { asMessageCounter, asOpaqueId, type MessageSessionId } from '@anonym-messenger/types';

import { REPLAY_WINDOW } from './constants';
import { ReplayError, ReplayGuardService } from './replay-guard.service';

describe('ReplayGuardService (hardened)', () => {
  let svc: ReplayGuardService;
  const s: MessageSessionId = asOpaqueId('test-session', 'message-session');
  const START = 1_000_000;

  beforeEach(() => {
    svc = new ReplayGuardService();
    svc.init(s, START);
  });

  it('rejects counters below the start offset', () => {
    expect(() => svc.accept(s, asMessageCounter(START - 1))).toThrow(ReplayError);
    expect(() => svc.accept(s, asMessageCounter(0))).toThrow(ReplayError);
  });

  it('accepts fresh counters in order, starting at the offset', () => {
    svc.accept(s, asMessageCounter(START));
    svc.accept(s, asMessageCounter(START + 1));
    svc.accept(s, asMessageCounter(START + 2));
  });

  it('rejects an immediate replay', () => {
    svc.accept(s, asMessageCounter(START));
    expect(() => svc.accept(s, asMessageCounter(START))).toThrow(ReplayError);
  });

  it('rejects out-of-order delivery without consuming the expected counter', () => {
    expect(() => svc.accept(s, asMessageCounter(START + 10))).toThrow(ReplayError);
    svc.check(s, asMessageCounter(START));
    svc.check(s, asMessageCounter(START));
    svc.accept(s, asMessageCounter(START));
  });

  it('rejects a counter outside the window', () => {
    const high = START + 1000;
    expect(() => svc.accept(s, asMessageCounter(high))).toThrow(ReplayError);
    expect(() => svc.accept(s, asMessageCounter(high - REPLAY_WINDOW - 1))).toThrow(ReplayError);
  });

  it('rejects accept() on an uninitialized session', () => {
    const fresh = new ReplayGuardService();
    expect(() => fresh.accept(s, asMessageCounter(1))).toThrow(ReplayError);
  });

  it('forget wipes session state', () => {
    svc.accept(s, asMessageCounter(START));
    svc.forget(s);
    // After forget, accept() requires init() again.
    expect(() => svc.accept(s, asMessageCounter(START + 1))).toThrow(ReplayError);
  });

  it('isolates state between sessions', () => {
    const s2 = asOpaqueId('other-session', 'message-session');
    svc.init(s2, 500);
    svc.accept(s, asMessageCounter(START));
    svc.accept(s2, asMessageCounter(500));
    expect(() => svc.accept(s, asMessageCounter(START))).toThrow(ReplayError);
  });
});
