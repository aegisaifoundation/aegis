export interface EventMetadata {
    name: string;
    description: string;
    category?: string;
    validationHook?: (payload: any) => boolean;
}
export declare class EventRegistry {
    private registeredEvents;
    register(metadata: EventMetadata): void;
    get(name: string): EventMetadata | undefined;
    has(name: string): boolean;
    list(): EventMetadata[];
    validate(name: string, payload: any): boolean;
}
export declare const eventRegistry: EventRegistry;
