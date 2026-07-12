import { IPCManager } from '../ipc/IPCManager.js';
export declare class ProtocolNegotiator {
    private ipcManager;
    private static EXPECTED_PROTOCOL_VERSION;
    constructor(ipcManager: IPCManager);
    negotiate(isLegacyMode: boolean): Promise<boolean>;
}
export default ProtocolNegotiator;
//# sourceMappingURL=ProtocolNegotiator.d.ts.map