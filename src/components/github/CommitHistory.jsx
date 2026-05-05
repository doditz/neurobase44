import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { fetchGitHubCommits } from '@/functions/fetchGitHubCommits';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
    GitCommit, Loader2, ExternalLink, User, Calendar,
    ChevronLeft, ChevronRight, RefreshCw, GitBranch, BarChart3
} from 'lucide-react';

export default function CommitHistory({ integration }) {
    const [commits, setCommits] = useState([]);
    const [summary, setSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [branch, setBranch] = useState('main');
    const [loaded, setLoaded] = useState(false);

    const loadCommits = async (targetPage = 1) => {
        setIsLoading(true);
        setError(null);

        try {
            const { data } = await fetchGitHubCommits({
                repository_name: integration.repository_name,
                page: targetPage,
                per_page: 20,
                branch
            });

            if (!data.success) {
                throw new Error(data.error || 'Failed to load commits');
            }

            setCommits(data.commits);
            setSummary(data.summary);
            setPage(targetPage);
            setLoaded(true);
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const truncateMessage = (msg) => {
        const firstLine = msg.split('\n')[0];
        return firstLine.length > 80 ? firstLine.substring(0, 77) + '...' : firstLine;
    };

    if (!loaded && !isLoading) {
        return (
            <Card className="bg-slate-800 border-slate-700">
                <CardContent className="py-6">
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <Input
                                value={branch}
                                onChange={(e) => setBranch(e.target.value)}
                                placeholder="Branch (default: main)"
                                className="bg-slate-700 border-slate-600 text-green-300 placeholder:text-slate-500"
                            />
                        </div>
                        <Button
                            onClick={() => loadCommits(1)}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <GitCommit className="w-4 h-4 mr-2" />
                            Load Commit History
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary Stats */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="pt-4 pb-3">
                            <div className="text-xs text-slate-400 mb-1">Commits Loaded</div>
                            <div className="text-2xl font-bold text-green-400">{summary.total_commits}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="pt-4 pb-3">
                            <div className="text-xs text-slate-400 mb-1">Contributors</div>
                            <div className="text-2xl font-bold text-blue-400">{summary.authors?.length || 0}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="pt-4 pb-3">
                            <div className="text-xs text-slate-400 mb-1">Active Days</div>
                            <div className="text-2xl font-bold text-purple-400">
                                {Object.keys(summary.daily_activity || {}).length}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="pt-4 pb-3">
                            <div className="text-xs text-slate-400 mb-1">Top Author</div>
                            <div className="text-sm font-bold text-orange-400 truncate">
                                {summary.authors?.[0]?.name || 'N/A'}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-slate-400" />
                    <Input
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="w-32 h-8 text-xs bg-slate-700 border-slate-600 text-green-300"
                    />
                </div>
                <Button
                    onClick={() => loadCommits(1)}
                    disabled={isLoading}
                    size="sm"
                    variant="outline"
                    className="border-green-600 text-green-400 hover:bg-green-900/30"
                >
                    <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
                <div className="flex items-center gap-1 ml-auto">
                    <Button
                        onClick={() => loadCommits(page - 1)}
                        disabled={isLoading || page <= 1}
                        size="sm"
                        variant="ghost"
                        className="text-slate-400"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-xs text-slate-400 px-2">Page {page}</span>
                    <Button
                        onClick={() => loadCommits(page + 1)}
                        disabled={isLoading || commits.length < 20}
                        size="sm"
                        variant="ghost"
                        className="text-slate-400"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-900/20 border border-red-600/50 rounded-lg text-red-400 text-sm">
                    {error}
                </div>
            )}

            {isLoading && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-green-400" />
                </div>
            )}

            {/* Commit List */}
            {!isLoading && commits.length > 0 && (
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-green-400 text-sm flex items-center gap-2">
                            <GitCommit className="w-4 h-4" />
                            Commit History — {integration.repository_name}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[500px]">
                            <div className="space-y-2">
                                {commits.map((commit) => (
                                    <div
                                        key={commit.full_sha}
                                        className="p-3 bg-slate-900 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-slate-200 font-medium truncate">
                                                    {truncateMessage(commit.message)}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                                    <span className="flex items-center gap-1 text-xs text-slate-400">
                                                        <User className="w-3 h-3" />
                                                        {commit.author_name}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-xs text-slate-500">
                                                        <Calendar className="w-3 h-3" />
                                                        {formatDate(commit.date)}
                                                    </span>
                                                    <Badge variant="outline" className="text-xs font-mono text-green-400 border-green-600/50">
                                                        {commit.sha}
                                                    </Badge>
                                                    {commit.parents_count > 1 && (
                                                        <Badge className="bg-purple-600 text-xs">merge</Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <a
                                                href={commit.html_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-slate-500 hover:text-green-400 transition-colors flex-shrink-0"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            )}

            {!isLoading && loaded && commits.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                    No commits found on branch "{branch}"
                </div>
            )}
        </div>
    );
}