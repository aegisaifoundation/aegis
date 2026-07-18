import { DigitalSigner } from '../security/DigitalSigner.js';
export declare class ReleaseVerifier {
    private signer;
    constructor(signer: DigitalSigner);
    verifyRelease(releaseDir: string): Promise<{
        valid: boolean;
        errors: string[];
    }>;
}
