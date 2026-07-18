export declare class BuilderCli {
    private analyzer;
    private compiler;
    private packageBuilder;
    private bundleBuilder;
    private manifestGenerator;
    private sbomGenerator;
    private signer;
    private verifier;
    private publisher;
    private workspaceRoot;
    constructor(workspaceRoot?: string);
    run(args: string[]): Promise<number>;
    private printHelp;
    buildCmd(args: string[]): Promise<number>;
    packageCmd(args: string[]): Promise<number>;
    bundleCmd(args: string[]): Promise<number>;
    signCmd(args: string[]): Promise<number>;
    verifyCmd(args: string[]): Promise<number>;
    releaseCmd(args: string[]): Promise<number>;
    publishCmd(args: string[]): Promise<number>;
    cleanCmd(): Promise<number>;
    doctorCmd(): Promise<number>;
    inspectCmd(args: string[]): Promise<number>;
}
