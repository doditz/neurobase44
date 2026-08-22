import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Brain, MessageSquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function HomeHero() {
  return (
    <section className="text-center px-4 pt-10 pb-8 sm:pt-16 sm:pb-12">
      <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-600 to-green-600 rounded-2xl mb-5 shadow-lg shadow-emerald-900/40">
        <Brain className="w-8 h-8 sm:w-10 sm:h-10 text-slate-900" />
      </div>
      <Badge className="bg-emerald-900/40 text-emerald-400 border border-emerald-700/50 mb-4">
        NEURONAS v13.1 · Tri-Hemispheric Cognitive Engine
      </Badge>
      <h1 className="text-3xl sm:text-5xl font-bold text-green-400 mb-4 leading-tight">
        Cognitronic OS
      </h1>
      <p className="text-slate-400 text-sm sm:text-lg max-w-2xl mx-auto mb-8">
        A structured multi-agent synthesis platform. Every answer is debated by
        adversarial cognitive personas, grounded in live research, and ethically
        validated before it reaches you.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link to={createPageUrl("Chat")} className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6">
            <MessageSquare className="w-4 h-4 mr-2" />
            Start Cognitive Chat
          </Button>
        </Link>
        <Link to={createPageUrl("Personas")} className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto border-slate-600 text-green-400 hover:bg-slate-800 hover:text-green-300 px-6">
            Explore Personas
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </section>
  );
}