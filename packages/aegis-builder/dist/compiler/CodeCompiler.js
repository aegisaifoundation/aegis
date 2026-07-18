import { execSync } from 'child_process';
import path from 'path';
import { existsSync } from 'fs';
export class CodeCompiler {
    workspaceRoot;
    constructor(workspaceRoot = process.cwd()) {
        this.workspaceRoot = workspaceRoot;
    }
    async compileTypeScript(pkg, profile) {
        console.log(`[CodeCompiler] Compiling TypeScript for "${pkg.name}" [Profile: ${profile}]`);
        try {
            // Execute npm workspace build command
            execSync(`npm run build --workspace=${pkg.name}`, {
                cwd: this.workspaceRoot,
                stdio: 'ignore'
            });
            return true;
        }
        catch (err) {
            console.error(`[CodeCompiler] Failed to compile TS for ${pkg.name}:`, err);
            return false;
        }
    }
    async compileNativeCpp(pkg, profile) {
        console.log(`[CodeCompiler] Scanning native C++ builds in "${pkg.id}" [Profile: ${profile}]`);
        // Check if package contains C++ sources (e.g. build-cpp.ps1 or cpp/ CMakeLists.txt)
        const buildScript = path.join(pkg.directory, 'build-cpp.ps1');
        const cmakeFile = path.join(pkg.directory, 'cpp/CMakeLists.txt');
        if (existsSync(buildScript)) {
            try {
                console.log(`[CodeCompiler] Executing C++ build script at: ${buildScript}`);
                execSync(`powershell -ExecutionPolicy Bypass -File .\\build-cpp.ps1`, {
                    cwd: pkg.directory,
                    stdio: 'ignore'
                });
                return true;
            }
            catch (err) {
                console.error(`[CodeCompiler] C++ build script execution failed:`, err);
                return false;
            }
        }
        else if (existsSync(cmakeFile)) {
            try {
                console.log(`[CodeCompiler] Found CMake configuration. Running g++ direct compiler...`);
                // Simple direct g++ fallback compilation
                const srcFile = path.join(pkg.directory, 'cpp/dataset_indexer.cpp');
                const distDir = path.join(pkg.directory, 'dist');
                const outFile = path.join(distDir, 'dataset-indexer.exe');
                execSync(`g++ -std=c++20 "${srcFile}" -o "${outFile}"`, {
                    stdio: 'ignore'
                });
                return true;
            }
            catch (err) {
                console.error(`[CodeCompiler] CMake g++ fallback compilation failed:`, err);
                return false;
            }
        }
        // No native files to build
        return true;
    }
}
