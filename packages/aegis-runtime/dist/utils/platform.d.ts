export interface HardwareProfile {
    cpu: string;
    cores: number;
    ramGb: number;
    cudaEnabled: boolean;
}
export declare function detectHardware(): HardwareProfile;
export declare function detectOS(): string;
export declare function detectArch(): string;
