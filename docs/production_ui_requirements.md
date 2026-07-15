# Production UI & Requirements Specification

This document defines the production design guidelines and operational requirements for the AEGIS Desktop Application, Web Dashboards, Enterprise Licensing, and Cluster Management.

---

## 1. Desktop Application UI Architecture

The Desktop App is a polished client wrapper (e.g. Electron or Tauri) interacting with the local AEGIS Node APIs. Key views include:

### A. The Chat Workspace
*   **Prompt Entry**: Multi-line entry with toggle options for streaming and model selection (local Llama vs remote GPT).
*   **Tool Logs Panel**: Displays real-time details of tool execution and reasoning trajectories (e.g., "Planner running -> Coder executing -> Critic validating").
*   **Privacy Guard Overlay**: Visual warning when the user inputs potential PII or API keys, indicating local redaction or blocking policies.

### B. Package Marketplace Interface
*   **Catalog Browser**: Categories for Agents, Tools, Skills, and Models.
*   **Trust Ratings**: Reviews, download metrics, and publisher validation certificate ticks.
*   **Dependency Resolver**: Visual indicator showing required dependencies (e.g. "This tool requires llama-3 model to run").

---

## 2. Web & Node Dashboards

For remote administration and enterprise control, a responsive dashboard displays:

*   **Hardware Monitor**: Live CPU, RAM, GPU, and Disk utilization graphs.
*   **Model Manager**: Resident models, memory footprints, and lazy-unload configuration sliders.
*   **Learning Rounds Panel**: Live FedAvg/Swarm learning progress, local gradients logs, loss curves, and participant approval buttons.
*   **Reputation Graph**: Nodes trust score network map.

---

## 3. Subscription & Licensing Scopes

AEGIS supports modular editions to accommodate different compliance requirements:

1.  **Community / Student**: Standard offline runtime features. Local inference and tool call capability.
2.  **Research / Academic**: Enables Federated and Swarm learning engines. Increases resource allocation bounds.
3.  **Enterprise / Healthcare**: Unlocks full ASCIP secure P2P collaboration workspaces, SSO/LDAP user directories mapping, encrypted backups, audit logs, and cluster group management.
4.  **Government**: Enforces FIPS-compliant encryption, air-gapped offline routing presets, and mandatory signature validation for all packages.
