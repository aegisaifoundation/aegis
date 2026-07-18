import { DiscoveredPackage } from '../analyzer/SourceAnalyzer.js';
import { BuildProfile } from '../types/index.js';
export declare class CodeCompiler {
    private workspaceRoot;
    constructor(workspaceRoot?: string);
    compileTypeScript(pkg: DiscoveredPackage, profile: BuildProfile): Promise<boolean>;
    compileNativeCpp(pkg: DiscoveredPackage, profile: BuildProfile): Promise<boolean>;
}
