"""Optional QRNG service for QuantumMark Sprint 9."""

import os
import secrets
from typing import Dict, Optional

try:
    from qiskit import QuantumCircuit, transpile
    from qiskit_aer import Aer
except Exception:  # pragma: no cover - optional dependency path
    QuantumCircuit = None
    transpile = None
    Aer = None


def generate_quantum_random_bytes(length: int = 32) -> Dict[str, object]:
    """Generate random bytes using a local quantum simulator when available."""
    if not isinstance(length, int) or length <= 0:
        raise ValueError("Length must be a positive integer.")

    if QuantumCircuit is not None and transpile is not None and Aer is not None:
        try:
            # Use a small circuit to generate random bits via measurement.
            circuit = QuantumCircuit(1, 1)
            circuit.h(0)
            circuit.measure(0, 0)
            simulator = Aer.get_backend("aer_simulator")
            compiled = transpile(circuit, simulator)
            result = simulator.run(compiled, shots=length * 8).result()
            counts = result.get_counts()
            bits = []
            for bitstring in counts:
                bits.extend(int(char) for char in bitstring)
            if len(bits) < length * 8:
                # Fill the remainder with secure randomness if the quantum run is short.
                bits.extend(secrets.randbits(8) for _ in range((length * 8) - len(bits)))
            random_bytes = bytearray()
            for index in range(0, len(bits), 8):
                chunk = bits[index:index + 8]
                if len(chunk) < 8:
                    chunk = chunk + [0] * (8 - len(chunk))
                value = 0
                for bit in chunk:
                    value = (value << 1) | bit
                random_bytes.append(value)
            if len(random_bytes) >= length:
                return {
                    "data": bytes(random_bytes[:length]),
                    "source": "quantum_simulator",
                }
        except Exception:
            pass

    secure_bytes = secrets.token_bytes(length)
    return {
        "data": secure_bytes,
        "source": "secure_random_fallback",
    }


def generate_security_key(length: int = 32) -> Dict[str, object]:
    """Return a generated key and its source without logging the secret value."""
    if not isinstance(length, int) or length <= 0:
        raise ValueError("Length must be a positive integer.")

    payload = generate_quantum_random_bytes(length)
    random_bytes = payload["data"]
    return {
        "key": random_bytes.hex(),
        "source": payload["source"],
    }


def get_random_bytes(length: int = 32) -> bytes:
    """Backward-compatible helper returning raw random bytes."""
    return generate_quantum_random_bytes(length)["data"]
