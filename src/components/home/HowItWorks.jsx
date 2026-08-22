import React from "react";

const steps = [
  {
    step: "01",
    title: "D³STIB Semantic Filter",
    description: "Your query is analyzed for complexity, semantic tier and hemispheric routing."
  },
  {
    step: "02",
    title: "Adversarial Debate",
    description: "Analytical, creative and contrarian personas debate across mandatory cross-examination rounds."
  },
  {
    step: "03",
    title: "Grounded Validation",
    description: "Claims are verified against live web sources and the BRONAS ethical rulebook."
  },
  {
    step: "04",
    title: "Central Synthesis",
    description: "A principled final position is synthesized — with a full transparency audit log."
  }
];

export default function HowItWorks() {
  return (
    <section className="px-4 pb-14 max-w-5xl mx-auto">
      <h2 className="text-lg sm:text-2xl font-semibold text-green-400 mb-4 text-center">
        How SMAS Works
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {steps.map((s) => (
          <div key={s.step} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <div className="text-emerald-500 font-mono text-xs mb-2">{s.step}</div>
            <h3 className="text-sm font-semibold text-slate-100 mb-1">{s.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{s.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}