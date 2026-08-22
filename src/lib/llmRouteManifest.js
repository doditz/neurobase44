/**
 * llmRouteManifest
 * ----------------
 * Registre déclaratif des actions exposées par chaque route de l'application.
 * Ce manifeste est consommé par <LlmFeed /> pour générer le flux
 * `application/llm+json` invisible (équivalent RSS lisible par un agent LLM).
 *
 * Clé   : segment de route (sans le "/" initial). "" = page d'accueil.
 * Valeur: { description, actions: [{ method, name, description }] }
 *
 * Piège courant : ne jamais y déclarer d'action non implémentée — un agent LLM
 * la tenterait et échouerait. En cas de doute, n'exposer que "GET".
 */

const VIEW_ONLY = (description) => ({
  description,
  actions: [{ method: "GET", name: "view", description: "Consulter la vue" }]
});

export const llmRouteManifest = {
  "": {
    description: "Page d'accueil bilingue : présentation du moteur SMAS et navigation.",
    actions: [
      { method: "GET", name: "view", description: "Consulter la page d'accueil" },
      { method: "GET", name: "switch_language", description: "Basculer entre français et anglais" }
    ]
  },
  Chat: {
    description: "Chat cognitif : débat multi-personas SMAS avec ancrage web.",
    actions: [
      { method: "GET", name: "list_conversations", description: "Lister les conversations" },
      { method: "POST", name: "send_message", description: "Envoyer un message et lancer un débat" },
      { method: "POST", name: "new_conversation", description: "Créer une nouvelle conversation" }
    ]
  },
  Personas: {
    description: "Registre des personas cognitroniques utilisés dans les débats.",
    actions: [
      { method: "GET", name: "list_personas", description: "Lister et filtrer les personas" },
      { method: "POST", name: "update_persona", description: "Modifier un persona existant" }
    ]
  },
  SunoPersonas: VIEW_ONLY("Registre des personas dédiés à la génération musicale Suno."),
  Suno: {
    description: "Architecte de prompts musicaux Suno 5.0.",
    actions: [
      { method: "POST", name: "generate_prompt", description: "Générer un prompt musical structuré" }
    ]
  },
  MemoryExplorer: VIEW_ONLY("Exploration des voies mémorielles et index vectoriels."),
  MemoryVisualization: VIEW_ONLY("Visualisation graphique de la mémoire tiérisée."),
  Benchmark: {
    description: "Bancs d'essai A/B entre SMAS et un LLM de référence.",
    actions: [
      { method: "GET", name: "list_results", description: "Consulter l'historique des bancs d'essai" },
      { method: "POST", name: "run_benchmark", description: "Exécuter un banc d'essai" }
    ]
  },
  BenchmarkAnalytics: VIEW_ONLY("Analytique agrégée des bancs d'essai (SPG, latence, tokens)."),
  ValidationDashboard: VIEW_ONLY("Tableau de bord de validation ancrée et éthique."),
  DevTest: {
    description: "Laboratoire cognitronique : tests de développement du moteur.",
    actions: [
      { method: "GET", name: "list_results", description: "Consulter les résultats de tests" },
      { method: "POST", name: "run_test", description: "Exécuter un test de développement" }
    ]
  },
  DevTestAnalytics: VIEW_ONLY("Analytique des tests de développement."),
  DynamicGradingTest: VIEW_ONLY("Évaluation dynamique de la qualité par LLM grader."),
  NeuronasGauntlet: {
    description: "Gauntlet : test de charge de la pile complète sur scénarios extrêmes.",
    actions: [{ method: "POST", name: "run_gauntlet", description: "Lancer le gauntlet" }]
  },
  PerplexityHistory: VIEW_ONLY("Historique des recherches ancrées avec citations."),
  ResourceMonitoring: VIEW_ONLY("Suivi de la consommation de ressources."),
  VectorRoutingTest: VIEW_ONLY("Test du routage par similarité vectorielle."),
  SelfOptimizationDashboard: VIEW_ONLY("Tableau de bord d'auto-optimisation."),
  PerformanceTracker: VIEW_ONLY("Suivi de performance par modèle et domaine."),
  OptimizationMetricsDashboard: VIEW_ONLY("Centre de métriques d'optimisation."),
  GitHub: {
    description: "Intégrations de dépôts GitHub.",
    actions: [
      { method: "GET", name: "list_integrations", description: "Lister les dépôts connectés" },
      { method: "POST", name: "connect_repository", description: "Connecter un dépôt" },
      { method: "DELETE", name: "remove_integration", description: "Retirer une intégration" }
    ]
  },
  Profile: {
    description: "Profil de l'utilisateur courant.",
    actions: [
      { method: "GET", name: "view", description: "Consulter le profil" },
      { method: "POST", name: "update_profile", description: "Mettre à jour le profil" }
    ]
  },
  CollaborativeWorkspace: {
    description: "Espace de travail collaboratif (commentaires, annotations).",
    actions: [
      { method: "GET", name: "view", description: "Consulter l'espace" },
      { method: "POST", name: "add_comment", description: "Ajouter un commentaire ou une annotation" },
      { method: "DELETE", name: "delete_comment", description: "Supprimer un commentaire" }
    ]
  },
  Home: {
    description: "Alias de la page d'accueil bilingue.",
    actions: [{ method: "GET", name: "view", description: "Consulter la page d'accueil" }]
  },
  index: {
    description: "Route d'index technique (redirection interne).",
    actions: [{ method: "GET", name: "view", description: "Consulter l'index" }]
  },
  HuggingFaceSettings: {
    description: "Configuration de l'intégration Hugging Face (embeddings, analyse sémantique).",
    actions: [
      { method: "GET", name: "view", description: "Consulter la configuration" },
      { method: "POST", name: "update_settings", description: "Mettre à jour la configuration" }
    ]
  },

  // --- Datasets (accès administrateur) ---
  DatasetManager: {
    description: "Gestionnaire central des jeux de données de test et de banc d'essai.",
    access: "admin",
    actions: [
      { method: "GET", name: "list_datasets", description: "Lister les jeux de données" },
      { method: "POST", name: "import_dataset", description: "Importer ou peupler un jeu de données" },
      { method: "DELETE", name: "delete_dataset", description: "Supprimer des enregistrements" }
    ]
  },
  DevTestDatasetBuilder: {
    description: "Constructeur du jeu de données des tests de développement.",
    access: "admin",
    actions: [
      { method: "GET", name: "list_questions", description: "Lister les questions" },
      { method: "POST", name: "create_question", description: "Créer une question de test" },
      { method: "DELETE", name: "delete_question", description: "Supprimer une question" }
    ]
  },
  BenchmarkDatasetBuilder: {
    description: "Constructeur du jeu de données des bancs d'essai.",
    access: "admin",
    actions: [
      { method: "GET", name: "list_questions", description: "Lister les questions de banc d'essai" },
      { method: "POST", name: "create_question", description: "Créer une question de banc d'essai" },
      { method: "DELETE", name: "delete_question", description: "Supprimer une question" }
    ]
  },

  // --- Exécuteurs de tests (accès administrateur) ---
  DevTestRunner: {
    description: "Exécuteur de tests de développement, unitaires ou par lot.",
    access: "admin",
    actions: [
      { method: "GET", name: "list_results", description: "Consulter les résultats" },
      { method: "POST", name: "run_test", description: "Lancer un test ou un lot de tests" }
    ]
  },
  BenchmarkRunner: {
    description: "Exécuteur de bancs d'essai A/B.",
    access: "admin",
    actions: [
      { method: "GET", name: "list_results", description: "Consulter les résultats" },
      { method: "POST", name: "run_benchmark", description: "Lancer un banc d'essai" }
    ]
  },
  BenchmarkTestRunner: {
    description: "Exécuteur de tests de banc d'essai avec journalisation détaillée.",
    access: "admin",
    actions: [
      { method: "GET", name: "list_results", description: "Consulter les résultats" },
      { method: "POST", name: "run_test", description: "Lancer un test unitaire ou par lot" }
    ]
  },

  // --- Tests avancés du moteur (accès administrateur) ---
  SystemPipelineTest: {
    description: "Test d'intégrité du pipeline complet NEURONAS.",
    access: "admin",
    actions: [{ method: "POST", name: "run_pipeline_test", description: "Lancer le test de pipeline" }]
  },
  Phase3JerkFilterTest: {
    description: "Test du filtre de secousse sémantique (dérivée troisième, phase 3).",
    access: "admin",
    actions: [{ method: "POST", name: "run_test", description: "Lancer le test du filtre de secousse" }]
  },
  Phase4EnhancedSMASTest: {
    description: "Test du moteur SMAS enrichi (phase 4).",
    access: "admin",
    actions: [{ method: "POST", name: "run_test", description: "Lancer le test SMAS phase 4" }]
  },
  SMASUpgradeTest: {
    description: "Test de non-régression des mises à niveau SMAS.",
    access: "admin",
    actions: [{ method: "POST", name: "run_test", description: "Lancer le test de mise à niveau" }]
  },
  VectorRoutingTest: {
    description: "Test du routage par similarité vectorielle.",
    actions: [{ method: "POST", name: "run_test", description: "Lancer le test de routage vectoriel" }]
  },
  AutoOptimizationTest: {
    description: "Test du routeur sémantique DSTIB et de l'auto-optimisation.",
    access: "admin",
    actions: [{ method: "POST", name: "run_test", description: "Lancer le test DSTIB" }]
  },

  // --- Administration du noyau (accès administrateur) ---
  AutoOptimization: {
    description: "Boucle d'auto-optimisation des paramètres ajustables.",
    access: "admin",
    actions: [
      { method: "GET", name: "view_parameters", description: "Consulter les paramètres et l'historique" },
      { method: "POST", name: "run_tuning", description: "Lancer un cycle d'auto-réglage" }
    ]
  },
  SystemHealth: {
    description: "État de santé du système et surveillance des composants.",
    access: "admin",
    actions: [
      { method: "GET", name: "view_health", description: "Consulter l'état de santé" },
      { method: "POST", name: "run_health_check", description: "Lancer un contrôle de santé" }
    ]
  },
  SystemMetrics: {
    description: "Métriques système agrégées.",
    access: "admin",
    actions: [{ method: "GET", name: "view_metrics", description: "Consulter les métriques" }]
  },
  SystemDiagnostic: {
    description: "Diagnostic complet du système avec réparation assistée.",
    access: "admin",
    actions: [
      { method: "GET", name: "view_diagnostic", description: "Consulter le dernier diagnostic" },
      { method: "POST", name: "run_diagnostic", description: "Lancer un diagnostic" }
    ]
  },
  RootCauseAnalysis: {
    description: "Analyse de cause racine assistée par IA sur les anomalies détectées.",
    access: "admin",
    actions: [
      { method: "GET", name: "list_analyses", description: "Consulter les analyses" },
      { method: "POST", name: "run_analysis", description: "Lancer une analyse de cause racine" }
    ]
  },
  SystemDocumentation: {
    description: "Documentation technique du système NEURONAS.",
    access: "admin",
    actions: [{ method: "GET", name: "read_documentation", description: "Lire la documentation" }]
  }
};

/**
 * Retourne la description du manifeste pour une route donnée.
 * Repli sûr : vue en lecture seule si la route n'est pas déclarée.
 * @param {string} routeKey segment de route sans "/" initial
 */
export function getRouteManifest(routeKey) {
  return llmRouteManifest[routeKey] ?? VIEW_ONLY("Vue de l'application.");
}