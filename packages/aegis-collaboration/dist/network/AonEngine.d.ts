export interface PublicAddress {
    readonly ip: string;
    readonly port: number;
}
export interface AonTunnel {
    readonly tunnelId: string;
    readonly peerAddress: string;
    readonly sharedSecret: Buffer;
    readonly status: 'ACTIVE' | 'CLOSED';
}
export declare class AonEngine {
    private tunnels;
    private dh;
    constructor();
    /**
     * 1. Query STUN servers to resolve node's public WAN address
     */
    resolvePublicAddress(): Promise<PublicAddress>;
    /**
     * 2. Key Exchange Handshake
     * Derives a shared symmetric secret using Elliptic Curve Diffie-Hellman (ECDH)
     */
    deriveSharedSecret(peerPublicKeyHex: string): Buffer;
    getPublicKeyHex(): string;
    /**
     * 3. Establish Encrypted P2P Tunnel
     */
    establishTunnel(tunnelId: string, peerAddress: string, sharedSecret: Buffer): AonTunnel;
    /**
     * 4. Encrypt message payload using AES-256-GCM
     */
    encryptMessage(tunnelId: string, plaintext: string): {
        ciphertext: string;
        iv: string;
        tag: string;
    };
    /**
     * 5. Decrypt message payload using AES-256-GCM
     */
    decryptMessage(tunnelId: string, ciphertext: string, ivHex: string, tagHex: string): string;
    getTunnel(tunnelId: string): AonTunnel | undefined;
    listTunnels(): AonTunnel[];
    closeTunnel(tunnelId: string): void;
}
export default AonEngine;
