# Platform Concepts: Cluster Participants & Roles

In a distributed AEGIS environment, roles are not static hardware configurations. Instead, **a node's capability profile is dynamically defined by the specific engines installed on it**. 

A single cluster can contain hundreds of nodes cooperating across peer-to-peer tunnels. This document explains the primary participants, their responsibilities, and how they cooperate during swarm operations.

---

## The Primary Participant Roles

```
 ┌──────────────┐       ┌─────────────────┐       ┌─────────────────┐
 │ CLIENT NODE  │ ───➔  │ AGGREGATOR NODE │ ───➔  │   SERVER NODE   │
 └──────────────┘       └─────────────────┘       └─────────────────┘
  (Trains local          (Averages weights         (Indexes swarm &
   model weights)         & runs consensus)         publishes model)
```

### 1. Client Nodes (Workers)
Client nodes are the primary source of local data and compute power.
* **Core Goal**: Train AI model weights locally on private data.
* **Installed Engines**: `aegis-training-engine`, `aegis-data`.
* **Behavior**:
  - Download the global model.
  - Ingest, split, and process local datasets.
  - Execute gradient descent epochs to optimize model weight parameters.
  - Export LoRA adapter increments (.safetensors) and send them to an Aggregator.
* **Privacy Boundary**: Base model weights are never transferred; only incremental weight updates leave the client node.

### 2. Aggregator Nodes
Aggregator nodes perform the mathematical pooling and merging of peer weight delta tensors.
* **Core Goal**: Compute consensus weights average without accessing raw data.
* **Installed Engines**: `aegis-distributed-learning`, `aegis-swarm-learning`.
* **Behavior**:
  - Receive delta weights from multiple Client nodes.
  - Run weights validation: verify signatures and filter out noisy or malicious gradients (poisoning detection).
  - Run mathematical aggregation algorithms like **Federated Averaging (FedAvg)**.
  - Compress and quantize (e.g., int8 conversion) the averaged tensors to minimize bandwidth.
  - Submit the finalized merged weights to the Server.

### 3. Server Nodes (Orchestrators)
Server nodes manage directory coordination, security handshakes, and distribution channels. They do *not* run heavy weight tensor operations.
* **Core Goal**: Maintain cluster health, route transactions, and distribute models.
* **Installed Engines**: `aegis-api`, `aegis-knowledge-sync`, `aegis-node`.
* **Behavior**:
  - Maintain the global Node registry (IP endpoints, certificates, active status).
  - Synchronize learning round transitions (e.g., broadcasting "Start Epoch 1" or "Collection Complete").
  - Serve as the model registry where finalized, aggregated models are signed, cached, and published.
  - Host external REST/gRPC gateways for client-to-server communications.

---

## Cooperative Swarm Example

When running a collaborative training session across a 15-node network (e.g., 2 Servers, 4 Aggregators, and 9 Clients):

1. **Round Initialization**: The **Servers** announce the learning task configuration.
2. **Local Optimization**: The **9 Clients** train the model locally. When complete, they stream their LoRA weight deltas to the **4 Aggregators**.
3. **Consensus Averaging**: The **4 Aggregators** validate, verify signatures, average the weights, and push the unified LoRA to the **Servers**.
4. **Adapter Release**: The **Servers** update the global Model Registry and notify all **Clients** to pull the updated adapter.
5. **Model Hot-Swap**: The **Clients** pull the updated LoRA, and the local AI Runtime (`aegis-distributed-inference`) hot-swaps the weights without stopping application operations.
