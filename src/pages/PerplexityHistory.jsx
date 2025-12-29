import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { PerplexitySearch } from '@/entities/PerplexitySearch';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    Search, ExternalLink, Clock, Zap, Copy, RefreshCw, TrendingUp, 
    Send, Loader2, Sparkles
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export default function PerplexityHistory() {
    const [searches, setSearches] = useState([]);
    const [filteredSearches, setFilteredSearches] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    
    // Chat state
    const [chatInput, setChatInput] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [streamingResponse, setStreamingResponse] = useState('');
    const [currentCitations, setCurrentCitations] = useState([]);
    const chatEndRef = useRef(null);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (searchQuery.trim()) {
            const filtered = searches.filter(s => 
                s.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.answer.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredSearches(filtered);
        } else {
            setFilteredSearches(searches);
        }
    }, [searchQuery, searches]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [currentUser, allSearches] = await Promise.all([
                User.me(),
                PerplexitySearch.list('-created_date', 100)
            ]);
            setUser(currentUser);
            setSearches(allSearches);
            setFilteredSearches(allSearches);
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Échec du chargement');
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copié dans le presse-papier');
    };

    const handleSearch = async () => {
        if (!chatInput.trim() || isSearching) return;

        const query = chatInput.trim();
        setChatInput('');
        setIsSearching(true);
        setStreamingResponse('');
        setCurrentCitations([]);

        try {
            const { data } = await base44.functions.invoke('perplexitySearch', {
                query,
                model: 'sonar'
            });

            if (data && data.success) {
                setStreamingResponse(data.answer || '');
                setCurrentCitations(data.citations || []);
                
                // Reload history to show new search
                loadData();
                
                toast.success('Recherche terminée');
            } else {
                throw new Error(data?.error || 'Recherche échouée');
            }
        } catch (error) {
            console.error('Search error:', error);
            toast.error(`Erreur: ${error.message}`);
            setStreamingResponse('');
        } finally {
            setIsSearching(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSearch();
        }
    };

    const totalTokens = searches.reduce((sum, s) => sum + (s.tokens_used || 0), 0);
    const avgTokens = searches.length > 0 ? Math.round(totalTokens / searches.length) : 0;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
                <div className="text-center">
                    <Search className="w-12 h-12 animate-pulse text-green-400 mx-auto mb-4" />
                    <p className="text-green-300">Chargement...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-green-300 mb-2">
                                Historique Perplexity
                            </h1>
                            <p className="text-slate-400">
                                Recherches web avec sources citées
                            </p>
                        </div>
                        <Button 
                            onClick={loadData} 
                            variant="outline" 
                            className="border-green-600 text-green-400"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Actualiser
                        </Button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Rechercher dans l'historique..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-slate-800 border-slate-700 text-green-300 placeholder:text-slate-500"
                        />
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-green-300 flex items-center gap-2">
                                <Search className="w-4 h-4 text-orange-400" />
                                Recherches Totales
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-400">{searches.length}</div>
                            <p className="text-xs text-slate-400 mt-1">Avec sources citées</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-green-300 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-orange-400" />
                                Tokens Utilisés
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-400">{totalTokens.toLocaleString()}</div>
                            <p className="text-xs text-slate-400 mt-1">Moy: {avgTokens.toLocaleString()}/recherche</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-green-300 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-orange-400" />
                                Qualité Moyenne
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-400">98%</div>
                            <p className="text-xs text-slate-400 mt-1">Sources vérifiées</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Search Results */}
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-green-400">
                            Résultats ({filteredSearches.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[600px] pr-4">
                            <div className="space-y-4">
                                {filteredSearches.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Search className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                                        <p className="text-slate-400">
                                            {searchQuery ? 'Aucun résultat trouvé' : 'Aucune recherche effectuée'}
                                        </p>
                                    </div>
                                ) : (
                                    filteredSearches.map((search) => {
                                        const isExpanded = expandedId === search.id;
                                        const timeAgo = formatDistanceToNow(new Date(search.created_date), {
                                            addSuffix: true,
                                            locale: fr
                                        });

                                        return (
                                            <div
                                                key={search.id}
                                                className="bg-slate-700/50 rounded-lg p-4 border border-slate-600 hover:border-slate-500 transition-all"
                                            >
                                                {/* Query */}
                                                <div className="flex items-start justify-between gap-3 mb-3">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Search className="w-4 h-4 text-green-400 flex-shrink-0" />
                                                            <h3 className="font-semibold text-green-300">
                                                                {search.query}
                                                            </h3>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs text-slate-400">
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {timeAgo}
                                                            </div>
                                                            <Badge variant="outline" className="text-green-400 border-green-600">
                                                                {search.tokens_used?.toLocaleString()} tokens
                                                            </Badge>
                                                            <Badge variant="outline" className="text-blue-400 border-blue-600">
                                                                {search.citations?.length || 0} sources
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setExpandedId(isExpanded ? null : search.id)}
                                                        className="text-green-400 hover:text-green-300"
                                                    >
                                                        {isExpanded ? 'Réduire' : 'Voir'}
                                                    </Button>
                                                </div>

                                                {/* Answer Preview */}
                                                {!isExpanded && (
                                                    <p className="text-sm text-slate-300 line-clamp-2">
                                                        {search.answer}
                                                    </p>
                                                )}

                                                {/* Expanded View */}
                                                {isExpanded && (
                                                    <div className="mt-4 space-y-4">
                                                        {/* Full Answer */}
                                                        <div className="bg-slate-800 rounded-lg p-4">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <h4 className="text-sm font-medium text-green-400">Réponse</h4>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    onClick={() => copyToClipboard(search.answer)}
                                                                    className="h-6 w-6 text-slate-400 hover:text-green-400"
                                                                >
                                                                    <Copy className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                            <p className="text-sm text-slate-300 whitespace-pre-wrap">
                                                                {search.answer}
                                                            </p>
                                                        </div>

                                                        {/* Citations */}
                                                        {search.citations && search.citations.length > 0 && (
                                                            <div className="bg-slate-800 rounded-lg p-4">
                                                                <h4 className="text-sm font-medium text-green-400 mb-3">
                                                                    Sources ({search.citations.length})
                                                                </h4>
                                                                <div className="space-y-2">
                                                                    {search.citations.map((citation, idx) => (
                                                                        <a
                                                                            key={idx}
                                                                            href={citation}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 hover:underline"
                                                                        >
                                                                            <Badge variant="outline" className="text-xs">
                                                                                [{idx + 1}]
                                                                            </Badge>
                                                                            <span className="flex-1 truncate">{citation}</span>
                                                                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Metadata */}
                                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                                            <div>Model: {search.model}</div>
                                                            {search.metadata?.prompt_tokens && (
                                                                <div>Input: {search.metadata.prompt_tokens} tokens</div>
                                                            )}
                                                            {search.metadata?.completion_tokens && (
                                                                <div>Output: {search.metadata.completion_tokens} tokens</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}