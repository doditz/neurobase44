import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MessageSquare, Users, Music, Brain, Target, FlaskConical, Zap, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    title: "Cognitive Chat",
    description: "Debate-driven answers via SMAS tri-hemispheric synthesis with live web grounding.",
    icon: MessageSquare,
    page: "Chat",
    accent: "text-emerald-400 bg-emerald-900/30"
  },
  {
    title: "Cognitronic Personas",
    description: "Browse and tune the persona registry powering every debate round.",
    icon: Users,
    page: "Personas",
    accent: "text-green-400 bg-green-900/30"
  },
  {
    title: "Suno AI Architect",
    description: "Generate structured Suno 5.0 music prompts with style and lyric sections.",
    icon: Music,
    page: "Suno",
    accent: "text-purple-400 bg-purple-900/30"
  },
  {
    title: "Memory Explorer",
    description: "Visualize tiered memory pathways, concept nodes and vector indexes.",
    icon: Brain,
    page: "MemoryExplorer",
    accent: "text-cyan-400 bg-cyan-900/30"
  },
  {
    title: "Benchmarks",
    description: "A/B test SMAS against baseline LLMs with SPG scoring and analytics.",
    icon: Target,
    page: "Benchmark",
    accent: "text-orange-400 bg-orange-900/30"
  },
  {
    title: "Cognitronic Lab",
    description: "Dev tests, LLM grading and pipeline experiments for the engine.",
    icon: FlaskConical,
    page: "DevTest",
    accent: "text-yellow-400 bg-yellow-900/30"
  },
  {
    title: "Neuronas Gauntlet",
    description: "Stress-test the full stack across extreme complexity scenarios.",
    icon: Zap,
    page: "NeuronasGauntlet",
    accent: "text-red-400 bg-red-900/30"
  },
  {
    title: "Perplexity Research",
    description: "Review grounded search history with citations and confidence.",
    icon: Search,
    page: "PerplexityHistory",
    accent: "text-blue-400 bg-blue-900/30"
  }
];

export default function FeatureGrid() {
  return (
    <section className="px-4 pb-12 max-w-6xl mx-auto">
      <h2 className="text-lg sm:text-2xl font-semibold text-green-400 mb-4 text-center">
        Explore the Platform
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {features.map((f) => (
          <Link key={f.title} to={createPageUrl(f.page)}>
            <Card className="bg-slate-800 border-slate-700 hover:border-emerald-600/60 transition-colors h-full">
              <CardContent className="p-4">
                <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg mb-3 ${f.accent}`}>
                  <f.icon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-100 mb-1">{f.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{f.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}