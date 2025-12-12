import React from "react";
import { Badge } from "@/components/ui/badge";

function Bar({ value, color = "bg-green-500", label }) {
  const pct = Math.max(0, Math.min(1, Number(value || 0))) * 100;
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
        <span>{label}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-2 bg-slate-200 rounded">
        <div
          className={`h-2 ${color} rounded transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function DebateMetricsDisplay({ metrics }) {
  if (!Array.isArray(metrics) || metrics.length === 0) return null;

  return (
    <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden bg-white">
      <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-700">
        SMAS Debate Metrics
      </div>
      <div className="divide-y divide-slate-200">
        {metrics.map((m) => (
          <div key={m.round_index} className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-slate-800">
                Round {m.round_index}: {m.round_label || "—"}
              </div>
              <Badge variant="outline" className="text-xs">
                Items: {m.items_count || 0}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Bar value={m.d2_level} color="bg-blue-500" label="D2 Level" />
              <Bar value={m.argumentStrengthVariance} color="bg-amber-500" label="Argument Strength Variance" />
              <Bar value={m.consensusDrift} color="bg-emerald-500" label="Consensus Drift" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}