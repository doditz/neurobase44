# 🧠 Neuronas — Cognitronic OS

> A neuromorphic, tri-hemispheric **Structured Multi-Agent Synthesis (SMAS)** platform that augments standard LLMs with dopamine-modulated cognitive dynamics, persona debate, grounded validation, and self-optimizing benchmarking.

[![Platform](https://img.shields.io/badge/platform-Base44-10b981)]()
[![Stack](https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20Deno-22c55e)]()
[![Version](https://img.shields.io/badge/personas-v6.2.0-f97316)]()

---

## 📖 Overview

**Neuronas** is a cognitive operating system built on the Base44 platform. Instead of answering with a single LLM pass, it routes every query through a biologically-inspired pipeline that simulates **left/right/central hemisphere** processing, **D2 dopaminergic modulation** (focus vs. exploration), and a **multi-persona debate** before synthesizing a grounded, validated answer.

The system continuously measures its own performance (**SPG — Score de Performance Global**) and tunes its parameters through automated benchmarking and reinforcement-style feedback loops.

### Core Idea — Mode A vs. Mode B

| Mode | Description |
|------|-------------|
| **Mode A** | Raw LLM response (baseline, no Neuronas stack) |
| **Mode B** | LLM + full Neuronas Validation Stack (SMAS debate, D2STIM, grounded validation) |
| **Mode C** | Ground-truth reference used for grading |

Every benchmark compares these modes to prove (or disprove) the value added by the cognitive stack.

---

## 🏛️ Architecture

```
                    ┌─────────────────────────────────────────┐
   User Query  ──▶  │  Intent Analyzer  →  SMARCE Complexity   │
                    └────────────────────┬────────────────────┘
                                         │
                    ┌────────────────────▼────────────────────┐
                    │   DSTIB Semantic Router (L1/L2/R2/R3-L3) │
                    │   + D2STIM Dopaminergic Modulation       │
                    └────────────────────┬────────────────────┘
                                         │
            ┌────────────────────────────▼───────────────────────────┐
            │            SMAS Tri-Hemispheric Debate                   │
            │   Left (Analytical) · Right (Creative) · Central (Synth) │
            │            N personas · M debate rounds                  │
            └────────────────────────────┬───────────────────────────┘
                                         │
                    ┌────────────────────▼────────────────────┐
                    │  Grounded Validation + BRONAS Ethics     │
                    └────────────────────┬────────────────────┘
                                         │
                    ┌────────────────────▼────────────────────┐
                    │   Final Synthesis  →  SPG Scoring        │
                    └──────────────────────────────────────────┘
```

### Key Subsystems

| Subsystem | Role |
|-----------|------|
| **D³STIB** | Dynamic Semantic Tier Information Bottleneck — routes queries by semantic density / entropy |
| **D2STIM** | Dopaminergic modulation (D2Stim = focus/precision, D2Pin = flexibility/creativity) |
| **SMAS** | Structured Multi-Agent Synthesis — the persona debate engine |
| **QRONAS** | Quantum-inspired dispatcher / state simulation |
| **BRONAS** | Bio-Responsible Optimization & ethical validation rulebook |
| **GC Harmonizer** | Global coherence harmonization across hemispheres |
| **Memory Tiers** | L1/L2/R2/R3 semantic memory with promotion, decay & vector search |

---

## 🎭 Persona Library (v6.2.0)

The system ships with **200+ neuromorphic personas** across 16 domains. Each persona carries a full neuromorphic profile:

- `hemisphere` — Left / Right / Central
- `d2_sensitivity` — −1.0 (D2Pin/creative) → +1.0 (D2Stim/focused)
- `cognitive_archetype` — Explorer · Synthesizer · Critic · Mediator · Validator
- `modulation_profile` — D2Stim · D2Pin · Balanced
- `expertise_score`, `priority_level`, `temperature_range`, `processing_bias`

| Domain Prefix | Category | Examples |
|---------------|----------|----------|
| `SCI-*` | Scientific | PhysicsAI, NeuroscienceAI, GeneticistAI |
| `TECH-*` | Engineering | CryptographyAI, RoboticsAI, CompilerAI |
| `ART-*` | Creative | MusicComposerAI, ArchitectAI, ComedianAI |
| `PRO-*` | Professional | EconomistAI, RiskManagementAI, StatisticianAI |
| `KNOW-*` | Specialized | ForensicsAI, DiplomacyAI, RadiologistAI |

---

## 🚀 Getting Started

This app runs on **Base44**. The frontend is a standard **Vite + React** project; backend logic lives in **Deno** serverless functions.

### Prerequisites

| Secret | Purpose |
|--------|---------|
| `GOOGLE_AI_API_KEY` | Primary LLM inference (Gemini) |
| `HF_TOKEN` | Hugging Face embeddings & semantic analysis |
| `PERPLEXITY_API_KEY` | External knowledge / web grounding |
| `GH_TOKEN` | GitHub repo analysis & commit history |

### Local Development

```bash
# Install dependencies
npm install

# Run the dev server (Vite)
npm run dev

# Build for production
npm run build
```

> Backend functions are deployed automatically by the Base44 platform — no separate Deno deploy step is required.

---

## 🗂️ Project Structure

```
src/
├── pages/          # Route-level screens (Chat, Benchmark, Personas, …)
├── components/     # Focused UI components (chat/, benchmark/, personas/, …)
├── functions/      # Deno backend functions (orchestrators, validators, tuners)
├── entities/       # JSON-schema data models (Persona, BenchmarkResult, …)
├── agents/         # AI agent configs (smas_debater, suno_prompt_architect, …)
├── lib/            # Auth, query client, navigation, utilities
├── App.jsx         # Application router
└── index.css       # Design tokens
```

See [`INDEX.md`](./INDEX.md) for a full map of pages, functions, and entities.

---

## ⚙️ Tunable Parameters

The cognitive stack is fully parameterized via the `TunableParameter` entity and adjusted live through the Self-Optimization dashboards.

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `temperature` | 0.6 | 0.3 – 0.9 | LLM determinism |
| `d2Modulation` | 0.5 | 0.3 – 0.95 | Focus ↔ exploration balance |
| `maxPersonas` | 12 | 1 – 15 | Concurrent debate agents |
| `debateRounds` | 3 | 1 – 8 | SMAS critique cycles |
| `compressionRatio` | 0.4 | 0.2 – 0.6 | Semantic prompt compression |
| `memoryActive` | 0/1 | 0 – 1 | Toggle memory layer |

---

## 📊 Benchmarking & Self-Optimization

- **Benchmark / DevTest runners** — execute A/B/C tests over curated question datasets
- **SPG** — weighted composite of quality, efficiency & complexity metrics
- **Auto-Tuning Loop** — adjusts parameters to maximize SPG
- **Alerting Engine** — flags regressions against pinned baselines
- **Unified Log** — single source of truth for all runs, diagnostics & parameter changes

---

## 🤖 AI Agents

| Agent | Purpose |
|-------|---------|
| `smas_debater` | Runs the tri-hemispheric persona debate |
| `suno_prompt_architect` | Crafts structured Suno music prompts |
| `qronas_dispatcher` | Quantum-inspired query dispatch |

Agents support **WhatsApp** and **Telegram** channels when enabled.

---

## 🧬 Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, shadcn/ui, Recharts, Framer Motion
- **Data/State:** TanStack Query, Base44 Entities SDK
- **Backend:** Deno serverless functions (`npm:@base44/sdk`)
- **AI:** Google Gemini, Hugging Face, Perplexity

---

## 📄 License

Proprietary — © Neuronas. All rights reserved.

---

## 🙏 Acknowledgments

Built on the **Base44** platform. Architecture inspired by neuromorphic computing, dual-process cognitive theory, and dopaminergic reinforcement models. Reference: *Neuronas arXiv v13.1*.