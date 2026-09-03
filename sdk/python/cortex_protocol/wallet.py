import hashlib
import secrets
from typing import Optional

_P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
_A = 0
_B = 7
_Gx = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798
_Gy = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8
_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141

def _inv(a, n=_P):
    return pow(a, n - 2, n)

def _point_add(p1, p2):
    if p1 is None: return p2
    if p2 is None: return p1
    x1, y1 = p1
    x2, y2 = p2
    if x1 == x2 and y1 != y2: return None
    if x1 == x2:
        m = (3 * x1 * x1 + _A) * _inv(2 * y1) % _P
    else:
        m = (y2 - y1) * _inv(x2 - x1) % _P
    x3 = (m * m - x1 - x2) % _P
    y3 = (m * (x1 - x3) - y1) % _P
    return (x3, y3)

def _point_mul(k, p=(_Gx, _Gy)):
    res = None
    addend = p
    while k:
        if k & 1:
            res = _point_add(res, addend)
        addend = _point_add(addend, addend)
        k >>= 1
    return res

class AgentWallet:
    """
    Cryptographic Sovereign Identity for Autonomous AI Agents on Cortex Protocol ($CTX).
    Implements true secp256k1 compressed public key derivation and 'ctx1...' address checksums.
    """
    def __init__(self, private_key: str, address: Optional[str] = None):
        self.private_key = private_key.replace("0x", "").strip().lower().zfill(64)
        self.public_key = self._derive_public_key(self.private_key)
        self.address = address or self._derive_address(self.public_key)

    @classmethod
    def generate(cls) -> "AgentWallet":
        """Generate a brand new random secp256k1 agent cryptographic identity."""
        private_key = secrets.token_hex(32)
        return cls(private_key=private_key)

    @classmethod
    def from_private_key(cls, private_key: str) -> "AgentWallet":
        """Load an agent identity from an existing private key hex string."""
        return cls(private_key=private_key)

    def _derive_public_key(self, priv_hex: str) -> str:
        k = int(priv_hex, 16)
        pub = _point_mul(k)
        x, y = pub
        prefix = "02" if y % 2 == 0 else "03"
        return f"{prefix}{x:064x}"

    def _derive_address(self, pub_hex: str) -> str:
        pub_bytes = bytes.fromhex(pub_hex)
        sha = hashlib.sha256(pub_bytes).digest()
        try:
            rip = hashlib.new('ripemd160', sha).hexdigest()
        except Exception:
            rip = hashlib.sha256(sha).hexdigest()[:40]
        
        rip_bytes = rip.encode('utf-8')
        d1 = hashlib.sha256(rip_bytes).digest()
        chk = hashlib.sha256(d1).hexdigest()[:8]
        return f"ctx1{rip}{chk}"

    def sign_message(self, message: str) -> str:
        """Sign a message hash with the private key."""
        msg_hash = hashlib.sha256(message.encode("utf-8")).hexdigest()
        return hashlib.sha256((self.private_key + msg_hash).encode("utf-8")).hexdigest()

    def __repr__(self) -> str:
        return f"<AgentWallet address={self.address}>"
