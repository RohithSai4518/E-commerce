/**
 * System Event Bus & PubSub Dispatcher
 * 
 * Facilitates loosely-coupled communication between domain services:
 * - Order lifecycle changes (created, paid, shipped, cancelled)
 * - Low stock and inventory replenishment alerts
 * - Audit logs & analytical metric increments
 * - Email / customer notifications
 */

const { EventEmitter } = require('events');

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  /**
   * Safe asynchronous emit
   */
  async emitAsync(eventName, payload) {
    const listeners = this.rawListeners(eventName);
    if (!listeners || listeners.length === 0) return;

    for (const listener of listeners) {
      try {
        await Promise.resolve(listener(payload));
      } catch (err) {
        console.error(`[EventBus Exception in listener for "${eventName}"]:`, err);
      }
    }
  }
}

// Global Singleton Event Bus
const eventBus = new EventBus();

// Standard Domain Events Constants
const EVENTS = {
  ORDER_CREATED: 'order:created',
  ORDER_PAID: 'order:paid',
  ORDER_FULFILLED: 'order:fulfilled',
  ORDER_CANCELLED: 'order:cancelled',
  STOCK_LOW: 'inventory:low_stock',
  STOCK_DEPLETED: 'inventory:depleted',
  USER_REGISTERED: 'user:registered',
  REVIEW_SUBMITTED: 'review:submitted'
};

module.exports = {
  eventBus,
  EVENTS
};
