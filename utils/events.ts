import EventEmitter from 'eventemitter3';

export const eventEmitter = new EventEmitter();

export const EVENTS = {
  BATHROOM_ADDED: 'bathroom_added',
  REVIEW_ADDED: 'review_added',
};