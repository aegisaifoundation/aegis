export class Container {
    bindings = new Map();
    factories = new Map();
    instances = new Map();
    bind(name, value) {
        this.bindings.set(name, value);
    }
    factory(name, creator) {
        this.factories.set(name, creator);
    }
    singleton(name, creator) {
        this.factories.set(name, (c) => {
            if (!this.instances.has(name)) {
                this.instances.set(name, creator(c));
            }
            return this.instances.get(name);
        });
    }
    resolve(name) {
        if (this.instances.has(name)) {
            return this.instances.get(name);
        }
        if (this.factories.has(name)) {
            return this.factories.get(name)(this);
        }
        if (this.bindings.has(name)) {
            return this.bindings.get(name);
        }
        throw new Error(`Dependency '${name}' could not be resolved.`);
    }
    has(name) {
        return this.instances.has(name) || this.factories.has(name) || this.bindings.has(name);
    }
}
