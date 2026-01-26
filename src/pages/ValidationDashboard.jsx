import React from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3, Activity, TimerReset } from "lucide-react";
import UnifiedHistory from "@/components/benchmark/UnifiedHistory";
import ExportAllButton from '@/components/benchmark/ExportAllButton';
import UnifiedLogDisplay from '@/components/core/UnifiedLogDisplay';
import { toast } from 'sonner';

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
    try {
      const list = await base44.entities.BenchmarkResult.list("-created_date", 200);
      setResults(list);
      
      console.log('[ValidationDashboard] Loaded benchmarks:', list.length);
      
      if (list.length > 0) {
        const lastSpg = list[0].global_score_performance ?? 0;
        const recent = list.slice(0, Math.min(20, list.length));
        
        // FIXED: Proper averaging calculation
        const spgSum = recent.reduce((s, r) => s + (r.global_score_performance ?? 0), 0);
        const avgSpg = recent.length > 0 ? (spgSum / recent.length) : 0;
        
        const wins = recent.filter(r => r.winner === "mode_b").length;
        const winRate = recent.length > 0 ? (wins / recent.length) : 0;
        
        console.log('[ValidationDashboard] KPIs:', { 
          total: list.length, 
          lastSpg, 
          avgSpg, 
          winRate,
          recentCount: recent.length,
          wins 
        });
        
        setKpis({
          total: list.length,
          lastSpg,
          avgSpg,
          modeBWinRate: winRate
        });
      } else {
        console.log('[ValidationDashboard] No data found');
        setKpis({
          total: 0, lastSpg: 0, avgSpg: 0, modeBWinRate: 0
        });
      }
    } catch (error) {
      console.error('[ValidationDashboard] Load error:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
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
              <div className="text-3xl font-bold text-purple-400">
                {Math.round(kpis.modeBWinRate * 100)}%
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {results.slice(0, 20).filter(r => r.winner === 'mode_b').length} / {Math.min(20, results.length)} récents
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Real-time data display */}
        {results.length > 0 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-green-400 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Derniers Tests ({results.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {results.slice(0, 10).map((r) => (
                  <div key={r.id} className="p-3 bg-slate-900 border border-slate-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-200">{r.scenario_name}</span>
                      <Badge className={r.winner === 'mode_b' ? 'bg-green-600' : 'bg-orange-600'}>
                        {r.winner}
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-xs text-slate-400">
                      <span>SPG: <span className="text-green-400">{(r.global_score_performance ?? 0).toFixed(3)}</span></span>
                      <span>Temps: {(r.mode_b_time_ms ?? 0)}ms</span>
                      <span>Tokens: {r.mode_b_token_count ?? 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {results.length === 0 && !loading && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-12 text-center">
              <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-400 mb-2">
                Aucun Test Disponible
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Lancez des tests depuis DevTest ou DynamicGradingTest
              </p>
            </CardContent>
          </Card>
        )}

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

        {/* Unified Log Display from UnifiedLog entity */}
        <UnifiedLogDisplay
          title="Logs Consolidés - Toutes Sources"
          limit={50}
          showFilters={true}
          showSearch={true}
          collapsible={true}
          maxHeight="400px"
        />
      </div>
    </div>
  );
}