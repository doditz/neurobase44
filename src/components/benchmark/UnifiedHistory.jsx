import React from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Filter, BarChart3, Trophy, Clock, RefreshCw, Download } from "lucide-react";
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from "@/components/ui/button"; // Added import for Button component
import UnifiedLogViewer from "../debug/UnifiedLogViewer";
import BenchmarkComparison from "./BenchmarkComparison";

export default function UnifiedHistory() {
  const [benchmarks, setBenchmarks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [winner, setWinner] = React.useState("all");
  const [refreshing, setRefreshing] = React.useState(false);
  const [exportingId, setExportingId] = React.useState(null); // New state for managing export loading

  const load = async () => {
    setLoading(true);
    const results = await base44.entities.DevTestResult.list("-created_date", 200);
    setBenchmarks(results);
    if (!selected && results.length > 0) setSelected(results[0]);
    setLoading(false);
  };

  React.useEffect(() => {
    load();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleExportBenchmark = async (benchmarkId, format) => {
    setExportingId(benchmarkId);
    try {
      toast.info(`Export ${format.toUpperCase()}...`);

      const response = await base44.functions.invoke('exportBenchmarkData', {
        benchmark_id: benchmarkId,
        format
      });

      if (!response.data) {
        throw new Error('No data received from export function.');
      }

      const blob = new Blob([response.data], {
        type: format === 'json' ? 'application/json' :
              format === 'md' ? 'text/markdown' :
              format === 'pdf' ? 'text/html' : 'text/plain'
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `benchmark_${benchmarkId}.${format === 'pdf' ? 'html' : format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success(`✅ Export téléchargé !`);
    } catch (error) {
      console.error('[Export] Error:', error);
      toast.error(`Erreur lors de l'exportation: ${error.message}`);
    } finally {
      setExportingId(null);
    }
  };

  const filtered = benchmarks.filter((b) => {
    const s = search.toLowerCase();
    const sMatch =
      !s ||
      (b.scenario_name || "").toLowerCase().includes(s) ||
      (b.test_prompt || "").toLowerCase().includes(s);
    const cMatch = category === "all" || b.scenario_category === category;
    const wMatch = winner === "all" || b.winner === winner;
    return sMatch && cMatch && wMatch;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <Card className="lg:col-span-4 bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-green-400 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Tests Dev ({benchmarks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Recherche scénario ou prompt..."
                className="pl-8 bg-slate-900 border-slate-700 text-slate-300 h-9"
              />
            </div>
            <button
              onClick={onRefresh}
              className="px-3 py-2 text-xs rounded bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600"
              title="Rafraîchir"
            >
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-300 h-9">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="creative">Créative</SelectItem>
                <SelectItem value="analytical">Analytique</SelectItem>
                <SelectItem value="ethical">Éthique</SelectItem>
                <SelectItem value="technical">Technique</SelectItem>
                <SelectItem value="suno_music">Suno</SelectItem>
                <SelectItem value="neuronas_specific">Neuronas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={winner} onValueChange={setWinner}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-300 h-9">
                <SelectValue placeholder="Gagnant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="mode_b">Mode B</SelectItem>
                <SelectItem value="mode_a">Mode A</SelectItem>
                <SelectItem value="tie">Égalité</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <Filter className="w-3 h-3" /> Filtres actifs
          </div>

          <ScrollArea className="h-[520px]">
            <div className="space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-green-400" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-slate-400 text-sm py-6 text-center">Aucun test trouvé</div>
              ) : (
                filtered.map((b) => (
                  <div key={b.id} className="relative group">
                    <button
                      onClick={() => setSelected(b)}
                      className={`w-full text-left p-3 rounded-lg border ${
                        selected?.id === b.id
                          ? "bg-slate-700 border-green-600"
                          : "bg-slate-900 border-slate-700 hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-slate-200">{b.scenario_name || 'Sans titre'}</div>
                        <Badge className={
                          b.winner === 'mode_b' ? 'bg-green-600' :
                          b.winner === 'mode_a' ? 'bg-orange-600' : 'bg-gray-600'
                        }>
                          {b.winner || 'N/A'}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 line-clamp-2">{b.test_prompt}</div>
                      <div className="mt-2 flex gap-2 text-[11px] text-slate-400">
                        <span>SPG: <span className="text-slate-200">{(b.global_score_performance ?? 0).toFixed(3)}</span></span>
                        <span>•</span>
                        <span>
                          <Clock className="w-3 h-3 inline -mt-0.5 mr-1" />
                          B: {(b.mode_b_time_ms ?? 0)}ms
                        </span>
                        <span>•</span>
                        <span>Δ: {(b.performance_improvement ?? 0).toFixed(1)}%</span>
                      </div>
                    </button>

                    {/* Export dropdown - appears on hover */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 bg-slate-800 hover:bg-slate-700"
                            disabled={exportingId === b.id}
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-slate-800 border-slate-700">
                          <DropdownMenuLabel className="text-green-400 text-xs">Export</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-slate-700" />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportBenchmark(b.id, 'json');
                            }}
                            className="text-slate-200 hover:bg-slate-700 cursor-pointer text-xs"
                          >
                            JSON
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportBenchmark(b.id, 'md');
                            }}
                            className="text-slate-200 hover:bg-slate-700 cursor-pointer text-xs"
                          >
                            MD
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportBenchmark(b.id, 'txt');
                            }}
                            className="text-slate-200 hover:bg-slate-700 cursor-pointer text-xs"
                          >
                            TXT
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportBenchmark(b.id, 'pdf');
                            }}
                            className="text-slate-200 hover:bg-slate-700 cursor-pointer text-xs"
                          >
                            PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="lg:col-span-8 space-y-4">
        {selected && (
          <>
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-green-400 flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Détails Test Dev
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 rounded bg-slate-900 border border-slate-700">
                    <div className="text-xs text-slate-400 mb-1">Score de Performance Global</div>
                    <div className="text-2xl font-bold text-green-400">{(selected.global_score_performance ?? 0).toFixed(3)}</div>
                  </div>
                  <div className="p-3 rounded bg-slate-900 border border-slate-700">
                    <div className="text-xs text-slate-400 mb-1">Temps Mode B</div>
                    <div className="text-2xl font-bold text-blue-400">{(selected.mode_b_time_ms ?? 0)} ms</div>
                  </div>
                  <div className="p-3 rounded bg-slate-900 border border-slate-700">
                    <div className="text-xs text-slate-400 mb-1">Tokens Mode B</div>
                    <div className="text-2xl font-bold text-purple-400">{(selected.mode_b_token_count ?? 0)}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <BenchmarkComparison benchmark={selected} />
                </div>
              </CardContent>
            </Card>
          </>
        )}
        {!selected && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="py-10 text-center text-slate-400">
              Sélectionnez un test à gauche pour voir les détails.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}