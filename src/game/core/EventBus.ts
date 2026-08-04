type EventCallback = (...args: any[]) => void;

export class EventBus {
  private static instance: EventBus;
  private listeners: Map<string, EventCallback[]> = new Map();

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) return;
    const list = this.listeners.get(event)!;
    this.listeners.set(
      event,
      list.filter((cb) => cb !== callback)
    );
  }

  public emit(event: string, ...args: any[]) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event)!.forEach((cb) => cb(...args));
  }
}
