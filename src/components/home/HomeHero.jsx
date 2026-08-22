import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Brain, MessageSquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function HomeHero({ t, lang, onLangChange }) {
  return (
    <section className="relative text-center px-4 pt-10 pb-8 sm:pt-16 sm:pb-12">
      <div
        role="group"
        aria-label="Choix de la langue / Language selection"
        className="absolute top-3 right-3 flex gap-1 bg-slate-800 border border-slate-700 rounded-lg p-0.5"
      >
        {["en", "fr"].map((l) => (
          <button
            key={l}
            type="button"
            lang={l}
            aria-pressed={lang === l}
            aria-label={l === "fr" ? "Français" : "English"}
            onClick={() => onLangChange(l)}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
              lang === l
                ? "bg-emerald-600 text-white"
                : "text-slate-400 hover:text-green-300"
            }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      <div
        aria-hidden="true"
        className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-600 to-green-600 rounded-2xl mb-5 shadow-lg shadow-emerald-900/40"
      >
        <Brain className="w-8 h-8 sm:w-10 sm:h-10 text-slate-900" />
      </div>
      <Badge className="bg-emerald-900/40 text-emerald-400 border border-emerald-700/50 mb-4">
        {t.badge}
      </Badge>
      <h1 className="text-3xl sm:text-5xl font-bold text-green-400 mb-4 leading-tight">
        {t.title}
      </h1>
      <p className="text-slate-400 text-sm sm:text-lg max-w-2xl mx-auto mb-8">
        {t.subtitle}
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link to={createPageUrl("Chat")} className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6">
            <MessageSquare className="w-4 h-4 mr-2" />
            {t.startChat}
          </Button>
        </Link>
        <Link to={createPageUrl("Personas")} className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto border-slate-600 text-green-400 hover:bg-slate-800 hover:text-green-300 px-6">
            {t.explorePersonas}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </section>
  );
}