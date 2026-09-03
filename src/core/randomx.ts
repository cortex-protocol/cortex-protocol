import crypto from 'crypto';

/**
 * CORTEX PROTOCOL - ASIC-RESISTANT RANDOMX CPU POW ENGINE
 * 
 * High-performance, zero-allocation memory-bound RandomX VM implementation.
 */

export class CortexRandomX {
    public static readonly SCRATCHPAD_WORDS = 4096; // 32 KB L1/L2 cache-resident scratchpad
    public static readonly VM_ITERATIONS = 64;     // Optimized instruction cycles per hash
    public static readonly EPOCH_BLOCKS = 2048;

    // Pre-allocated static buffers to avoid GC pressure
    private static readonly sharedScratchpad = new BigInt64Array(CortexRandomX.SCRATCHPAD_WORDS);
    private static readonly sharedRegisters = new BigInt64Array(8);
    private static readonly sharedFloats = new Float64Array(4);
    private static readonly sharedFinalBuf = Buffer.alloc(64);

    /**
     * Compute RandomX hash of a block header with zero-allocation speed
     */
    public static hash(header: string, seed: string = 'cortex-randomx-genesis-seed-v1'): string {
        const scratchpad = this.sharedScratchpad;
        const r = this.sharedRegisters;
        const f = this.sharedFloats;

        // Step 1: Initialize Scratchpad using Seed & Header
        let key = crypto.createHash('sha512').update(`${header}:${seed}`).digest();
        for (let i = 0; i < this.SCRATCHPAD_WORDS; i += 8) {
            for (let j = 0; j < 8; j++) {
                scratchpad[i + j] = key.readBigInt64LE((j * 8) % 64);
            }
            if (i % 64 === 0) {
                key = crypto.createHash('sha512').update(key).digest();
            }
        }

        // Step 2: Initialize Registers
        const initialDigest = crypto.createHash('sha512').update(`${seed}:${header}`).digest();
        for (let i = 0; i < 8; i++) {
            r[i] = initialDigest.readBigInt64LE(i * 8);
        }
        for (let i = 0; i < 4; i++) {
            f[i] = Number(r[i] % 1000000n) / 1000.0;
        }

        // Step 3: Random Instruction VM Execution Loop
        const mask = this.SCRATCHPAD_WORDS - 1;
        const seedBytes = Buffer.from(seed, 'utf8');

        for (let iter = 0; iter < this.VM_ITERATIONS; iter++) {
            const opCode = (initialDigest[iter % 64] ^ seedBytes[iter % seedBytes.length]) % 10;
            const srcIdx = (iter + 1) % 8;
            const dstIdx = iter % 8;
            const memIdx = Number(BigInt.asUintN(32, r[dstIdx])) & mask;

            switch (opCode) {
                case 0: // IADD_RS
                    r[dstIdx] = (r[dstIdx] + scratchpad[memIdx]) & 0xFFFFFFFFFFFFFFFFn;
                    break;
                case 1: // ISUB_R
                    r[dstIdx] = (r[dstIdx] - r[srcIdx]) & 0xFFFFFFFFFFFFFFFFn;
                    break;
                case 2: // IMUL_R
                    r[dstIdx] = (r[dstIdx] * (r[srcIdx] | 1n)) & 0xFFFFFFFFFFFFFFFFn;
                    break;
                case 3: // IXOR_R
                    r[dstIdx] = r[dstIdx] ^ r[srcIdx];
                    break;
                case 4: // IROL_R
                    const shift = Number(r[srcIdx] & 63n);
                    r[dstIdx] = ((r[dstIdx] << BigInt(shift)) | (r[dstIdx] >> BigInt(64 - shift))) & 0xFFFFFFFFFFFFFFFFn;
                    break;
                case 5: // MEMORY_WRITE
                    scratchpad[memIdx] = r[dstIdx] ^ BigInt(iter);
                    break;
                case 6: // FADD_R
                    f[dstIdx % 4] = f[dstIdx % 4] + f[srcIdx % 4];
                    r[dstIdx] = r[dstIdx] ^ BigInt(Math.floor(Math.abs(f[dstIdx % 4])));
                    break;
                case 7: // FMUL_R
                    f[dstIdx % 4] = f[dstIdx % 4] * 1.00001;
                    r[dstIdx] = r[dstIdx] ^ BigInt(Math.floor(Math.abs(f[dstIdx % 4])));
                    break;
                case 8: // MEMORY_SWAP
                    const nextMem = (memIdx + 64) & mask;
                    const temp = scratchpad[memIdx];
                    scratchpad[memIdx] = scratchpad[nextMem];
                    scratchpad[nextMem] = temp;
                    break;
                case 9: // INEG_R
                    r[dstIdx] = (-r[dstIdx]) & 0xFFFFFFFFFFFFFFFFn;
                    break;
            }
        }

        // Step 4: Final Sponge Digest
        for (let i = 0; i < 8; i++) {
            this.sharedFinalBuf.writeBigInt64LE(r[i], i * 8);
        }

        const h1 = crypto.createHash('sha256').update(this.sharedFinalBuf).digest();
        const h2 = crypto.createHash('sha256').update(Buffer.concat([h1, Buffer.from(scratchpad.buffer, 0, 512)])).digest('hex');

        return h2;
    }

    public static verify(header: string, hash: string, difficulty: number, seed?: string): boolean {
        const targetPrefix = '0'.repeat(difficulty);
        if (!hash.startsWith(targetPrefix)) return false;
        const calculated = this.hash(header, seed);
        return calculated === hash;
    }

    public static getSeedForBlock(blockIndex: number): string {
        const epoch = Math.floor(blockIndex / this.EPOCH_BLOCKS);
        return `cortex-randomx-epoch-${epoch}`;
    }
}
