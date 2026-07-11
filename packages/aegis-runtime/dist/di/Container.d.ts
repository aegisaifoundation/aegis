export declare class Container {
    private bindings;
    private factories;
    private instances;
    bind<T>(name: string, value: T): void;
    factory<T>(name: string, creator: (container: Container) => T): void;
    singleton<T>(name: string, creator: (container: Container) => T): void;
    resolve<T>(name: string): T;
    has(name: string): boolean;
}
