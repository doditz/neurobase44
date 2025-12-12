
import React from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3, Activity, TimerReset } from "lucide-react";
import UnifiedHistory from "@/components/benchmark/UnifiedHistory";
import ExportAllButton from '@/components/benchmark/ExportAllButton';

export default function ValidationDashboardPage() {
  const [loading, setLoading] = React.useState(true);
  const [results, setResults] = React.useState([]);
  const [kpis, setKpis] = React.useState({
    total: 0,
    lastSpg: 0,
    avgSpg: 0,
    modeBWinRate: 0
  });

  const load = async () => {
    setLoading(true);
    const list = await base44.entities.BenchmarkResult.list("-created_date", 200);
    setResults(list);
    if (list.length > 0) {
      const lastSpg = list[0].global_score_performance ?? 0;
      const recent = list.slice(0, Math.min(20, list.length));
      const avgSpg = recent.reduce((s, r) => s + (r.global_score_performance ?? 0), 0) / recent.length;
      const wins = recent.filter(r => r.winner === "mode_b").length;
      setKpis({
        total: list.length,
        lastSpg,
        avgSpg,
        modeBWinRate: recent.length ? (wins / recent.length) : 0
      });
    } else {
      setKpis({
        total: 0, lastSpg: 0, avgSpg: 0, modeBWinRate: 0
      });
    }
    setLoading(false);
  };

  React.useEffect(() => {
    load();
    const id = setInterval(load, 5000); // live update
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-green-400 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Dashboard de Validation des Tests
          </h1>
          <div className="flex gap-2 items-center">
            <ExportAllButton limit={200} />
            <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" /> Mise à jour...
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <TimerReset className="w-3 h-3" /> Auto-refresh 5s
                </span>
              )}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-300 text-sm">Total Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">{kpis.total}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-300 text-sm">Dernier SPG</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-indigo-400">{kpis.lastSpg.toFixed(3)}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-300 text-sm">SPG moyen (20 derniers)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-400">{kpis.avgSpg.toFixed(3)}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-300 text-sm">Win Rate Mode B (20)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-400">{Math.round(kpis.modeBWinRate * 100)}%</div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-green-400 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Historique & Logs Unifiés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UnifiedHistory />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
