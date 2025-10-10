import { Redis } from 'ioredis';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

const EVENT_CHANNEL = 'adres:events';

let publisher = null;
let subscriber = null;

export const initializeEventBus = () => {
  publisher = new Redis(config.redis.url);
  subscriber = new Redis(config.redis.url);
  
  logger.info('Event bus initialized (Redis Pub/Sub)');
};

export const publishEvent = (event, data) => {
  if (!publisher) {
    logger.error('Event bus not initialized');
    return;
  }
  
  const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
  
  publisher.publish(EVENT_CHANNEL, payload).catch(err => {
    logger.error('Failed to publish event', { event, error: err.message });
  });
};

export const subscribeToEvents = (callback) => {
  if (!subscriber) {
    logger.error('Event bus not initialized');
    return;
  }
  
  subscriber.subscribe(EVENT_CHANNEL, (err) => {
    if (err) {
      logger.error('Failed to subscribe to events', { error: err.message });
      return;
    }
    logger.info('Subscribed to event bus');
  });
  
  subscriber.on('message', (channel, message) => {
    if (channel === EVENT_CHANNEL) {
      try {
        const { event, data } = JSON.parse(message);
        callback(event, data);
      } catch (err) {
        logger.error('Failed to parse event message', { error: err.message });
      }
    }
  });
};

export const closeEventBus = async () => {
  if (publisher) await publisher.quit();
  if (subscriber) await subscriber.quit();
  logger.info('Event bus closed');
};

