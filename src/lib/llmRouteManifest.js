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