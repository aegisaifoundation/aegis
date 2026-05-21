import { EventEmitter } from 'events';
export class EventBus extends EventEmitter {
}
export const eventBus = new EventBus();
