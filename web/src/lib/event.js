import sh from "../sh.js";

/**
 * @typedef {{
 *   once?: boolean;
 *   async?: boolean;
 * }} EventOptions
 *
 * @typedef {((data: any) => void | Promise<void>)} EventHandler
 *
 * @callback EventSubscription
 * @returns {void}
 */

/**
 * Rust-inspired Event system with `on()`, `once()`, `emit()`, `off()`
 *
 * Usage: `sh.event.on('foo', (data) => {}); sh.event.emit('foo', {bar: 1})`
 */
export class WssEvent {
  /**
   * @type {Map<string, Set<EventHandler>>}
   * @private
   */
  _listeners = new Map();

  /**
   * Subscribe to event
   * @param {string} event
   * @param {EventHandler} handler
   * @param {EventOptions} [options]
   * @returns {EventSubscription}
   */
  on(event, handler, options = {}) {
    if (typeof handler !== "function") {
      throw new TypeError(`Handler must be function, got ${typeof handler}`);
    }

    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }

    /** @type Set<EventHandler> */
    const listeners = this._listeners.get(event);

    const wrapper = options.once
      ? (...args) => {
          handler(...args);
          this.off(event, wrapper);
        }
      : handler;

    listeners.add(wrapper);
    return () => this.off(event, wrapper);
  }

  /**
   * Subscribe once (alias for `on(event, handler, {once: true})`)
   * @param {string} event
   * @param {EventHandler} handler
   * @returns {EventSubscription}
   */
  once(event, handler) {
    return this.on(event, handler, { once: true });
  }

  /**
   * Emit event (sync or async)
   * @param {string} event
   * @param {any} [data]
   * @returns {Promise<void[]>|void}
   */
  emit(event, data) {
    const listeners = this._listeners.get(event);
    if (!listeners?.size) return;

    /** @type Promise<void>[] */
    const promises = [];

    for (const handler of listeners) {
      try {
        const result = handler(data);
        if (result instanceof Promise) {
          promises.push(result);
        }
      } catch (error) {
        console.error(`Event handler failed [${event}]:`, error);
      }
    }

    return promises.length ? Promise.allSettled(promises) : undefined;
  }

  /**
   * Remove specific handler
   * @param {string} event
   * @param {EventHandler} handler
   */
  off(event, handler) {
    const listeners = this._listeners.get(event);
    if (!listeners) return;

    listeners.delete(handler);
    if (listeners.size === 0) {
      this._listeners.delete(event);
    }
  }

  /**
   * Remove all listeners for event (or all events)
   * @param {string} [event]
   */
  off_all(event) {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
  }

  /**
   * Get listener count
   * @param {string} [event]
   * @returns {number}
   */
  listener_count(event) {
    return event
      ? (this._listeners.get(event)?.size ?? 0)
      : this._listeners.size;
  }
}

// Global attach
/** @type {WssEvent} */
sh.event = new WssEvent();
