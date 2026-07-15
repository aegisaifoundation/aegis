# Phase 4: Cognitive Memory Engine Specification

The Cognitive Memory Engine handles multi-tiered semantic context storage, indexing, and vector calculations, serving as the node's long-term retrieval brain.

---

## 1. Multi-Tiered Context Architecture

Memory is structured across distinct storage tiers:

1.  **Short-Term Conversation Buffer**: A fast, in-memory queue containing the immediate conversation history. Used for sliding window inputs.
2.  **Long-Term Index Tree**: A hierarchical semantic database that stores vector-embedded documents, experiences, and concepts. It supports fast nearest-neighbor similarity searches.
3.  **Transactional Write Buffer**: Staging layer for pending writes, preventing disk corruption by batching operations and committing them atomically to disk.

---

## 2. Memory Reflections & Consolidation

A background reflection process triggers when the write buffer threshold is exceeded:
*   **Relevance Analysis**: Evaluates duplicate or stale concepts and consolidates them.
*   **Vector Compression**: Distills long transcripts into summarized semantic chunks.
*   **Conflict Resolution**: Detects contradictory information (e.g. "User requested tool A" vs "User requested tool B") and resolves them using chronological timestamps or user-weighted overrides.
