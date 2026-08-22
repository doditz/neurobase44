import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MessageSquare, Users, Music, Brain, Target, FlaskConical, Zap, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const featureMeta = [
  { icon: MessageSquare, page: "Chat", accent: "text-emerald-400 bg-emerald-900/30" },
  { icon: Users, page: "Personas", accent: "text-green-400 bg-green-900/30" },
  { icon: Music, page: "Suno", accent: "text-purple-400 bg-purple-900/30" },
  { icon: Brain, page: "MemoryExplorer", accent: "text-cyan-400 bg-cyan-900/30" },
  { icon: Target, page: "Benchmark", accent: "text-orange-400 bg-orange-900/30" },
  { icon: FlaskConical, page: "DevTest", accent: "text-yellow-400 bg-yellow-900/30" },
  { icon: Zap, page: "NeuronasGauntlet", accent: "text-red-400 bg-red-900/30" },
  { icon: Search, page: "PerplexityHistory", accent: "text-blue-400 bg-blue-900/30" }
];

export default function FeatureGrid({ t }) {
  return (
    <section className="px-4 pb-12 max-w-6xl mx-auto" aria-labelledby="explore-heading">
      <h2 id="explore-heading" className="text-lg sm:text-2xl font-semibold text-green-400 mb-4 text-center">
        {t.exploreTitle}
      </h2>
      <nav
        aria-label="Sections de la plateforme"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        {featureMeta.map((meta, i) => (
          <Link key={meta.page} to={createPageUrl(meta.page)} title={t.features[i].title}>
            <Card className="bg-slate-800 border-slate-700 hover:border-emerald-600/60 transition-colors h-full">
              <CardContent className="p-4">
                <div aria-hidden="true" className={`inline-flex items-center justify-center w-9 h-9 rounded-lg mb-3 ${meta.accent}`}>
                  <meta.icon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-100 mb-1">{t.features[i].title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{t.features[i].description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </nav>
    </section>
  );
}