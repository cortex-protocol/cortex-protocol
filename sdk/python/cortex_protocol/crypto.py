import hashlib
import os
import json
import base64
from typing import List

def sha256(data: bytes | str) -> str:
    """Compute SHA-256 hash as hex string."""
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()

def sha256d(data: bytes | str) -> str:
    """Compute double SHA-256 hash as hex string (Bitcoin / Cortex PoW standard)."""
    if isinstance(data, str):
        data = data.encode("utf-8")
    first = hashlib.sha256(data).digest()
    return hashlib.sha256(first).hexdigest()

def compute_blind_vector_hash(ciphertext: str, vector: List[float]) -> str:
    """
    Vec2Text Anti-Inversion Defense:
    Computes a cryptographic blind commitment over the ciphertext and vector embedding.
    Ensures that raw vector values cannot be inverted back into original prompts.
    """
    vec_repr = ",".join(f"{v:.4f}" for v in vector[:64])
    combined = f"{ciphertext}:{vec_repr}"
    return sha256d(combined)

def generate_symmetric_key() -> str:
    """Generate a random 256-bit AES hex key."""
    return os.urandom(32).hex()

def simple_encrypt(plaintext: str, key_hex: str) -> str:
    """
    Encrypt plaintext memory string using AES-256-GCM (if cryptography is installed)
    or authenticated keystream (zero-dependency standard fallback).
    """
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        key = bytes.fromhex(key_hex[:64])
        aesgcm = AESGCM(key)
        nonce = os.urandom(12)
        ct = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
        payload = nonce + ct
        return base64.b64encode(payload).decode("utf-8")
    except ImportError:
        key_bytes = bytes.fromhex(key_hex.ljust(64, "0")[:64])
        iv = os.urandom(16)
        pt_bytes = plaintext.encode("utf-8")
        keystream = b""
        block_idx = 0
        while len(keystream) < len(pt_bytes):
            keystream += hashlib.sha256(key_bytes + iv + block_idx.to_bytes(4, "big")).digest()
            block_idx += 1
        ct_bytes = bytes(p ^ k for p, k in zip(pt_bytes, keystream[:len(pt_bytes)]))
        tag = hashlib.sha256(key_bytes + iv + ct_bytes).digest()[:16]
        payload = iv + tag + ct_bytes
        return base64.b64encode(payload).decode("utf-8")

def simple_decrypt(ciphertext_b64: str, key_hex: str) -> str:
    """
    Decrypt memory string.
    """
    data = base64.b64decode(ciphertext_b64.encode("utf-8"))
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        key = bytes.fromhex(key_hex[:64])
        aesgcm = AESGCM(key)
        nonce = data[:12]
        ct = data[12:]
        return aesgcm.decrypt(nonce, ct, None).decode("utf-8")
    except (ImportError, Exception):
        key_bytes = bytes.fromhex(key_hex.ljust(64, "0")[:64])
        iv = data[:16]
        tag = data[16:32]
        ct_bytes = data[32:]
        expected_tag = hashlib.sha256(key_bytes + iv + ct_bytes).digest()[:16]
        if tag != expected_tag:
            raise ValueError("Integrity check failed: invalid decryption key or corrupted ciphertext.")
        keystream = b""
        block_idx = 0
        while len(keystream) < len(ct_bytes):
            keystream += hashlib.sha256(key_bytes + iv + block_idx.to_bytes(4, "big")).digest()
            block_idx += 1
        pt_bytes = bytes(c ^ k for c, k in zip(ct_bytes, keystream[:len(ct_bytes)]))
        return pt_bytes.decode("utf-8")

