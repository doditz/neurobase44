# 📑 Neuronas — Repository Index

A complete map of the codebase: pages, backend functions, entities, agents, and core libraries.
For a high-level overview, see [`README.md`](./README.md).

---

## 🖥️ Pages (`src/pages/`)

### Main
| Page | Description |
|------|-------------|
| `Home` | Landing / dashboard entry |
| `Profile` | User profile & preferences |
| `CollaborativeWorkspace` | Shared workspace, comments & annotations |

### Cognitive Interface
| Page | Description |
|------|-------------|
| `Chat` | Primary SMAS debate chat (Mode B cognitive OS) |
| `Suno` | Suno AI music-prompt architect |
| `PerplexityHistory` | External knowledge search history |

### Personas
| Page | Description |
|------|-------------|
| `Personas` | Cognitronic persona library manager |
| `SunoPersonas` | Suno-specific persona manager |

### Memory
| Page | Description |
|------|-------------|
| `MemoryVisualization` | Memory graph & tier visualization |
| `MemoryExplorer` | Browse memory pathways & nodes |

### Benchmarks
| Page | Description |
|------|-------------|
| `Benchmark` | Benchmark execution console |
| `BenchmarkAnalytics` | Aggregated benchmark analytics |
| `ValidationDashboard` | Validation metrics dashboard |

### Cognitronic Lab (DevTest)
| Page | Description |
|------|-------------|
| `DevTest` | Development A/B test console |
| `DevTestAnalytics` | DevTest result analytics |
| `DynamicGradingTest` | LLM grader testing |

### Tools
| Page | Description |
|------|-------------|
| `GitHub` | GitHub repo integration & commit analysis |
| `ResourceMonitoring` | System resource usage |
| `NeuronasGauntlet` | Full-stack stress test |
| `VectorRoutingTest` | Vector similarity routing test |
| `SelfOptimizationDashboard` | Live parameter tuning |
| `PerformanceTracker` | Model performance tracking |
| `OptimizationMetricsDashboard` | Optimization metrics hub |

### Admin (role: admin)
| Group | Pages |
|-------|-------|
| **Datasets** | `DatasetManager`, `DevTestDatasetBuilder`, `BenchmarkDatasetBuilder` |
| **Test Runners** | `DevTestRunner`, `BenchmarkRunner`, `BenchmarkTestRunner` |
| **Advanced Tests** | `SystemPipelineTest`, `Phase3JerkFilterTest`, `Phase4EnhancedSMASTest`, `SMASUpgradeTest` |
| **Kernel Admin** | `SystemHealth`, `SystemMetrics`, `RootCauseAnalysis`, `SystemDiagnostic`, `SystemDocumentation`, `AutoOptimization`, `AutoOptimizationTest` |

---

## ⚡ Backend Functions (`src/functions/`)

### Orchestration
`chatOrchestrator` · `chatOrchestratorFast` · `neuronasOrchestrator` · `qronasDispatcherV47` · `raidCognitiveController`

### Cognitive Core (D³STIB / D2 / SMAS / QRONAS)
`dstibSemanticProcessor` · `dstibHebdenRouter` · `d3stibAnalyzer` · `d3stibOptimizer` · `d2stimModulator` · `dopamineModulator` · `smasHemisphericDebate` · `hemisphereDynamics` · `gcHarmonizer` · `globalStateCalculator` · `systemStateManager` · `qronasEngine` · `qronasSimulator` · `semanticJerkFilter`

### Validation & Ethics (BRONAS)
`groundedValidationEngine` · `groundingValidator` · `bronasValidator` · `bronasEthicalValidator` · `cognitiveValidator` · `invariantValidator` · `initializeBronasRulebook`

### Personas
`personaTeamOptimizer` · `dynamicPersonaAdapter` · `personaFatigueTracker` · `personaCleanupService`

### Memory
`smasMemoryManager` · `memorySemanticSearch` · `memoryTierPromotion` · `neuronasMemoryTierRouter` · `predictiveMemoryRetrieval` · `vectorMemorySearch` · `buildVectorMemoryIndex` · `crossHemispherePathwayGenerator` · `decayUnusedPathways` · `memoryContextSummarizer` · `sessionContextSummarizer`

### Benchmarking & Optimization
`benchmarkOrchestrator` · `benchmarkRunner` · `benchmarkAutomator` · `benchmarkAnalytics` · `benchmarkQuestionGenerator` · `calculateSPG` · `spgFeedbackLoop` · `autoTuningLoop` · `selfTuningEngine` · `realtimeParameterTuner` · `parameterSensitivityAnalysis` · `strategySelector` · `applyOptimizationStrategy` · `performanceOptimizer` · `performancePredictor` · `performanceMonitor` · `ensemblePredictionEngine` · `evaluateResponseQuality` · `analyzeDevTestResults` · `runNeuronasGauntlet`

### Intelligence & Analysis
`intentAnalyzer` · `smarceScorer` · `systemEntropyCalculator` · `debateAnalyzer` · `sarcasmDetector` · `biasRewardCalculator`

