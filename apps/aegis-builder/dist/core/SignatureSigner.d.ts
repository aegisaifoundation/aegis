export declare class SignatureSigner {
    private keysDir;
    private privateKey;
    private publicKey;
    constructor(keysDir: string);
    getPublicKeyPem(): string;
    signText(text: string): string;
    private initializeKeys;
}
