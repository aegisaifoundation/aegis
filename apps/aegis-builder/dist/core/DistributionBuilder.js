import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import crypto from 'crypto';
export class DistributionBuilder {
    signer;
    constructor(signer) {
        this.signer = signer;
    }
    async buildPackage(options) {
        const { packageId, sourceDir, outputDir, profile, channel } = options;
        console.log(`[DistributionBuilder] Starting release compilation for "${packageId}" [Profile: ${profile}]...`);
        if (!fs.existsSync(sourceDir)) {
            throw new Error(`Source directory not found: ${sourceDir}`);
        }
        const manifestPath = path.join(sourceDir, 'manifest.json');
        if (!fs.existsSync(manifestPath)) {
            throw new Error(`Package manifest not found at ${manifestPath}`);
        }
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        // 1. Compile TypeScript if tsconfig.json is present
        const tsconfigPath = path.join(sourceDir, 'tsconfig.json');
        if (fs.existsSync(tsconfigPath)) {
            console.log(`[DistributionBuilder] Compiling TypeScript sources for "${packageId}"...`);
            const buildResult = spawnSync('npx', ['tsc', '-p', sourceDir], { shell: true });
            if (buildResult.status !== 0) {
                throw new Error(`TypeScript compilation failed: ${buildResult.stderr?.toString() || 'Unknown error'}`);
            }
        }
        // 2. Prepare Temp Staging Area
        const stagingDir = path.join(outputDir, `staging-${packageId}`);
        fs.mkdirSync(stagingDir, { recursive: true });
        // 3. Collect Build Artifacts (dist, configs, licenses, assets)
        const collectDirs = ['dist', 'assets', 'config', 'licenses'];
        for (const dir of collectDirs) {
            const srcPath = path.join(sourceDir, dir);
            if (fs.existsSync(srcPath)) {
                fs.cpSync(srcPath, path.join(stagingDir, dir), { recursive: true });
            }
        }
        // Strip development files (.ts, .map files depending on build profile)
        if (profile === 'Production' || profile === 'Enterprise') {
            console.log(`[DistributionBuilder] Stripping development map files and source files...`);
            this.stripDevelopmentFiles(stagingDir);
        }
        // 4. Calculate File SHA256 Checksums
        console.log(`[DistributionBuilder] Generating SHA256 checksums index...`);
        const fileChecksums = {};
        this.collectChecksumsRecursive(stagingDir, stagingDir, fileChecksums);
        // 5. Generate and Sign Manifest
        const finalManifest = {
            ...manifest,
            version: manifest.version,
            type: manifest.type || 'Engine',
            checksums: {
                files: fileChecksums,
                manifest: ''
            },
            signature: undefined,
            metadata: {
                buildTimestamp: new Date().toISOString(),
                buildProfile: profile,
                releaseChannel: channel,
                packageSize: 0 // populated later
            }
        };
        // Calculate manifest text signature
        const manifestToSign = JSON.stringify(finalManifest, null, 2);
        const signature = this.signer.signText(manifestToSign);
        finalManifest.signature = signature;
        finalManifest.checksums.manifest = crypto.createHash('sha256').update(manifestToSign).digest('hex');
        // Write final signed manifest
        fs.writeFileSync(path.join(stagingDir, 'manifest.json'), JSON.stringify(finalManifest, null, 2), 'utf8');
        // 6. Compress into .aeg native package format (first pass to measure size)
        fs.mkdirSync(outputDir, { recursive: true });
        const aegPath = path.join(outputDir, `${packageId}-${manifest.version}.aeg`);
        if (fs.existsSync(aegPath)) {
            fs.rmSync(aegPath, { force: true });
        }
        console.log(`[DistributionBuilder] Archiving stage files to native target: ${path.basename(aegPath)}`);
        this.archiveDirectory(stagingDir, aegPath);
        // Update package size inside metadata, then re-sign and re-pack
        const sizeBytes = fs.statSync(aegPath).size;
        finalManifest.metadata.packageSize = sizeBytes;
        // Re-sign the final manifest (with correct packageSize populated)
        const finalManifestToSign = JSON.stringify({ ...finalManifest, signature: undefined, checksums: { ...finalManifest.checksums, manifest: '' } }, null, 2);
        const finalSignature = this.signer.signText(finalManifestToSign);
        finalManifest.signature = finalSignature;
        finalManifest.checksums.manifest = crypto.createHash('sha256').update(finalManifestToSign).digest('hex');
        // Rewrite manifest to stage and re-pack with updated size + fresh signature
        fs.writeFileSync(path.join(stagingDir, 'manifest.json'), JSON.stringify(finalManifest, null, 2), 'utf8');
        fs.rmSync(aegPath, { force: true });
        this.archiveDirectory(stagingDir, aegPath);
        // Clean staging area
        fs.rmSync(stagingDir, { recursive: true, force: true });
        console.log(`[DistributionBuilder] Packaging succeeded: ${aegPath} (${(sizeBytes / 1024).toFixed(1)} KB)`);
        return aegPath;
    }
    async buildBundle(options) {
        const { bundleId, version, packages, outputDir, publisher } = options;
        console.log(`[DistributionBuilder] Packaging multi-package bundle "${bundleId}" v${version}...`);
        const stagingDir = path.join(outputDir, `staging-bundle-${bundleId}`);
        fs.mkdirSync(stagingDir, { recursive: true });
        const bundlePackages = [];
        for (const pkg of packages) {
            if (!fs.existsSync(pkg.path)) {
                throw new Error(`Package file not found: ${pkg.path}`);
            }
            // Copy package to staging
            const fileName = path.basename(pkg.path);
            const destPath = path.join(stagingDir, fileName);
            fs.copyFileSync(pkg.path, destPath);
            // Compute SHA256 of the package file
            const fileBuffer = fs.readFileSync(pkg.path);
            const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
            bundlePackages.push({
                id: pkg.id,
                version: pkg.version,
                file: fileName,
                checksum
            });
        }
        const bundleJson = {
            bundleId,
            version,
            packages: bundlePackages,
            metadata: {
                buildTimestamp: new Date().toISOString(),
                publisher
            },
            signature: ''
        };
        // Calculate bundle metadata signature
        const bundleToSign = JSON.stringify(bundleJson, null, 2);
        const signature = this.signer.signText(bundleToSign);
        bundleJson.signature = signature;
        fs.writeFileSync(path.join(stagingDir, 'bundle.json'), JSON.stringify(bundleJson, null, 2), 'utf8');
        // Archive stagingDir into .aegbundle
        fs.mkdirSync(outputDir, { recursive: true });
        const bundlePath = path.join(outputDir, `${bundleId}-${version}.aegbundle`);
        if (fs.existsSync(bundlePath)) {
            fs.rmSync(bundlePath, { force: true });
        }
        console.log(`[DistributionBuilder] Archiving stage files to bundle target: ${path.basename(bundlePath)}`);
        this.archiveDirectory(stagingDir, bundlePath);
        // Clean staging area
        fs.rmSync(stagingDir, { recursive: true, force: true });
        console.log(`[DistributionBuilder] Bundle packaging succeeded: ${bundlePath}`);
        return bundlePath;
    }
    async generateRepositoryIndex(repoDir) {
        console.log(`[DistributionBuilder] Generating repository index in: ${repoDir}`);
        const indexFile = path.join(repoDir, 'repository.json');
        const repoIndex = {
            packages: {},
            bundles: {},
            signature: ''
        };
        // Scan repoDir for .aeg and .aegbundle files
        if (fs.existsSync(repoDir)) {
            const files = fs.readdirSync(repoDir);
            for (const file of files) {
                const fullPath = path.join(repoDir, file);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory())
                    continue;
                if (file.endsWith('.aeg')) {
                    console.log(`[DistributionBuilder] Scanning package: ${file}`);
                    try {
                        const manifest = this.extractManifestFromPackage(fullPath);
                        const pkgId = manifest.id;
                        const version = manifest.version;
                        const fileBuffer = fs.readFileSync(fullPath);
                        const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
                        if (!repoIndex.packages[pkgId]) {
                            repoIndex.packages[pkgId] = {
                                latest: version,
                                versions: {}
                            };
                        }
                        repoIndex.packages[pkgId].versions[version] = {
                            id: manifest.id,
                            name: manifest.name,
                            version: manifest.version,
                            type: manifest.type || 'Engine',
                            description: manifest.description || '',
                            file: file,
                            checksum,
                            signature: manifest.signature || '',
                            dependencies: manifest.dependencies || {},
                            supportedPlatforms: manifest.supportedPlatforms || [],
                            supportedArchitectures: manifest.supportedArchitectures || [],
                            runtimeVersionConstraint: manifest.runtimeVersionConstraint,
                            sdkVersion: manifest.sdkVersion,
                            metadata: manifest.metadata
                        };
                        const currentLatest = repoIndex.packages[pkgId].latest;
                        if (this.compareVersions(version, currentLatest) > 0) {
                            repoIndex.packages[pkgId].latest = version;
                        }
                    }
                    catch (err) {
                        console.error(`[DistributionBuilder] Error scanning package ${file}: ${err.message}`);
                    }
                }
                else if (file.endsWith('.aegbundle')) {
                    console.log(`[DistributionBuilder] Scanning bundle: ${file}`);
                    try {
                        const bundleJson = this.extractBundleJsonFromBundle(fullPath);
                        const bundleId = bundleJson.bundleId;
                        const version = bundleJson.version;
                        const fileBuffer = fs.readFileSync(fullPath);
                        const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
                        if (!repoIndex.bundles[bundleId]) {
                            repoIndex.bundles[bundleId] = {
                                latest: version,
                                versions: {}
                            };
                        }
                        repoIndex.bundles[bundleId].versions[version] = {
                            bundleId,
                            version,
                            file: file,
                            checksum,
                            signature: bundleJson.signature || '',
                            packages: bundleJson.packages || [],
                            metadata: bundleJson.metadata
                        };
                        const currentLatest = repoIndex.bundles[bundleId].latest;
                        if (this.compareVersions(version, currentLatest) > 0) {
                            repoIndex.bundles[bundleId].latest = version;
                        }
                    }
                    catch (err) {
                        console.error(`[DistributionBuilder] Error scanning bundle ${file}: ${err.message}`);
                    }
                }
            }
        }
        // Sign the entire repository index
        const indexToSign = JSON.stringify(repoIndex, null, 2);
        const signature = this.signer.signText(indexToSign);
        repoIndex.signature = signature;
        fs.writeFileSync(indexFile, JSON.stringify(repoIndex, null, 2), 'utf8');
        console.log(`[DistributionBuilder] Repository index updated at ${indexFile}`);
        return indexFile;
    }
    extractManifestFromPackage(aegPath) {
        const tempDir = path.join(path.dirname(aegPath), `temp-extract-${crypto.randomBytes(4).toString('hex')}`);
        fs.mkdirSync(tempDir, { recursive: true });
        try {
            const isWindows = process.platform === 'win32';
            if (isWindows) {
                // PowerShell Expand-Archive only supports .zip extension
                const ext = path.extname(aegPath).toLowerCase();
                const effectiveSrc = ext !== '.zip' ? aegPath + '.zip' : aegPath;
                if (ext !== '.zip')
                    fs.copyFileSync(aegPath, effectiveSrc);
                try {
                    const result = spawnSync('powershell.exe', [
                        '-NoProfile', '-NonInteractive', '-Command',
                        `Expand-Archive -Path '${effectiveSrc}' -DestinationPath '${tempDir}' -Force`
                    ]);
                    if (result.status !== 0) {
                        throw new Error(`PowerShell Expand-Archive failed: ${result.stderr?.toString()}`);
                    }
                }
                finally {
                    if (ext !== '.zip' && fs.existsSync(effectiveSrc))
                        fs.rmSync(effectiveSrc, { force: true });
                }
            }
            else {
                const result = spawnSync('unzip', ['-q', aegPath, '-d', tempDir]);
                if (result.status !== 0) {
                    throw new Error(`unzip failed: ${result.stderr?.toString()}`);
                }
            }
            const manifestPath = path.join(tempDir, 'manifest.json');
            if (fs.existsSync(manifestPath)) {
                return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            }
            throw new Error(`manifest.json not found inside package archive ${aegPath}`);
        }
        finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    }
    extractBundleJsonFromBundle(bundlePath) {
        const tempDir = path.join(path.dirname(bundlePath), `temp-extract-${crypto.randomBytes(4).toString('hex')}`);
        fs.mkdirSync(tempDir, { recursive: true });
        try {
            const isWindows = process.platform === 'win32';
            if (isWindows) {
                // PowerShell Expand-Archive only supports .zip extension
                const ext = path.extname(bundlePath).toLowerCase();
                const effectiveSrc = ext !== '.zip' ? bundlePath + '.zip' : bundlePath;
                if (ext !== '.zip')
                    fs.copyFileSync(bundlePath, effectiveSrc);
                try {
                    const result = spawnSync('powershell.exe', [
                        '-NoProfile', '-NonInteractive', '-Command',
                        `Expand-Archive -Path '${effectiveSrc}' -DestinationPath '${tempDir}' -Force`
                    ]);
                    if (result.status !== 0) {
                        throw new Error(`PowerShell Expand-Archive failed: ${result.stderr?.toString()}`);
                    }
                }
                finally {
                    if (ext !== '.zip' && fs.existsSync(effectiveSrc))
                        fs.rmSync(effectiveSrc, { force: true });
                }
            }
            else {
                const result = spawnSync('unzip', ['-q', bundlePath, '-d', tempDir]);
                if (result.status !== 0) {
                    throw new Error(`unzip failed: ${result.stderr?.toString()}`);
                }
            }
            const bundleJsonPath = path.join(tempDir, 'bundle.json');
            if (fs.existsSync(bundleJsonPath)) {
                return JSON.parse(fs.readFileSync(bundleJsonPath, 'utf8'));
            }
            throw new Error(`bundle.json not found inside bundle archive ${bundlePath}`);
        }
        finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    }
    compareVersions(v1, v2) {
        const p1 = v1.split('.').map(Number);
        const p2 = v2.split('.').map(Number);
        for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
            const n1 = p1[i] || 0;
            const n2 = p2[i] || 0;
            if (n1 > n2)
                return 1;
            if (n1 < n2)
                return -1;
        }
        return 0;
    }
    async generateReleaseManifest(options) {
        const { releaseVersion, packages, bundles, outputDir } = options;
        console.log(`[DistributionBuilder] Generating global release manifest for release: ${releaseVersion}`);
        const releaseManifest = {
            releaseVersion,
            buildTimestamp: new Date().toISOString(),
            platform: process.platform,
            arch: process.arch,
            packages,
            bundles,
            signature: ''
        };
        const manifestToSign = JSON.stringify(releaseManifest, null, 2);
        const signature = this.signer.signText(manifestToSign);
        releaseManifest.signature = signature;
        const releaseFilePath = path.join(outputDir, 'release.json');
        fs.writeFileSync(releaseFilePath, JSON.stringify(releaseManifest, null, 2), 'utf8');
        console.log(`[DistributionBuilder] Global release manifest generated at ${releaseFilePath}`);
        return releaseFilePath;
    }
    stripDevelopmentFiles(dirPath) {
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                this.stripDevelopmentFiles(fullPath);
            }
            else {
                if (item.endsWith('.ts') || item.endsWith('.map') || item.endsWith('.spec.js') || item.endsWith('.test.js')) {
                    fs.rmSync(fullPath, { force: true });
                }
            }
        }
    }
    collectChecksumsRecursive(baseDir, currentDir, checksums) {
        const items = fs.readdirSync(currentDir);
        for (const item of items) {
            const fullPath = path.join(currentDir, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                this.collectChecksumsRecursive(baseDir, fullPath, checksums);
            }
            else {
                // Skip manifest itself during file hashing
                if (item === 'manifest.json')
                    continue;
                const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
                const fileBuffer = fs.readFileSync(fullPath);
                const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
                checksums[relativePath] = hash;
            }
        }
    }
    archiveDirectory(srcDir, destZipPath) {
        const isWindows = process.platform === 'win32';
        let result;
        if (isWindows) {
            // PowerShell Compress-Archive only supports .zip extension natively.
            // So we compress to a temp .zip file first, then rename it.
            const tempZipPath = destZipPath + '.zip';
            if (fs.existsSync(tempZipPath)) {
                fs.rmSync(tempZipPath, { force: true });
            }
            result = spawnSync('powershell.exe', [
                '-NoProfile',
                '-NonInteractive',
                '-Command',
                `Compress-Archive -Path '${srcDir}\\*' -DestinationPath '${tempZipPath}' -Force`
            ]);
            if (result.status === 0 && fs.existsSync(tempZipPath)) {
                if (fs.existsSync(destZipPath)) {
                    fs.rmSync(destZipPath, { force: true });
                }
                fs.renameSync(tempZipPath, destZipPath);
            }
            else {
                // Clean up temp file if something went wrong
                if (fs.existsSync(tempZipPath)) {
                    fs.rmSync(tempZipPath, { force: true });
                }
            }
        }
        else {
            result = spawnSync('zip', ['-r', destZipPath, '.'], { cwd: srcDir });
        }
        if (result.status !== 0) {
            const errorMsg = result.stderr?.toString() || 'Unknown archive error';
            throw new Error(`Failed to compress staging directory: ${errorMsg}`);
        }
    }
}
