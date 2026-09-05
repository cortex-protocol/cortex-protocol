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

    private isSaving: boolean = false;
    private pendingSave: boolean = false;
    private lastSaveChainRef: Block[] | null = null;

    public saveChain(chain: Block[]): void {
        this.lastSaveChainRef = chain;
        if (this.isSaving) {
            this.pendingSave = true;
            return;
        }

        this.executeAsyncSave();
    }

    private async executeAsyncSave(): Promise<void> {
        this.isSaving = true;
        this.pendingSave = false;

        try {
            const chainToSave = this.lastSaveChainRef;
            if (!chainToSave) {
                this.isSaving = false;
                return;
            }

            const data = JSON.stringify({
                version: '1.0.0',
                network: 'cortex-mainnet',
                lastUpdated: new Date().toISOString(),
                blockCount: chainToSave.length,
                chain: chainToSave
            });

            const tempPath = `${this.chainFilePath}.tmp`;
            await fs.promises.writeFile(tempPath, data, 'utf8');
            await fs.promises.rename(tempPath, this.chainFilePath);
        } catch (err) {
            console.error('[StorageEngine] Error saving blockchain ledger to disk:', err);
        } finally {
            this.isSaving = false;
            if (this.pendingSave) {
                setImmediate(() => this.executeAsyncSave());
            }
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
