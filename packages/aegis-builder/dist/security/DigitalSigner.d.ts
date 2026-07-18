export declare class DigitalSigner {
    private privateKey;
    private publicKey;
    constructor();
    signPackage(packagePath: string): Promise<string>;
    verifyPackage(packagePath: string): Promise<boolean>;
}
