
import React, { useState, useEffect } from 'react';
import { GitHubIntegration } from '@/entities/GitHubIntegration';
import { User } from '@/entities/User';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Github, FileCode, GitPullRequest, Code, CircleDot } from 'lucide-react';

export default function GitHubContextSelector({ onContextSelected, onClose }) {
    const [integrations, setIntegrations] = useState([]);
    const [selectedRepo, setSelectedRepo] = useState('');
    const [contextType, setContextType] = useState('file');
    const [filePath, setFilePath] = useState('');
    const [issueNumber, setIssueNumber] = useState('');
    const [codeSnippet, setCodeSnippet] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadIntegrations();
    }, []);

    const loadIntegrations = async () => {
        try {
            const user = await User.me();
            const userIntegrations = await GitHubIntegration.filter({ user_id: user.id, is_active: true });
            setIntegrations(userIntegrations);
        } catch (error) {
            console.error('Failed to load integrations:', error);
        }
        setIsLoading(false);
    };

    const handleSubmit = () => {
        if (!selectedRepo) return;

        const context = {
            repository_name: selectedRepo,
            context_type: contextType,
            description: description || 'GitHub context for AI debate',
        };

        switch (contextType) {
            case 'file':
                if (!filePath) return;
                context.file_path = filePath;
                context.file_content = `// File: ${filePath}\n// Repository: ${selectedRepo}\n// This would contain the actual file content from GitHub API`;
                break;
            case 'issue':
                if (!issueNumber) return;
                context.issue_number = parseInt(issueNumber);
                break;
            case 'pull_request':
                if (!issueNumber) return;
                context.pull_request_number = parseInt(issueNumber);
                break;
            case 'snippet':
                if (!codeSnippet) return;
                context.file_content = codeSnippet;
                break;
        }

        onContextSelected(context);
    };

    const getContextIcon = (type) => {
        switch (type) {
            case 'file': return <FileCode className="w-4 h-4" />;
            case 'issue': return <CircleDot className="w-4 h-4" />;
            case 'pull_request': return <GitPullRequest className="w-4 h-4" />;
            case 'snippet': return <Code className="w-4 h-4" />;
            default: return <FileCode className="w-4 h-4" />;
        }
    };

    if (isLoading) {
        return (
            <div className="p-6 text-center">
                <Github className="w-8 h-8 animate-pulse mx-auto mb-4 text-green-400" />
                <p className="text-green-300">Loading GitHub integrations...</p>
            </div>
        );
    }

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-300">
                    <Github className="w-5 h-5" />
                    Select GitHub Context
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {integrations.length === 0 ? (
                    <div className="text-center p-6">
                        <p className="text-orange-400 mb-4">No GitHub repositories connected.</p>
                        <Button 
                            onClick={() => window.location.href = '/GitHub'}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            Connect GitHub
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Repository Selection */}
                        <div>
                            <label className="text-sm font-medium text-green-300 mb-2 block">Repository</label>
                            <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-green-300">
                                    <SelectValue placeholder="Select a repository" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600">
                                    {integrations.map((integration) => (
                                        <SelectItem key={integration.id} value={integration.repository_name} className="text-green-300">
                                            {integration.repository_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Context Type Selection */}
                        <div>
                            <label className="text-sm font-medium text-green-300 mb-2 block">Context Type</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { value: 'file', label: 'Code File', icon: FileCode },
                                    { value: 'issue', label: 'GitHub Issue', icon: CircleDot },
                                    { value: 'pull_request', label: 'Pull Request', icon: GitPullRequest },
                                    { value: 'snippet', label: 'Code Snippet', icon: Code }
                                ].map((type) => (
                                    <Button
                                        key={type.value}
                                        variant={contextType === type.value ? "default" : "outline"}
                                        onClick={() => setContextType(type.value)}
                                        className={`justify-start ${
                                            contextType === type.value 
                                                ? "bg-orange-600 hover:bg-orange-700" 
                                                : "border-slate-600 text-slate-300 hover:bg-slate-700"
                                        }`}
                                    >
                                        <type.icon className="w-4 h-4 mr-2" />
                                        {type.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Context-specific inputs */}
                        {contextType === 'file' && (
                            <div>
                                <label className="text-sm font-medium text-green-300 mb-2 block">File Path</label>
                                <Input
                                    placeholder="src/components/Example.js"
                                    value={filePath}
                                    onChange={(e) => setFilePath(e.target.value)}
                                    className="bg-slate-700 border-slate-600 text-green-300"
                                />
                            </div>
                        )}

                        {(contextType === 'issue' || contextType === 'pull_request') && (
                            <div>
                                <label className="text-sm font-medium text-green-300 mb-2 block">
                                    {contextType === 'issue' ? 'Issue Number' : 'Pull Request Number'}
                                </label>
                                <Input
                                    placeholder="#123"
                                    value={issueNumber}
                                    onChange={(e) => setIssueNumber(e.target.value.replace('#', ''))}
                                    className="bg-slate-700 border-slate-600 text-green-300"
                                />
                            </div>
                        )}

                        {contextType === 'snippet' && (
                            <div>
                                <label className="text-sm font-medium text-green-300 mb-2 block">Code Snippet</label>
                                <Textarea
                                    placeholder="Paste your code snippet here..."
                                    value={codeSnippet}
                                    onChange={(e) => setCodeSnippet(e.target.value)}
                                    className="bg-slate-700 border-slate-600 text-green-300 min-h-24"
                                />
                            </div>
                        )}

                        {/* Description */}
                        <div>
                            <label className="text-sm font-medium text-green-300 mb-2 block">Description (Optional)</label>
                            <Input
                                placeholder="What would you like to discuss about this code?"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="bg-slate-700 border-slate-600 text-green-300"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3">
                            <Button 
                                variant="outline" 
                                onClick={onClose}
                                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleSubmit}
                                disabled={!selectedRepo || (contextType === 'file' && !filePath) || (contextType === 'issue' && !issueNumber) || (contextType === 'pull_request' && !issueNumber) || (contextType === 'snippet' && !codeSnippet)}
                                className="bg-orange-600 hover:bg-orange-700"
                            >
                                {getContextIcon(contextType)}
                                <span className="ml-2">Start Code Debate</span>
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