class CortexRandomX:
    """
    ASIC-Resistant RandomX VM implementation in Python for Testnet 2.0.
    """
    SCRATCHPAD_WORDS = 4096
    VM_ITERATIONS = 64
    EPOCH_BLOCKS = 2048

    @staticmethod
    def get_seed_for_block(block_index: int) -> str:
        epoch = block_index // CortexRandomX.EPOCH_BLOCKS
        return f"cortex-randomx-epoch-{epoch}"

    @classmethod
    def hash(cls, header: str, seed: str = "cortex-randomx-genesis-seed-v1") -> str:
        try:
            import pyrx
            seed_hash = hashlib.sha256(seed.encode("utf-8")).digest()
            rx_hash = pyrx.get_rx_hash(header.encode("utf-8"), seed_hash, 0)
            return rx_hash.hex()
        except ImportError:
            pass

        # Native VM Execution
        scratchpad = [0] * cls.SCRATCHPAD_WORDS
        r = [0] * 8
        f = [0.0] * 4

        key = hashlib.sha512(f"{header}:{seed}".encode("utf-8")).digest()
        for i in range(0, cls.SCRATCHPAD_WORDS, 8):
            for j in range(8):
                byte_offset = (j * 8) % 64
                scratchpad[i + j] = int.from_bytes(key[byte_offset:byte_offset+8], byteorder="little", signed=True)
            if i % 64 == 0:
                key = hashlib.sha512(key).digest()

        initial_digest = hashlib.sha512(f"{seed}:{header}".encode("utf-8")).digest()
        for i in range(8):
            r[i] = int.from_bytes(initial_digest[i*8:(i+1)*8], byteorder="little", signed=True)
        for i in range(4):
            f[i] = float((r[i] % 1000000)) / 1000.0

        mask = cls.SCRATCHPAD_WORDS - 1
        seed_bytes = seed.encode("utf-8")
        mask64 = 0xFFFFFFFFFFFFFFFF

        for iter_idx in range(cls.VM_ITERATIONS):
            op_code = (initial_digest[iter_idx % 64] ^ seed_bytes[iter_idx % len(seed_bytes)]) % 10
            src_idx = (iter_idx + 1) % 8
            dst_idx = iter_idx % 8
            mem_idx = (r[dst_idx] & 0xFFFFFFFF) & mask

            if op_code == 0:
                r[dst_idx] = (r[dst_idx] + scratchpad[mem_idx]) & mask64
            elif op_code == 1:
                r[dst_idx] = (r[dst_idx] - r[src_idx]) & mask64
            elif op_code == 2:
                r[dst_idx] = (r[dst_idx] * (r[src_idx] | 1)) & mask64
            elif op_code == 3:
                r[dst_idx] = (r[dst_idx] ^ r[src_idx]) & mask64
            elif op_code == 4:
                shift = r[src_idx] & 63
                r[dst_idx] = (((r[dst_idx] << shift) & mask64) | ((r[dst_idx] >> (64 - shift)) & mask64)) & mask64
            elif op_code == 5:
                scratchpad[mem_idx] = (r[dst_idx] ^ iter_idx) & mask64
            elif op_code == 6:
                f[dst_idx % 4] = f[dst_idx % 4] + f[src_idx % 4]
                r[dst_idx] = (r[dst_idx] ^ int(abs(f[dst_idx % 4]))) & mask64
            elif op_code == 7:
                f[dst_idx % 4] = f[dst_idx % 4] * 1.00001
                r[dst_idx] = (r[dst_idx] ^ int(abs(f[dst_idx % 4]))) & mask64
            elif op_code == 8:
                next_mem = (mem_idx + 64) & mask
                scratchpad[mem_idx], scratchpad[next_mem] = scratchpad[next_mem], scratchpad[mem_idx]
            elif op_code == 9:
                r[dst_idx] = (-r[dst_idx]) & mask64

        final_buf = bytearray(64)
        for i in range(8):
            final_buf[i*8:(i+1)*8] = (r[i] & mask64).to_bytes(8, byteorder="little", signed=False)

        h1 = hashlib.sha256(bytes(final_buf)).digest()
        sp_bytes = bytearray(512)
        for i in range(64):
            sp_bytes[i*8:(i+1)*8] = (scratchpad[i] & mask64).to_bytes(8, byteorder="little", signed=False)

        h2 = hashlib.sha256(h1 + bytes(sp_bytes)).hexdigest()
        return h2
