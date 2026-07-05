export declare class ServiceRegistry {
    private static instance;
    private services;
    static getInstance(): ServiceRegistry;
    register(name: string, service: any): void;
    get<T>(name: string): T;
    has(name: string): boolean;
}
export declare const serviceRegistry: ServiceRegistry;
