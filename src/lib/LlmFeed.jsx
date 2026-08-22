import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { pagesConfig } from "@/pages.config";
import { getRouteManifest } from "@/lib/llmRouteManifest";

const FEED_ID = "llm-rss-feed";

/**
 * Construit le document de flux (équivalent <channel> + <item> d'un RSS).
 * @param {string} pathname chemin courant fourni par react-router
 * @returns {object} document JSON sérialisable
 */
function buildFeed(pathname) {
  const routeKeys = ["", ...Object.keys(pagesConfig.Pages ?? {})];
  const currentKey = pathname.replace(/^\/+/, "");
  const current = getRouteManifest(currentKey);
  const params = Object.fromEntries(new URLSearchParams(window.location.search));

  return {
    version: "1.0",
    generated_at: new Date().toISOString(),
    // --- channel : état actuel de la vue ---
    channel: {
      app: "Cognitronic OS — NEURONAS v13.1",
      language: document.documentElement.lang || "fr",
      current_path: pathname,
      current_view: currentKey || "home",
      current_view_description: current.description,
      current_view_access: current.access ?? "authenticated",
      query_params: params,
      available_actions: current.actions
    },
    // --- guide de navigation destiné aux agents LLM ---
    navigation: {
      how_to_navigate:
        "Application SPA : suivre les chemins de `available_routes` (react-router). Ce flux est régénéré à chaque navigation, sans rechargement.",
      route_count: routeKeys.length,
      home_path: "/",
      language_switch: "Sélecteur FR/EN sur la page d'accueil (français par défaut, loi 101)."
    },
    // --- items : toutes les routes navigables ---
    available_routes: routeKeys.map((key) => {
      const manifest = getRouteManifest(key);
      return {
        path: `/${key}`,
        view: key || "home",
        description: manifest.description,
        access: manifest.access ?? "authenticated",
        is_current: key === currentKey,
        actions: manifest.actions
      };
    })
  };
}

/**
 * <LlmFeed />
 * Injecte et maintient un flux `application/llm+json` invisible dans le <body>.
 * Le contenu est régénéré à chaque navigation SPA, sans rechargement de page,
 * afin qu'un agent LLM puisse toujours lire l'état courant et les actions
 * disponibles. Ne rend aucun élément visible.
 *
 * Sécurité : n'expose que des métadonnées de navigation publiques — jamais de
 * données utilisateur, de jetons ou de secrets.
 */
export default function LlmFeed() {
  const location = useLocation();

  useEffect(() => {
    let node = document.getElementById(FEED_ID);
    if (!node) {
      node = document.createElement("script");
      node.id = FEED_ID;
      node.type = "application/llm+json";
      node.setAttribute("aria-hidden", "true");
      node.style.display = "none";
      document.body.appendChild(node);
    }
    node.textContent = JSON.stringify(buildFeed(location.pathname), null, 2);
  }, [location.pathname, location.search]);

  return null;
}