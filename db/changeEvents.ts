const listeners = new Set<() => void>();

export function notifyDatabaseChanged() {
  listeners.forEach((listener) => listener());
}

export function subscribeToDatabaseChanges(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
