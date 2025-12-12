import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Users, Plus, Settings, Eye, MessageSquare, Highlighter } from 'lucide-react';
import { toast } from 'sonner';
import CommentThread from '@/components/collaboration/CommentThread';
import AnnotationPanel from '@/components/collaboration/AnnotationPanel';

export default function CollaborativeWorkspace() {
    const [workspaces, setWorkspaces] = useState([]);
    const [activeWorkspace, setActiveWorkspace] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newWorkspace, setNewWorkspace] = useState({
        name: '',
        description: '',
        workspace_type: 'general'
    });
    const [user, setUser] = useState(null);

    useEffect(() => {
        loadUser();
        loadWorkspaces();
    }, []);

    const loadUser = async () => {
        try {
            const currentUser = await base44.auth.me();
            setUser(currentUser);
        } catch (error) {
            console.error('Failed to load user:', error);
        }
    };

    const loadWorkspaces = async () => {
        try {
            const data = await base44.entities.SharedWorkspace.list('-created_date', 50);
            setWorkspaces(data);
            if (data.length > 0 && !activeWorkspace) {
                setActiveWorkspace(data[0]);
            }
        } catch (error) {
            console.error('Failed to load workspaces:', error);
            toast.error('Failed to load workspaces');
        }
    };

    const handleCreate = async () => {
        if (!newWorkspace.name.trim() || !user) return;

        try {
            await base44.entities.SharedWorkspace.create({
                ...newWorkspace,
                owner_email: user.email,
                members: [user.email]
            });
            
            setNewWorkspace({ name: '', description: '', workspace_type: 'general' });
            setShowCreateForm(false);
            await loadWorkspaces();
            toast.success('Workspace created');
        } catch (error) {
            console.error('Failed to create workspace:', error);
            toast.error('Failed to create workspace');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-green-400 flex items-center gap-3">
                            <Users className="w-8 h-8" />
                            Collaborative Workspaces
                        </h1>
                        <p className="text-slate-400 mt-1">
                            Shared analysis and discussion spaces
                        </p>
                    </div>
                    <Button
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Workspace
                    </Button>
                </div>

                {showCreateForm && (
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-green-400">Create Workspace</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Input
                                placeholder="Workspace name"
                                value={newWorkspace.name}
                                onChange={(e) => setNewWorkspace({...newWorkspace, name: e.target.value})}
                                className="bg-slate-700 border-slate-600"
                            />
                            <Input
                                placeholder="Description"
                                value={newWorkspace.description}
                                onChange={(e) => setNewWorkspace({...newWorkspace, description: e.target.value})}
                                className="bg-slate-700 border-slate-600"
                            />
                            <div className="flex gap-2">
                                <Button onClick={handleCreate} className="bg-green-600 hover:bg-green-700">
                                    Create
                                </Button>
                                <Button onClick={() => setShowCreateForm(false)} variant="outline">
                                    Cancel
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Workspace List */}
                    <div className="lg:col-span-1">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-400 text-sm">Your Workspaces</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {workspaces.map((ws) => (
                                    <button
                                        key={ws.id}
                                        onClick={() => setActiveWorkspace(ws)}
                                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                                            activeWorkspace?.id === ws.id
                                                ? 'bg-green-900/30 border-2 border-green-600'
                                                : 'bg-slate-700 hover:bg-slate-600'
                                        }`}
                                    >
                                        <div className="font-medium text-green-400">{ws.name}</div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            {ws.members?.length || 1} member(s)
                                        </div>
                                    </button>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Active Workspace Details */}
                    <div className="lg:col-span-2">
                        {activeWorkspace ? (
                            <div className="space-y-6">
                                <Card className="bg-slate-800 border-slate-700">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-green-400">
                                                {activeWorkspace.name}
                                            </CardTitle>
                                            <Button size="sm" variant="outline">
                                                <Settings className="w-4 h-4 mr-2" />
                                                Settings
                                            </Button>
                                        </div>
                                        {activeWorkspace.description && (
                                            <p className="text-sm text-slate-400 mt-2">
                                                {activeWorkspace.description}
                                            </p>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center gap-4 text-sm text-slate-400">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4" />
                                                {activeWorkspace.members?.length || 1} members
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Eye className="w-4 h-4" />
                                                {activeWorkspace.linked_entities?.length || 0} linked items
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Comments Section */}
                                <Card className="bg-slate-800 border-slate-700">
                                    <CardContent className="p-6">
                                        <CommentThread
                                            targetType="workspace"
                                            targetId={activeWorkspace.id}
                                            autoRefresh={true}
                                        />
                                    </CardContent>
                                </Card>

                                {/* Annotations Section */}
                                <Card className="bg-slate-800 border-slate-700">
                                    <CardContent className="p-6">
                                        <AnnotationPanel
                                            targetType="workspace"
                                            targetId={activeWorkspace.id}
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                            <Card className="bg-slate-800 border-slate-700">
                                <CardContent className="p-12 text-center">
                                    <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-slate-400 mb-2">
                                        No Workspace Selected
                                    </h3>
                                    <p className="text-slate-500">
                                        Select a workspace or create a new one
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}