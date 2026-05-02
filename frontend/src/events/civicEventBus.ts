import type { CivicBadge, OracleResponse } from '../types';

export type CivicBusEvent =
  | { type: 'ORACLE_RESPONSE'; payload: OracleResponse }
  | { type: 'STEP_COMPLETED'; payload: { stepId: string; duration: number } }
  | { type: 'CONFUSION_DETECTED'; payload: { stepId: string; level: number } }
  | { type: 'SCORE_EARNED'; payload: { points: number; reason: string } }
  | { type: 'BADGE_UNLOCKED'; payload: { badge: CivicBadge } };

type CivicBusEventType = CivicBusEvent['type'];
type PayloadFor<T extends CivicBusEventType> = Extract<CivicBusEvent, { type: T }>['payload'];

class CivicEventBus extends EventTarget {
  emit(event: CivicBusEvent) {
    this.dispatchEvent(new CustomEvent(event.type, { detail: event.payload }));
  }

  on<T extends CivicBusEventType>(type: T, handler: (payload: PayloadFor<T>) => void) {
    const listener = (event: Event) => {
      handler((event as CustomEvent<PayloadFor<T>>).detail);
    };
    this.addEventListener(type, listener);
    return () => this.removeEventListener(type, listener);
  }
}

export const civicBus = new CivicEventBus();
