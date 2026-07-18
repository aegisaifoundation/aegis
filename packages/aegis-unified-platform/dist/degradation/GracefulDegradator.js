import { serviceRegistry } from '@aegis/runtime';
export const ServiceUnavailable = new Proxy({
    isUnavailable: true
}, {
    get(target, prop) {
        if (prop === 'isUnavailable') {
            return true;
        }
        if (prop === 'toString' || prop === 'Symbol.toStringTag') {
            return () => 'ServiceUnavailable';
        }
        // Return a function that warns and returns a mock representation of degradation
        return (...args) => {
            console.warn(`[GracefulDegradator] Method "${String(prop)}" called on absent service. Graceful degradation active.`);
            return null;
        };
    }
});
export class GracefulDegradator {
    static getService(serviceName) {
        try {
            if (serviceRegistry.has(serviceName)) {
                return serviceRegistry.get(serviceName);
            }
        }
        catch { }
        console.log(`[GracefulDegradator] Service "${serviceName}" is unavailable. Returning ServiceUnavailable fallback.`);
        return ServiceUnavailable;
    }
}
