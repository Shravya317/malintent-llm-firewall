# MalIntent Backend Architecture & Technical Stack

The following diagrams and tables have been generated to assist in writing the final project report for MalIntent. These focus strictly on the backend detection engines, security enforcement layers, and technical stack.

## 1. System Overview Flowchart

MalIntent processes incoming prompts through three independent detection engines (Pattern, ML, Semantic) running in a fast pipeline. Their outputs are evaluated by a Unified Risk Scorer, which then passes the request through the Security Enforcement Layer before reaching the LLM API.

```mermaid
graph TD
    classDef client fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef layer fill:#e1f5fe,stroke:#03a9f4,stroke-width:2px;
    classDef score fill:#fff3e0,stroke:#ff9800,stroke-width:2px;
    classDef sel fill:#e8f5e9,stroke:#4caf50,stroke-width:2px;
    classDef ext fill:#fce4ec,stroke:#e91e63,stroke-width:2px;

    Client[Client Application]:::client --> Proxy[FastAPI Reverse Proxy<br/>JWT Auth + Rate Limiting]:::client
    Proxy --> LayerA[Layer A: Pattern Engine<br/>47 Regex | 7 OWASP Cats<br/>~2ms latency | 30% weight]:::layer
    Proxy --> LayerB[Layer B: ML Engine<br/>PromptGuard-86M<br/>~50ms latency | 45% weight]:::layer
    Proxy --> LayerC[Layer C: Semantic Engine<br/>MiniLM + FAISS<br/>~8ms latency | 25% weight]:::layer

    LayerA --> Scorer{Unified Risk Scorer<br/>BLOCK: ≥ 70<br/>FLAG: ≥ 25<br/>ALLOW: < 25}:::score
    LayerB --> Scorer
    LayerC --> Scorer

    Scorer -- Allow / Flag --> SEL[Security Enforcement Layer<br/>• PII Dynamic Masking<br/>• Secret Redaction<br/>• Output Consistency Validator<br/>• Action Audit Logger]:::sel
    Scorer -- Block --> Block[Return 403 Forbidden]
    
    SEL --> LLM[External LLM API]:::ext
    LLM --> SEL
    SEL --> Client
```

## 2. Detection Engine Architectures

### Layer A: Pattern Detection Engine
Fast, deterministic first-pass engine focusing on known injection syntax and format obfuscation.

| Component | Configuration | Purpose |
| :--- | :--- | :--- |
| **Input** | String (UTF-8) | Raw user prompt |
| **Processing** | Regex Compilation (re) | Pre-compiled on startup for zero-latency execution |
| **Ruleset** | 47 Regex Patterns | Covering 7 OWASP LLM attack categories |
| **Categories** | Payload splitting, obfuscation, DAN | Deterministic matching of known attack vectors |
| **Output** | Boolean / Matched Patterns | Feeds 30% weight to Unified Risk Scorer |

### Layer B: ML Classification Engine
Transformer-based classifier fine-tuned to distinguish between benign instruction-following and malicious jailbreaks.

| Layer / Component | Configuration | Output Shape |
| :--- | :--- | :--- |
| **Input (Token IDs)** | `max_length=512`, AutoTokenizer | `(512,)` |
| **Architecture** | DeBERTa-based (PromptGuard-86M) | - |
| **Precision** | `bf16` (Mixed Precision) | - |
| **Transformer Blocks** | 12 hidden layers, 12 attention heads | `(512, 768)` |
| **Hidden Size** | `dim=768` | - |
| **Classification Head** | Dense Layer, 2 classes (Benign / Malicious) | `(2,)` |
| **Activation** | Softmax | `(2,)` |
| **Total Parameters** | 86 Million | - |

### Layer C: Semantic Similarity Engine
Vector database matching against known attack phrases to catch paraphrased, translated, or zero-day variants of known attacks.

| Component | Configuration | Purpose |
| :--- | :--- | :--- |
| **Embedding Model** | `all-MiniLM-L6-v2` | Sentence-transformer generating embeddings |
| **Embedding Dimension**| 384 | Dense vector representation of intent |
| **Index Type** | FAISS `IndexFlatIP` | Inner product (cosine similarity on L2-norm) |
| **Corpus** | 206 known attack phrases | Pre-encoded offline and loaded into RAM |
| **Thresholds** | `≥ 0.90` (Override Block), `≥ 0.65` (Flag) | Configurable semantic sensitivity |
| **Output** | Top-k matches + Cosine Similarity | Feeds 25% weight or Override to Scorer |

## 3. Technical Stack

| Component | Library / Technology | Purpose |
| :--- | :--- | :--- |
| **API Framework** | FastAPI (Python 3.10+) | High-performance async REST API, JWT auth, routing |
| **ML Inference** | PyTorch + HuggingFace Transformers | Serving PromptGuard-86M |
| **Vector Search** | FAISS (faiss-cpu) + sentence-transformers | Layer C semantic similarity and retrieval |
| **Data Masking** | Microsoft Presidio | PII detection and consistent token replacement |
| **Database** | PostgreSQL 16 + `pgcrypto` (Supabase) | Encrypted storage, transaction pooling |
| **Cryptography** | Fernet (cryptography library) | Application-level symmetric encryption for Configs |
| **Deployment** | Google Cloud Run | Serverless containerized backend auto-scaling |
| **Containerization** | Docker | Production parity, local PostgreSQL setup |
| **NLP Utilities** | spaCy (`en_core_web_lg`) | Entity extraction for output validation/masking |
