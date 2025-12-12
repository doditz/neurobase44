
import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { UserMemory } from '@/entities/UserMemory';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    User as UserIcon, 
    LogOut, 
    Brain, 
    Plus, 
    Trash2, 
    AlertCircle,
    CheckCircle,
    Info,
    Zap,
    Clock,
    Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { base44 } from "@/api/base44Client";

export default function ProfilePage() {
    const [user, setUser] = useState(null);
    const [memories, setMemories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newMemory, setNewMemory] = useState({
        memory_content: '',
        memory_type: 'fact',
        tier_level: 1
    });
    const [preferredName, setPreferredName] = useState('');
    const [characterCount, setCharacterCount] = useState(0);
    const [isReassigning, setIsReassigning] = useState(false);
    const [reassignStats, setReassignStats] = useState(null);

    const MEMORY_GUIDELINES = {
        max_chars: 200,
        optimal_chars: 150,
        tips: [
            "Soyez concis et précis - privilégiez les faits clés",
            "Utilisez un langage simple et direct",
            "Évitez les détails superflu - focus sur l'essentiel",
            "Une mémoire = une idée ou un fait principal",
            "Exemple BON: 'Préfère les explications visuelles avec diagrammes'",
            "Exemple MAUVAIS: 'J'aime bien quand tu m'expliques les choses de façon visuelle parce que je comprends mieux comme ça et aussi j'aime les diagrammes...'"
        ]
    };

    const MEMORY_TYPES = {
        preference: { icon: '⚙️', label: 'Préférence', description: 'Comment vous aimez interagir' },
        fact: { icon: '💡', label: 'Fait', description: 'Information factuelle vous concernant' },
        project: { icon: '🚀', label: 'Projet', description: 'Projet ou objectif en cours' },
        context: { icon: '📝', label: 'Contexte', description: 'Contexte de travail ou personnel' },
        instruction: { icon: '🎯', label: 'Instruction', description: 'Directive ou règle à suivre' }
    };

    useEffect(() => {
        loadUserData();
    }, []);

    useEffect(() => {
        setCharacterCount(newMemory.memory_content.length);
    }, [newMemory.memory_content]);

    const loadUserData = async () => {
        setIsLoading(true);
        try {
            const currentUser = await User.me();
            setUser(currentUser);
            setPreferredName(currentUser.preferred_name || currentUser.full_name || '');

            const userMemories = await UserMemory.list('-created_date');
            setMemories(userMemories);
        } catch (error) {
            console.error('Failed to load user data:', error);
            toast.error('Échec du chargement des données utilisateur');
        }
        setIsLoading(false);
    };

    const handleLogout = async () => {
        try {
            await User.logout();
            toast.success('Déconnexion réussie');
        } catch (error) {
            console.error('Logout failed:', error);
            toast.error('Échec de la déconnexion');
        }
    };

    const handleSavePreferredName = async () => {
        try {
            await User.updateMyUserData({ preferred_name: preferredName });
            toast.success('Nom préféré mis à jour');
            loadUserData();
        } catch (error) {
            console.error('Failed to update preferred name:', error);
            toast.error('Échec de la mise à jour');
        }
    };

    const handleAddMemory = async () => {
        if (!newMemory.memory_content.trim()) {
            toast.error('Le contenu de la mémoire ne peut pas être vide');
            return;
        }

        if (newMemory.memory_content.length > MEMORY_GUIDELINES.max_chars) {
            toast.error(`Maximum ${MEMORY_GUIDELINES.max_chars} caractères pour une compression optimale`);
            return;
        }

        try {
            await UserMemory.create({
                memory_key: `manual_${Date.now()}`,
                memory_content: newMemory.memory_content.trim(),
                memory_type: newMemory.memory_type,
                tier_level: newMemory.tier_level,
                d2_modulation: 0.9,
                hemisphere: 'central',
                context: 'Ajouté manuellement via profil'
            });

            toast.success('Mémoire ajoutée avec succès');
            setNewMemory({
                memory_content: '',
                memory_type: 'fact',
                tier_level: 1
            });
            loadUserData();
        } catch (error) {
            console.error('Failed to add memory:', error);
            toast.error('Échec de l\'ajout de la mémoire');
        }
    };

    const handleDeleteMemory = async (memoryId) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette mémoire ?')) return;

        try {
            await UserMemory.delete(memoryId);
            toast.success('Mémoire supprimée');
            loadUserData();
        } catch (error) {
            console.error('Failed to delete memory:', error);
            toast.error('Échec de la suppression');
        }
    };

    const handleReassignHistory = async () => {
        setIsReassigning(true);
        setReassignStats(null);
        try {
            const { data } = await base44.functions.invoke('reassignConversationHistory', {
                // you can pass optional filters here later:
                // conversation_ids: [],
                // agent_names: ['smas_debater','suno_prompt_architect']
            });
            if (data?.success) {
                setReassignStats(data.stats || null);
                toast.success("Historique ré-attribué");
            } else {
                toast.error(data?.error || "Échec de la ré-attribution");
            }
        } catch (e) {
            console.error('Reassign failed:', e);
            toast.error("Échec de la ré-attribution");
        } finally {
            setIsReassigning(false);
        }
    };

    const getCharacterColor = () => {
        if (characterCount > MEMORY_GUIDELINES.max_chars) return 'text-red-500';
        if (characterCount > MEMORY_GUIDELINES.optimal_chars) return 'text-orange-500';
        return 'text-green-500';
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <Brain className="w-12 h-12 animate-pulse mx-auto mb-4 text-green-400" />
                    <p className="text-green-300">Chargement du profil...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Card className="max-w-md bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-green-300 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            Non authentifié
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-400 mb-4">Vous devez être connecté pour accéder à votre profil.</p>
                        <Button onClick={() => User.login()} className="w-full bg-orange-600 hover:bg-orange-700">
                            Se connecter avec Google
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="max-w-6xl mx-auto p-6"> {/* Moved p-6 to this inner div */}
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-green-600 rounded-full flex items-center justify-center">
                            <UserIcon className="w-8 h-8 text-slate-900" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-green-300">{preferredName || user.full_name}</h1>
                            <p className="text-slate-400">{user.email}</p>
                        </div>
                    </div>
                    <Button 
                        onClick={handleLogout}
                        variant="outline"
                        className="border-red-600 text-red-400 hover:bg-red-900/50"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Déconnexion
                    </Button>
                </div>

                <Tabs defaultValue="memories" className="space-y-6">
                    <TabsList className="bg-slate-800 border border-slate-700">
                        <TabsTrigger value="memories" className="data-[state=active]:bg-orange-900/30 data-[state=active]:text-orange-400">
                            <Brain className="w-4 h-4 mr-2" />
                            Mes Mémoires
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="data-[state=active]:bg-orange-900/30 data-[state=active]:text-orange-400">
                            <UserIcon className="w-4 h-4 mr-2" />
                            Paramètres
                        </TabsTrigger>
                    </TabsList>

                    {/* Memories Tab */}
                    <TabsContent value="memories" className="space-y-6">
                        {/* Add Memory Card */}
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-300 flex items-center gap-2">
                                    <Plus className="w-5 h-5" />
                                    Ajouter une Mémoire Manuelle
                                </CardTitle>
                                <CardDescription className="text-slate-400">
                                    NEURONAS compressera et optimisera automatiquement cette information pour un rappel efficace
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Guidelines */}
                                <div className="bg-blue-900/20 border border-blue-600/50 rounded-lg p-4">
                                    <div className="flex items-start gap-2 mb-2">
                                        <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <h4 className="font-semibold text-blue-400 text-sm">Guide de Compression Mémoire</h4>
                                            <p className="text-xs text-blue-300 mt-1">
                                                Optimal: {MEMORY_GUIDELINES.optimal_chars} caractères | Maximum: {MEMORY_GUIDELINES.max_chars} caractères
                                            </p>
                                        </div>
                                    </div>
                                    <ul className="space-y-1 mt-3">
                                        {MEMORY_GUIDELINES.tips.map((tip, idx) => (
                                            <li key={idx} className="text-xs text-blue-300 flex items-start gap-2">
                                                <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                                <span>{tip}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Memory Type */}
                                <div>
                                    <label className="text-sm font-medium text-green-300 mb-2 block">Type de Mémoire</label>
                                    <Select 
                                        value={newMemory.memory_type} 
                                        onValueChange={(value) => setNewMemory({...newMemory, memory_type: value})}
                                    >
                                        <SelectTrigger className="bg-slate-700 border-slate-600 text-green-300">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-600">
                                            {Object.entries(MEMORY_TYPES).map(([key, data]) => (
                                                <SelectItem key={key} value={key} className="text-green-300">
                                                    <div className="flex items-center gap-2">
                                                        <span>{data.icon}</span>
                                                        <div>
                                                            <div className="font-medium">{data.label}</div>
                                                            <div className="text-xs text-slate-400">{data.description}</div>
                                                        </div>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Memory Tier */}
                                <div>
                                    <label className="text-sm font-medium text-green-300 mb-2 block">Niveau de Persistance</label>
                                    <Select 
                                        value={String(newMemory.tier_level)} 
                                        onValueChange={(value) => setNewMemory({...newMemory, tier_level: parseInt(value)})}
                                    >
                                        <SelectTrigger className="bg-slate-700 border-slate-600 text-green-300">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-600">
                                            <SelectItem value="1" className="text-green-300">
                                                <div>
                                                    <div className="font-medium">L1 - Session (Volatile)</div>
                                                    <div className="text-xs text-slate-400">Conservé pendant la session active</div>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="2" className="text-green-300">
                                                <div>
                                                    <div className="font-medium">L2 - Multi-Session (Court terme)</div>
                                                    <div className="text-xs text-slate-400">Plusieurs jours/semaines</div>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="3" className="text-green-300">
                                                <div>
                                                    <div className="font-medium">L3 - Long Terme (Permanent)</div>
                                                    <div className="text-xs text-slate-400">Mémoire durable</div>
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Memory Content */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-green-300">Contenu (Concis et Sémantique)</label>
                                        <span className={`text-xs font-mono ${getCharacterColor()}`}>
                                            {characterCount}/{MEMORY_GUIDELINES.max_chars}
                                        </span>
                                    </div>
                                    <Textarea
                                        value={newMemory.memory_content}
                                        onChange={(e) => setNewMemory({...newMemory, memory_content: e.target.value})}
                                        placeholder="Exemple: Préfère explications visuelles avec diagrammes. Travaille sur projet IA cognitive."
                                        className="bg-slate-700 border-slate-600 text-green-300 placeholder:text-slate-500 h-24"
                                        maxLength={MEMORY_GUIDELINES.max_chars + 50}
                                    />
                                    {characterCount > MEMORY_GUIDELINES.optimal_chars && (
                                        <p className="text-xs text-orange-400 mt-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {characterCount > MEMORY_GUIDELINES.max_chars 
                                                ? 'Trop long - compression non optimale'
                                                : 'Approche de la limite optimale - considérez raccourcir'
                                            }
                                        </p>
                                    )}
                                </div>

                                <Button 
                                    onClick={handleAddMemory}
                                    disabled={!newMemory.memory_content.trim() || characterCount > MEMORY_GUIDELINES.max_chars}
                                    className="w-full bg-orange-600 hover:bg-orange-700"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Ajouter Mémoire
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Existing Memories */}
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-300">Mes Mémoires Enregistrées ({memories.length})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {memories.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500">
                                        <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>Aucune mémoire enregistrée</p>
                                        <p className="text-sm mt-1">Ajoutez votre première mémoire ci-dessus</p>
                                    </div>
                                ) : (
                                    <ScrollArea className="h-[500px]">
                                        <div className="space-y-3">
                                            {memories.map((memory) => {
                                                const memoryTypeData = MEMORY_TYPES[memory.memory_type] || MEMORY_TYPES.fact;
                                                return (
                                                    <div key={memory.id} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-2xl">{memoryTypeData.icon}</span>
                                                                <div>
                                                                    <Badge variant="outline" className="text-xs border-green-600 text-green-400">
                                                                        {memoryTypeData.label}
                                                                    </Badge>
                                                                    <Badge variant="outline" className="text-xs ml-2 border-blue-600 text-blue-400">
                                                                        L{memory.tier_level}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => handleDeleteMemory(memory.id)}
                                                                className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-900/50"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                        <p className="text-green-300 text-sm mb-2">{memory.memory_content}</p>
                                                        <div className="flex items-center gap-3 text-xs text-slate-400">
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {formatDistanceToNow(new Date(memory.created_date), { addSuffix: true })}
                                                            </span>
                                                            {memory.access_count > 0 && (
                                                                <span className="flex items-center gap-1">
                                                                    <Zap className="w-3 h-3" />
                                                                    Accédé {memory.access_count} fois
                                                                </span>
                                                            )}
                                                            <span className="flex items-center gap-1">
                                                                <Shield className="w-3 h-3" />
                                                                D2: {memory.d2_modulation?.toFixed(2) || '0.90'}
                                                            </span>
                                                        </div>
                                                        {memory.context && (
                                                            <p className="text-xs text-slate-500 mt-2 italic">{memory.context}</p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </ScrollArea>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Settings Tab */}
                    <TabsContent value="settings" className="space-y-6">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-300">Informations Personnelles</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-green-300 mb-2 block">Email (Google OAuth)</label>
                                    <Input 
                                        value={user.email} 
                                        disabled 
                                        className="bg-slate-700 border-slate-600 text-slate-400"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-green-300 mb-2 block">Nom Complet</label>
                                    <Input 
                                        value={user.full_name} 
                                        disabled 
                                        className="bg-slate-700 border-slate-600 text-slate-400"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-green-300 mb-2 block">Comment Préférez-vous Être Appelé ?</label>
                                    <div className="flex gap-2">
                                        <Input 
                                            value={preferredName}
                                            onChange={(e) => setPreferredName(e.target.value)}
                                            placeholder="Doditz, l'alchemiste architecte, etc."
                                            className="bg-slate-700 border-slate-600 text-green-300 placeholder:text-slate-500"
                                        />
                                        <Button 
                                            onClick={handleSavePreferredName}
                                            className="bg-orange-600 hover:bg-orange-700"
                                        >
                                            Enregistrer
                                        </Button>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">
                                        NEURONAS utilisera ce nom dans toutes les interactions
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-300">Compte & Sécurité</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                                    <div>
                                        <h4 className="font-medium text-green-300">Authentification Google</h4>
                                        <p className="text-sm text-slate-400">Connecté via OAuth 2.0</p>
                                    </div>
                                    <Badge className="bg-green-600">Actif</Badge>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                                    <div>
                                        <h4 className="font-medium text-green-300">Rôle</h4>
                                        <p className="text-sm text-slate-400">Niveau d'accès système</p>
                                    </div>
                                    <Badge className="bg-blue-600 capitalize">{user.role}</Badge>
                                </div>
                            </CardContent>
                        </Card>

                        {/* NEW: Conversation History Tools */}
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-300">Historique & Conversations</CardTitle>
                                <CardDescription className="text-slate-400">
                                    Ré-attribuez les conversations existantes à votre compte si elles ont disparu.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-slate-300 text-sm">
                                        Récupérer les conversations (Chat et Suno) liées à cet utilisateur.
                                    </div>
                                    <Button
                                        onClick={handleReassignHistory}
                                        disabled={isReassigning}
                                        className="bg-orange-600 hover:bg-orange-700"
                                    >
                                        {isReassigning ? 'Traitement...' : 'Récupérer mon historique'}
                                    </Button>
                                </div>
                                {reassignStats && (
                                    <div className="text-xs text-slate-400 space-y-1">
                                        <div>Conversations traitées: <span className="text-green-400">{reassignStats.conversations_processed}</span></div>
                                        <div>Conversations restaurées: <span className="text-green-400">{reassignStats.debates_created_for_user}</span></div>
                                        <div>Sources (Perplexity) clonées: <span className="text-green-400">{reassignStats.perplexity_entries_cloned}</span></div>
                                        <div className="text-slate-500 mt-1">Actualisez le Chat si la liste n’apparaît pas immédiatement.</div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
