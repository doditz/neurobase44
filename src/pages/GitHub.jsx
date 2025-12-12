import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { GitHubIntegration } from '@/entities/GitHubIntegration';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Github, 
    GitBranch, 
    FileCode, 
    MessageSquare, 
    AlertCircle,
    CheckCircle,
    Plus,
    ExternalLink,
    Settings,
    Lock,
    Key,
    Eye,
    EyeOff,
    Trash2, // Added for remove button
    XCircle // Added for write permission warning
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

export default function GitHubPage() {
    const [user, setUser] = useState(null);
    const [integrations, setIntegrations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRepo, setSelectedRepo] = useState(''); // This state is currently unused, consider removing if not needed.
    const [repoUrl, setRepoUrl] = useState('');
    const [githubToken, setGithubToken] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [showToken, setShowToken] = useState(false);
    const [integrationType, setIntegrationType] = useState('personal_token');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const currentUser = await User.me();
            setUser(currentUser);
            
            const userIntegrations = await GitHubIntegration.filter({ user_id: currentUser.id });
            setIntegrations(userIntegrations);
        } catch (error) {
            console.error('Failed to load data:', error);
        }
        setIsLoading(false);
    };

    const handleConnectGitHub = () => {
        const githubAppUrl = `https://github.com/apps/neuronas-ai/installations/new`;
        window.open(githubAppUrl, '_blank');
    };

    const handleAddRepository = async () => {
        if (!repoUrl.trim()) return;
        
        if (isPrivate && !githubToken.trim()) {
            alert('Private repositories require a GitHub Personal Access Token');
            return;
        }
        
        try {
            const repoName = repoUrl.replace(/https:\/\/github\.com\//, '').replace(/\.git$/, '');
            
            await GitHubIntegration.create({
                user_id: user.id,
                integration_type: integrationType,
                installation_id: integrationType === 'app' ? `install_${Date.now()}` : null,
                repository_name: repoName,
                repository_url: repoUrl,
                is_private: isPrivate,
                access_token_encrypted: githubToken || null,
                permissions: ['read', 'write', 'issues', 'pull_requests'],
                is_active: true
            });

            // Security best practice: Clear sensitive data from state immediately
            setRepoUrl('');
            setGithubToken('');
            setIsPrivate(false);
            setShowToken(false); // Clear token visibility state
            loadData();
        } catch (error) {
            console.error('Failed to add repository:', error);
            alert('Failed to add repository. Please check your details and try again.');
        }
    };

    const handleRemoveRepository = async (integration) => {
        if (!confirm(`Remove integration for ${integration.repository_name}?\n\nThis will delete the stored access token and stop AI analysis for this repository.`)) {
            return;
        }

        try {
            await GitHubIntegration.delete(integration.id);
            loadData();
        } catch (error) {
            console.error('Failed to remove repository:', error);
            // Handle 404 gracefully - entity might already be deleted
            if (error.message && error.message.includes('not found')) {
                console.log('Integration already removed, refreshing list...');
                loadData(); // Refresh the list to sync state
            } else {
                alert('Failed to remove repository integration.');
            }
        }
    };

    const startDebateFromRepo = (integration) => {
        window.location.href = `/Chat?github=${integration.repository_name}`;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-900">
                <div className="text-center">
                    <Github className="w-12 h-12 animate-pulse mx-auto mb-4 text-green-400" />
                    <p className="text-green-300">Loading GitHub integrations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <Github className="w-8 h-8 text-green-400" />
                        <h1 className="text-3xl font-bold text-green-300">GitHub Integration</h1>
                    </div>
                    <p className="text-slate-400">
                        Connect your GitHub repositories to enable AI-powered code debates and analysis.
                    </p>
                </div>

                {/* Connection Status */}
                <Card className="mb-6 bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-300">
                            <Settings className="w-5 h-5" />
                            Connection Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {integrations.length > 0 ? (
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                <span className="text-green-400">Connected to {integrations.length} repositories</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-orange-500" />
                                <span className="text-orange-400">No GitHub repositories connected</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Add Repository */}
                <Card className="mb-6 bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-green-300">Add Repository</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Security Warning Banner */}
                        <div className="bg-orange-900/20 border border-orange-600/50 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="font-semibold text-orange-400 mb-1">Security Best Practices</h4>
                                <ul className="text-sm text-orange-300 space-y-1">
                                    <li>• Create tokens with <strong>minimal required scopes</strong> (repo read/write only)</li>
                                    <li>• Set token expiration to shortest practical period</li>
                                    <li>• Never share tokens or commit them to code</li>
                                    <li>• Tokens are encrypted at rest but transmitted over secure connection</li>
                                    <li>• Revoke tokens immediately if compromised</li>
                                </ul>
                            </div>
                        </div>

                        {/* Write Permission Warning */}
                        <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-4 flex items-start gap-3">
                            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="font-semibold text-red-400 mb-1">⚠️ Write Permission Notice</h4>
                                <p className="text-sm text-red-300">
                                    <strong>IMPORTANT:</strong> If you grant <strong>write access</strong>, Neuronas AI will be able to:
                                </p>
                                <ul className="text-sm text-red-300 space-y-1 mt-2">
                                    <li>• Create, modify, and delete files in your repository</li>
                                    <li>• Create and merge pull requests</li>
                                    <li>• Commit changes directly to branches</li>
                                    <li>• Modify repository settings (if token has admin scope)</li>
                                </ul>
                                <p className="text-sm text-red-300 mt-2">
                                    <strong>Recommendation:</strong> Start with <strong>READ-ONLY</strong> access for analysis and debates. 
                                    Only grant write access when you explicitly want the AI to make changes.
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-green-300 mb-2 block">Integration Type</label>
                            <Select value={integrationType} onValueChange={setIntegrationType}>
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-green-300">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600">
                                    <SelectItem value="personal_token" className="text-green-300">
                                        <div className="flex items-center gap-2">
                                            <Key className="w-4 h-4" />
                                            Personal Access Token (Recommended for private repos)
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="app" className="text-green-300">
                                        <div className="flex items-center gap-2">
                                            <Github className="w-4 h-4" />
                                            GitHub App (Public repos only)
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-green-300 mb-2 block">Repository URL</label>
                            <Input
                                placeholder="https://github.com/username/repository"
                                value={repoUrl}
                                onChange={(e) => setRepoUrl(e.target.value)}
                                className="bg-slate-700 border-slate-600 text-green-300 placeholder:text-slate-500"
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox 
                                id="private"
                                checked={isPrivate}
                                onCheckedChange={setIsPrivate}
                                className="border-slate-600"
                            />
                            <label htmlFor="private" className="text-sm text-green-300 flex items-center gap-2">
                                <Lock className="w-4 h-4" />
                                Private Repository
                            </label>
                        </div>

                        {(isPrivate || integrationType === 'personal_token') && (
                            <div>
                                <label className="text-sm font-medium text-green-300 mb-2 block flex items-center gap-2">
                                    <Key className="w-4 h-4" />
                                    GitHub Personal Access Token
                                    {isPrivate && <Badge variant="destructive" className="text-xs">Required for Private</Badge>}
                                </label>
                                <div className="relative">
                                    <Input
                                        type={showToken ? "text" : "password"}
                                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                                        value={githubToken}
                                        onChange={(e) => setGithubToken(e.target.value)}
                                        className="bg-slate-700 border-slate-600 text-green-300 placeholder:text-slate-500 pr-10"
                                        autoComplete="off"
                                        data-lpignore="true"
                                        data-form-type="other"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowToken(!showToken)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-400"
                                    >
                                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <div className="mt-2 space-y-1">
                                    <p className="text-xs text-slate-400">
                                        <a 
                                            href="https://github.com/settings/tokens/new?scopes=repo&description=Neuronas%20AI%20Integration" 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-green-400 hover:underline flex items-center gap-1"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            Create token (select 'repo' scope for read, or 'repo + write' for write access)
                                        </a>
                                    </p>
                                    <p className="text-xs text-orange-400 flex items-center gap-1">
                                        <Lock className="w-3 h-3" />
                                        Token will be encrypted before storage
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <Button 
                                onClick={handleAddRepository}
                                disabled={!repoUrl.trim() || (isPrivate && !githubToken.trim())}
                                className="bg-orange-600 hover:bg-orange-700 text-white"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Repository
                            </Button>
                            {integrationType === 'app' && (
                                <Button 
                                    onClick={handleConnectGitHub}
                                    variant="outline" 
                                    className="border-green-600 text-green-400 hover:bg-green-900/50"
                                >
                                    <Github className="w-4 h-4 mr-2" />
                                    Install GitHub App
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Connected Repositories */}
                {integrations.length > 0 && (
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-green-300">Connected Repositories</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4">
                                {integrations.map((integration) => (
                                    <div key={integration.id} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg border border-slate-600">
                                        <div className="flex items-center gap-3">
                                            <GitBranch className="w-5 h-5 text-green-400" />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-medium text-green-300">{integration.repository_name}</h3>
                                                    {integration.is_private && (
                                                        <Badge variant="outline" className="text-xs border-orange-500 text-orange-400">
                                                            <Lock className="w-3 h-3 mr-1" />
                                                            Private
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex gap-2 mt-1">
                                                    {integration.permissions?.map((permission) => (
                                                        <Badge key={permission} variant="outline" className="text-xs border-slate-500 text-slate-400">
                                                            {permission}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => startDebateFromRepo(integration)}
                                                className="bg-orange-600 hover:bg-orange-700"
                                            >
                                                <MessageSquare className="w-4 h-4 mr-2" />
                                                Start Debate
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => window.open(integration.repository_url, '_blank')}
                                                className="border-slate-600 text-slate-400 hover:bg-slate-600"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleRemoveRepository(integration)}
                                                className="border-red-600 text-red-400 hover:bg-red-900/50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Features Overview */}
                <div className="grid md:grid-cols-3 gap-6 mt-8">
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <FileCode className="w-8 h-8 text-orange-500 mb-2" />
                            <CardTitle className="text-green-300">Code Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-400">
                                AI personas analyze your code for bugs, improvements, and best practices.
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <MessageSquare className="w-8 h-8 text-orange-500 mb-2" />
                            <CardTitle className="text-green-300">Issue Debates</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-400">
                                Discuss GitHub issues with multiple AI perspectives and get comprehensive solutions.
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <Lock className="w-8 h-8 text-orange-500 mb-2" />
                            <CardTitle className="text-green-300">Private Repos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-400">
                                Securely connect private repositories using your personal access token.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}