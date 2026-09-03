import * as fs from 'fs';
import * as path from 'path';
import { Block } from './block';

export class StorageEngine {
    private dataDir: string;
    private chainFilePath: string;

    constructor(customDataDir?: string) {
        this.dataDir = customDataDir || path.join(process.cwd(), 'data');
        this.chainFilePath = path.join(this.dataDir, 'chain.json');
        this.init();
    }

    private init(): void {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    public saveChain(chain: Block[]): void {
        try {
            const data = JSON.stringify({
                version: '1.0.0',
                network: 'cortex-mainnet',
                lastUpdated: new Date().toISOString(),
                blockCount: chain.length,
                chain: chain
            }, null, 2);
            
            // Atomic write using temporary file
            const tempPath = `${this.chainFilePath}.tmp`;
            fs.writeFileSync(tempPath, data, 'utf8');
            fs.renameSync(tempPath, this.chainFilePath);
        } catch (err) {
            console.error('[StorageEngine] Error saving blockchain ledger to disk:', err);
        }
    }

    public loadChain(): Block[] | null {
        try {
            if (!fs.existsSync(this.chainFilePath)) {
                return null;
            }
            const raw = fs.readFileSync(this.chainFilePath, 'utf8');
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.chain) && parsed.chain.length > 0) {
                return parsed.chain;
            }
            return null;
        } catch (err) {
            console.error('[StorageEngine] Error loading blockchain ledger from disk:', err);
            return null;
        }
    }

    public exists(): boolean {
        return fs.existsSync(this.chainFilePath);
    }
}