### Knowledge & Embeddings
`generateEmbedding` · `huggingFaceEmbeddings` · `huggingFaceSemanticAnalysis` · `huggingFaceSentiment` · `vectorSimilarityRouter` · `externalKnowledgeSearch` · `perplexitySearch` · `distributeUniverseTeacherKnowledge` · `factualCacheManager` · `semanticCompressor`

### System Health & Repair
`systemHealthMonitor` · `batchHealthCheck` · `scheduledHealthCheck` · `neuronasSystemDiagnostic` · `diagnosticReport` · `anomalyDetector` · `rootCauseAnalyzer` · `autoRepairEngine` · `autoRepairService` · `adaptivePruner` · `alertingEngine` · `alertingService`

### Data & Utilities
`populateDatasets` · `populateEthicalBenchmarks` · `fetchEthicsDataset` · `fetchUNESCOEthics` · `fixDatasetLoading` · `estimateTokensAndCost` · `getCurrentAPIPricing` · `exportAllBenchmarks` · `exportAllDevTests` · `exportBatchReport` · `exportBenchmarkData` · `migrateToUnifiedLog` · `unifiedLogManager` · `reassignConversationHistory` · `retryWithBackoff` · `streamTestLogs`

### Integrations
`fetchGitHubCommits` · `googleAI`

### Test Harnesses
`pipelineTestRunner` · `testPhase3JerkFilter` · `testPhase4EnhancedSMAS` · `testSMASDynamics` · `testVectorRouting`

---

## 🗃️ Entities (`src/entities/`)

### Cognitive Configuration
| Entity | Purpose |
|--------|---------|
| `Persona` | Neuromorphic persona profiles (v6.2.0) |
| `PersonaConfiguration` | System-specific persona instructions |
| `TunableParameter` | Adjustable cognitive parameters |
| `DSTIBConfig` | Semantic tier routing config |
| `SPGConfiguration` | SPG scoring formula config |
| `BRONASRules` / `BronasValidationRules` | Ethical validation rules |
| `QRONASState` · `SystemState` · `SystemInvariant` | Runtime state |

### Conversations & Memory
| Entity | Purpose |
|--------|---------|
| `Debate` | Chat/debate conversation records |
| `SystemMemory` · `UserMemory` · `MemoryPathway` · `ConceptNode` · `VectorIndex` | Memory layers |
| `UserInteractionContext` · `ToneAnalysis` | Interaction context |

### Benchmarking & Results
| Entity | Purpose |
|--------|---------|
| `BenchmarkQuestion` · `BenchmarkResult` | Benchmark dataset & results |
| `DevTestQuestion` · `DevTestResult` | DevTest dataset & results |
| `GauntletResult` · `ModelPerformanceRecord` · `ValidationMetrics` | Performance records |
| `BatchRunProgress` · `UnifiedLog` | Run tracking & unified logging |
| `OptimizationStrategy` · `ConfigVersion` · `PerformanceBaseline` | Optimization |
| `AlertThreshold` · `AlertHistory` · `AnomalyDetection` · `RootCauseAnalysis` | Monitoring |

### Knowledge & Models
| Entity | Purpose |
|--------|---------|
| `AIModel` · `ArxivKnowledge` · `PerplexitySearch` · `APICostConfig` · `ResourceUsage` | Reference data |

### Collaboration & Integrations
| Entity | Purpose |
|--------|---------|
| `Team` · `SharedWorkspace` · `Comment` · `Annotation` | Collaboration |
| `GitHubIntegration` · `CodeContext` | GitHub integration |
| `UserBudget` | Usage budgeting |
| `DebateAnalysis` | Debate post-analysis |

---

## 🤖 Agents (`src/agents/`)

| Agent | Purpose |
|-------|---------|
| `smas_debater` | Tri-hemispheric persona debate engine |
| `suno_prompt_architect` | Structured Suno music prompt generation |
| `qronas_dispatcher` | Quantum-inspired query dispatch |

---

## 📚 Core Libraries (`src/lib/`)

| File | Purpose |
|------|---------|
| `AuthContext.jsx` | Authentication state & login flow |
| `query-client.js` | TanStack Query client instance |
| `NavigationTracker.jsx` | Route navigation tracking |
| `VisualEditAgent.jsx` | Visual editing support |
| `utils.js` | Shared helpers (`cn`, etc.) |
| `app-params.js` | App parameter helpers |

---

## 🧩 Notable Components (`src/components/`)

| Group | Highlights |
|-------|-----------|
| `chat/` | `ChatInterface`, `MessageBubble`, `SettingsPanel`, `DebateFlowVisualization` |
| `benchmark/` | `UnifiedHistory`, `BatchProgressTracker`, `DebateVisualizationModal` |
| `personas/` | `PersonaCard`, `PersonaEditModal` |
| `memory/` | `MemoryGraph`, `MemoryPathwayExplorer`, `MemoryTierStats` |
| `core/` | `NeuronasLogger`, `UnifiedTestRunner`, `UnifiedLogDisplay` |
| `debug/` | `UnifiedLogViewer`, `LogViewer` |
| `optimization/` | `RealtimeTuningPanel`, `ConfigurableTestPanel`, `StrategyDryRunAnalyzer` |
| `ui/` | shadcn/ui primitives |