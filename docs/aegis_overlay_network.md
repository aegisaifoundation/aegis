# AEGIS Overlay Network (AON): Native Private Mesh Networking

This document outlines the architecture for building a native private mesh overlay network (AON) directly within the AEGIS platform, eliminating the need for external network configurations like Tailscale or manual port-forwarding.

---

## 1. Core Architecture

The AEGIS Overlay Network establishes a secure, encrypted **virtual peer-to-peer overlay** on top of the public internet. Nodes communicate using a virtual IP range (e.g. `10.85.0.0/16`) routed through the native C++ transport layer.

```
Node A (10.85.0.1) ──────────( Encrypted Tunnel )────────── Node B (10.85.0.2)
       │                                                           │
       ▼                                                           ▼
Local LAN (Behind NAT)                                     Local LAN (Behind NAT)
       │                                                           │
       └──────────────> [ STUN / Hole Punching ] <─────────────────┘
```

---

## 2. Technical Building Blocks

To construct this overlay natively, three core protocols are integrated into the C++ `TcpTransport` and discovery managers:

### A. STUN/ICE NAT Traversal & Hole Punching
Instead of requiring public IPs or router port-forwarding:
1.  **STUN Protocol (Session Traversal Utilities for NAT)**: Nodes query public STUN servers to discover their public-facing IP address and source port map.
2.  **ICE/Hole Punching**: Nodes exchange these mapped ports (via a coordination handshake) and flood UDP/TCP packets to each other simultaneously. This "punches" a hole through the NAT, allowing direct connections.
3.  **TURN Relay Fallback**: In symmetric NAT environments (strict firewalls), direct hole punching is blocked. A TURN relay server is used as a fallback to forward encrypted frames.

### B. WireGuard-Style Key Exchange (Noise Protocol)
To ensure absolute security across the mesh:
*   Nodes exchange public keys upon node registration.
*   The connection handshake uses the **Noise Protocol Framework** (specifically `Noise_IK_25519_ChaChaPoly_SHA256`) to derive temporary session symmetric keys.
*   All virtual network frames are encrypted using authenticated ChaCha20-Poly1305.

### C. Virtual TUN Interface (Optional OS Layer)
For OS-level integrations:
*   AEGIS opens a **TUN virtual network driver** (e.g. `wintun` on Windows, `/dev/net/tun` on Linux).
*   The system binds a virtual IP (`10.85.0.x`) to the adapter.
*   Any system traffic routed to that IP is captured by the AEGIS daemon, encrypted, and forwarded over the P2P transport layer to the destination node.
