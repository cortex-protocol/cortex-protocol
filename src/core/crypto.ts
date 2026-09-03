import { ec as EC } from 'elliptic';
import crypto from 'crypto';

// Use standard secp256k1 curve (same as Bitcoin & Ethereum)
const ec = new EC('secp256k1');

export interface KeyPair {
    privateKey: string;
    publicKey: string;
    address: string;
}

export class CortexCrypto {
    /**
     * Compute SHA-256 hash of any string or Buffer
     */
    static sha256(data: string | Buffer): string {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Compute double SHA-256 (SHA-256d) for mining and block hashing
     */
    static sha256d(data: string | Buffer): string {
        const first = crypto.createHash('sha256').update(data).digest();
        return crypto.createHash('sha256').update(first).digest('hex');
    }

    /**
     * Derive a human-readable Cortex address from a public key:
     * Format: ctx1 + 38 chars of base58-like hex checksum
     */
    static deriveAddress(publicKeyHex: string): string {
        const pubKeyHash = crypto.createHash('sha256').update(Buffer.from(publicKeyHex, 'hex')).digest();
        const ripemd = crypto.createHash('ripemd160').update(pubKeyHash).digest('hex');
        
        // Compute 4-byte checksum from ripemd
        const checksum = crypto.createHash('sha256').update(crypto.createHash('sha256').update(ripemd).digest()).digest('hex').substring(0, 8);
        return `ctx1${ripemd}${checksum}`;
    }

    /**
     * Generate a brand new cryptographically secure KeyPair
     */
    static generateKeyPair(): KeyPair {
        const key = ec.genKeyPair();
        const privateKey = key.getPrivate('hex').padStart(64, '0');
        const publicKey = key.getPublic(true, 'hex'); // Compressed format (33 bytes / 66 hex chars)
        const address = this.deriveAddress(publicKey);

        return { privateKey, publicKey, address };
    }

    /**
     * Reconstruct KeyPair from an existing private key hex
     */
    static fromPrivateKey(privateKeyHex: string): KeyPair {
        const key = ec.keyFromPrivate(privateKeyHex, 'hex');
        const privateKey = key.getPrivate('hex').padStart(64, '0');
        const publicKey = key.getPublic(true, 'hex');
        const address = this.deriveAddress(publicKey);

        return { privateKey, publicKey, address };
    }

    /**
     * Sign a data hash with a private key (ECDSA)
     */
    static sign(dataHash: string, privateKeyHex: string): string {
        const key = ec.keyFromPrivate(privateKeyHex, 'hex');
        const signature = key.sign(dataHash, 'hex', { canonical: true });
        return signature.toDER('hex');
    }

    /**
     * Verify an ECDSA signature against a public key
     */
    static verifySignature(dataHash: string, signatureHex: string, publicKeyHex: string): boolean {
        try {
            const key = ec.keyFromPublic(publicKeyHex, 'hex');
            return key.verify(dataHash, signatureHex);
        } catch {
            return false;
        }
    }

    /**
     * Encrypt memory payload with a shared secret or AES-256-GCM
     */
    static encryptData(text: string, secretKeyHex: string): { ciphertext: string; iv: string; tag: string } {
        const key = crypto.createHash('sha256').update(secretKeyHex).digest();
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const tag = cipher.getAuthTag().toString('hex');

        return {
            ciphertext: encrypted,
            iv: iv.toString('hex'),
            tag: tag
        };
    }

    /**
     * Decrypt memory payload
     */
    static decryptData(ciphertext: string, ivHex: string, tagHex: string, secretKeyHex: string): string | null {
        try {
            const key = crypto.createHash('sha256').update(secretKeyHex).digest();
            const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
            decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

            let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch {
            return null;
        }
    }
}
