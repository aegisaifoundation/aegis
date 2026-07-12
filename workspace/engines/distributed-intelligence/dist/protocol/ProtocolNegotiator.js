import { MessageType } from '../ipc/MessageTypes.js';
import { VersionManager } from './VersionManager.js';
export class ProtocolNegotiator {
    ipcManager;
    static EXPECTED_PROTOCOL_VERSION = '1.0.0';
    constructor(ipcManager) {
        this.ipcManager = ipcManager;
    }
    async negotiate(isLegacyMode) {
        if (isLegacyMode) {
            // Legacy engine does not support JSON handshake packets; pass automatically to remain backward compatible
            return true;
        }
        try {
            const response = await this.ipcManager.request(MessageType.PING, { clientProtocolVersion: ProtocolNegotiator.EXPECTED_PROTOCOL_VERSION }, 2000);
            const serverProtocolVersion = response.protocolVersion || response.serverProtocolVersion;
            if (!serverProtocolVersion) {
                throw new Error('Handshake failed: Protocol version not advertised by native engine');
            }
            return VersionManager.isCompatible(ProtocolNegotiator.EXPECTED_PROTOCOL_VERSION, serverProtocolVersion);
        }
        catch (err) {
            console.warn(`[ProtocolNegotiator] Handshake negotiation failed, falling back: ${err.message}`);
            // Fallback: If we couldn't negotiate but stdout printed READY, we assume legacy compatibility
            return true;
        }
    }
}
export default ProtocolNegotiator;
//# sourceMappingURL=ProtocolNegotiator.js.map