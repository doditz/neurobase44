import React from "react";

const stepNumbers = ["01", "02", "03", "04"];

export default function HowItWorks({ t }) {
  return (
    <section className="px-4 pb-14 max-w-5xl mx-auto">
      <h2 className="text-lg sm:text-2xl font-semibold text-green-400 mb-4 text-center">
        {t.howTitle}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {t.steps.map((s, i) => (
          <div key={stepNumbers[i]} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <div className="text-emerald-500 font-mono text-xs mb-2">{stepNumbers[i]}</div>
            <h3 className="text-sm font-semibold text-slate-100 mb-1">{s.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{s.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}