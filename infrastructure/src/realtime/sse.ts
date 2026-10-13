import type { ChangeNotifier } from "@tripapp/application";
export type Change = { projectId: string; resource: string; action: string };
export class SseBroker implements ChangeNotifier {
  private subscribers = new Map<string, Set<(change: Change) => void>>();
  subscribe(projectId: string, listener: (change: Change) => void) {
    const listeners = this.subscribers.get(projectId) ?? new Set();
    listeners.add(listener);
    this.subscribers.set(projectId, listeners);
    return () => {
      listeners.delete(listener);
      if (!listeners.size) this.subscribers.delete(projectId);
    };
  }
  async notify(change: Change) {
    for (const listener of this.subscribers.get(change.projectId) ?? []) {
      try {
        listener(change);
      } catch {
        /* A disconnected subscriber must not turn a committed command into a failure. */
      }
    }
  }
}
