import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/entities/User";
import { MessageSquare, Users, Github, Brain, Menu, Settings, Plus, Zap, Music, FlaskConical, User as UserIcon, Activity, Shield, BarChart3, Search, Stethoscope, BookOpen, Trash2, Target, TestTube, Database, TrendingUp, Layers, Home, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

const menuSections = [
  {
    id: "main",
    title: "Main",
    icon: Home,
    items: [
      { title: "Home", url: createPageUrl("Home"), icon: Home },
      { title: "Profile", url: createPageUrl("Profile"), icon: UserIcon },
      { title: "Workspace", url: createPageUrl("CollaborativeWorkspace"), icon: Users }
    ]
  },
  {
    id: "ai",
    title: "AI Chat",
    icon: MessageSquare,
    items: [
      { title: "SMAS Chat", url: createPageUrl("Chat"), icon: MessageSquare },
      { title: "Suno AI", url: createPageUrl("Suno"), icon: Music },
      { title: "Perplexity", url: createPageUrl("PerplexityHistory"), icon: Search }
    ]
  },
  {
    id: "personas",
    title: "Personas",
    icon: Users,
    items: [
      { title: "SMAS Personas", url: createPageUrl("Personas"), icon: Users },
      { title: "Suno Personas", url: createPageUrl("SunoPersonas"), icon: Music }
    ]
  },
  {
    id: "memory",
    title: "Memory",
    icon: Brain,
    items: [
      { title: "Memory Viz", url: createPageUrl("MemoryVisualization"), icon: Brain },
      { title: "Memory Explorer", url: createPageUrl("MemoryExplorer"), icon: Brain }
    ]
  },
  {
    id: "benchmark",
    title: "Benchmarks",
    icon: Target,
    items: [
      { title: "Benchmark", url: createPageUrl("Benchmark"), icon: Target },
      { title: "Analytics", url: createPageUrl("BenchmarkAnalytics"), icon: TrendingUp },
      { title: "Validation", url: createPageUrl("ValidationDashboard"), icon: Shield }
    ]
  },
  {
    id: "devtest",
    title: "Dev Tests",
    icon: FlaskConical,
    items: [
      { title: "Tests Dev", url: createPageUrl("DevTest"), icon: FlaskConical },
      { title: "Analytics", url: createPageUrl("DevTestAnalytics"), icon: BarChart3 },
      { title: "LLM Grader", url: createPageUrl("DynamicGradingTest"), icon: TestTube }
    ]
  },
  {
    id: "tools",
    title: "Tools",
    icon: Zap,
    items: [
      { title: "GitHub", url: createPageUrl("GitHub"), icon: Github },
      { title: "Resources", url: createPageUrl("ResourceMonitoring"), icon: Activity },
      { title: "Gauntlet", url: createPageUrl("NeuronasGauntlet"), icon: Zap },
      { title: "Vector Test", url: createPageUrl("VectorRoutingTest"), icon: Layers },
      { title: "Self-Opt", url: createPageUrl("SelfOptimizationDashboard"), icon: TrendingUp }
    ]
  }
];

const adminMenuSections = [
  {
    id: "admin-datasets",
    title: "Datasets",
    icon: Database,
    adminOnly: true,
    items: [
      { title: "Dataset Manager", url: createPageUrl("DatasetManager"), icon: Database, adminOnly: true },
      { title: "Dev Dataset", url: createPageUrl("DevTestDatasetBuilder"), icon: Database, adminOnly: true },
      { title: "Benchmark Dataset", url: createPageUrl("BenchmarkDatasetBuilder"), icon: Database, adminOnly: true }
    ]
  },
  {
    id: "admin-runners",
    title: "Test Runners",
    icon: FlaskConical,
    adminOnly: true,
    items: [
      { title: "Dev Runner", url: createPageUrl("DevTestRunner"), icon: FlaskConical, adminOnly: true },
      { title: "Benchmark Runner", url: createPageUrl("BenchmarkRunner"), icon: Target, adminOnly: true },
      { title: "Benchmark Test", url: createPageUrl("BenchmarkTestRunner"), icon: TestTube, adminOnly: true }
    ]
  },
  {
    id: "admin-tests",
    title: "Advanced Tests",
    icon: TestTube,
    adminOnly: true,
    items: [
      { title: "Pipeline", url: createPageUrl("SystemPipelineTest"), icon: Layers, adminOnly: true },
      { title: "Phase3 Jerk", url: createPageUrl("Phase3JerkFilterTest"), icon: TestTube, adminOnly: true },
      { title: "Phase4 SMAS", url: createPageUrl("Phase4EnhancedSMASTest"), icon: TestTube, adminOnly: true },
      { title: "SMAS Upgrade", url: createPageUrl("SMASUpgradeTest"), icon: TestTube, adminOnly: true }
    ]
  },
  {
    id: "admin-system",
    title: "System Admin",
    icon: Activity,
    adminOnly: true,
    items: [
      { title: "Health", url: createPageUrl("SystemHealth"), icon: Activity, adminOnly: true },
      { title: "Metrics", url: createPageUrl("SystemMetrics"), icon: BarChart3, adminOnly: true },
      { title: "RCA & AI", url: createPageUrl("RootCauseAnalysis"), icon: Search, adminOnly: true },
      { title: "Diagnostic", url: createPageUrl("SystemDiagnostic"), icon: Stethoscope, adminOnly: true },
      { title: "Docs", url: createPageUrl("SystemDocumentation"), icon: BookOpen, adminOnly: true },
      { title: "Auto-Opt", url: createPageUrl("AutoOptimization"), icon: Zap, adminOnly: true },
      { title: "Test DSTIB", url: createPageUrl("AutoOptimizationTest"), icon: Zap, adminOnly: true },
      { title: "Cleanup", url: createPageUrl("PersonaCleanup"), icon: Trash2, adminOnly: true }
    ]
  }
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showDesktopSidebar, setShowDesktopSidebar] = useState(true);
  const [user, setUser] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  const [localShowSettings, setLocalShowSettings] = useState(false);
  
  const layoutProps = window.chatLayoutProps || {};
  const {
    conversations = [],
    activeConversation = null,
    onSelectConversation = null,
    onNewConversation = null,
    settings = {},
    onSettingsChange = null,
    showSettings: propsShowSettings = false,
    setShowSettings: propsSetShowSettings = null,
    user: propsUser = null,
    ChatSidebarComponent = null,
    SettingsPanelComponent = null,
    isLoading = false
  } = layoutProps;

  // Use local state if no props provided
  const showSettings = propsSetShowSettings ? propsShowSettings : localShowSettings;
  const setShowSettings = propsSetShowSettings || setLocalShowSettings;

  useEffect(() => {
    if (propsUser) {
      setUser(propsUser);
    } else {
      const loadUser = async () => {
        try {
          const currentUser = await User.me();
          setUser(currentUser);
        } catch (error) {
          console.log("User not authenticated", error);
        }
      };
      loadUser();
    }
  }, [propsUser]);

  // Adjusted to reflect Debate being merged, so only Chat and Suno are relevant for this check
  const isChatOrSunoPage = currentPageName === 'Chat' || currentPageName === 'Suno';
  const isSunoPage = currentPageName === 'Suno';
  const isChatPage = currentPageName === 'Chat';
  const isAdmin = user?.role === 'admin';

  const allSections = [
    ...menuSections,
    ...(isAdmin ? adminMenuSections : [])
  ];

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Agent indicator configuration
  const agentIndicator = isSunoPage ? {
    icon: Music,
    label: 'Suno AI',
    color: 'text-purple-400',
    bgColor: 'bg-purple-900/30',
    borderColor: 'border-purple-600/50'
  } : isChatPage ? {
    icon: MessageSquare,
    label: 'SMAS Chat',
    color: 'text-green-400',
    bgColor: 'bg-green-900/30',
    borderColor: 'border-green-600/50'
  } : null;

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 z-50 flex-shrink-0">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                className="lg:hidden w-7 h-7 text-green-400 hover:text-green-300 hover:bg-slate-700 flex-shrink-0"
              >
                <Menu className="w-4 h-4" />
              </Button>

              {isChatOrSunoPage && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDesktopSidebar(!showDesktopSidebar)}
                  className="hidden lg:flex w-7 h-7 text-green-400 hover:text-green-300 hover:bg-slate-700 flex-shrink-0"
                >
                  <Menu className="w-4 h-4" />
                </Button>
              )}

              <Link to={createPageUrl('Chat')} className="flex items-center gap-2 flex-shrink-0">
                <div className="w-7 h-7 bg-gradient-to-br from-emerald-600 to-green-600 rounded-lg flex items-center justify-center">
                  <Brain className="w-4 h-4 text-slate-900" />
                </div>
                <h2 className="font-semibold text-green-400 text-sm hidden sm:block">Neuronas AI</h2>
              </Link>

              {/* NEW: Agent Indicator Badge */}
              {agentIndicator && (
                <div className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-lg border ${agentIndicator.borderColor} ${agentIndicator.bgColor}`}>
                  <agentIndicator.icon className={`w-3 h-3 ${agentIndicator.color}`} />
                  <span className={`text-xs font-medium ${agentIndicator.color}`}>
                    {agentIndicator.label}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {isChatOrSunoPage && (
                <>
                  {setShowSettings && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowSettings(!showSettings)}
                      className={`w-7 h-7 ${showSettings ? 'text-orange-400 bg-orange-900/30' : 'text-green-400 hover:text-green-300'} hover:bg-slate-700`}
                    >
                      <Settings className="w-3 h-3" />
                    </Button>
                  )}

                  {onNewConversation && (
                    <Button
                      onClick={onNewConversation}
                      size="sm"
                      className="h-7 bg-orange-600 hover:bg-orange-700 text-white text-xs px-2"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      <span className="hidden sm:inline">New</span>
                    </Button>
                  )}
                </>
              )}

              {user && (
                <Link
                  to={createPageUrl('Profile')}
                  className="hidden md:flex items-center gap-2 px-2 py-1 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-green-400">{user.preferred_name || user.full_name || user.email}</span>
                  {isAdmin && (
                    <Shield className="w-3 h-3 text-orange-400" />
                  )}
                </Link>
              )}
            </div>
          </div>

          <nav className="max-w-7xl mx-auto">
            <div className="flex flex-wrap gap-1">
              {allSections.map((section) => {
                const isExpanded = expandedSections[section.id];
                const SectionIcon = section.icon;
                const hasActiveItem = section.items.some(item => location.pathname === item.url);
                
                return (
                  <div key={section.id} className="relative group">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-md transition-colors ${
                        hasActiveItem
                          ? "bg-orange-900/30 text-orange-400 border border-orange-600/50"
                          : "text-slate-400 hover:bg-slate-700 hover:text-green-300 border border-transparent"
                      } ${section.adminOnly ? 'relative' : ''}`}
                    >
                      <SectionIcon className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium hidden md:inline">{section.title}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      {section.adminOnly && (
                        <Shield className="w-2.5 h-2.5 text-orange-400 absolute -top-0.5 -right-0.5" />
                      )}
                    </button>
                    
                    {isExpanded && (
                      <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-48">
                        <div className="p-1 space-y-0.5">
                          {section.items.map((item) => {
                            const ItemIcon = item.icon;
                            const isActive = location.pathname === item.url;
                            return (
                              <Link
                                key={item.title}
                                to={item.url}
                                onClick={() => setExpandedSections({})}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                                  isActive
                                    ? "bg-orange-900/30 text-orange-400"
                                    : "text-slate-300 hover:bg-slate-700 hover:text-green-300"
                                } ${item.adminOnly ? 'relative' : ''}`}
                              >
                                <ItemIcon className="w-3.5 h-3.5" />
                                <span className="text-xs font-medium">{item.title}</span>
                                {item.adminOnly && (
                                  <Shield className="w-2.5 h-2.5 text-orange-400 ml-auto" />
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {isChatOrSunoPage && showDesktopSidebar && (
          <div className="hidden lg:block w-64 bg-slate-800 border-r border-slate-700 flex flex-col flex-shrink-0">
            <div className="p-2 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-green-400 px-2">
                  {currentPageName === 'Chat' ? 'Chat History' : 'Suno History'}
                </h3>
                {/* NEW: Agent Badge in Sidebar */}
                {agentIndicator && (
                  <Badge className={`${agentIndicator.bgColor} ${agentIndicator.color} border-0`}>
                    <agentIndicator.icon className="w-2.5 h-2.5 mr-1" />
                    {agentIndicator.label.split(' ')[0]}
                  </Badge>
                )}
              </div>
            </div>

            {ChatSidebarComponent && (
              <ChatSidebarComponent
                conversations={conversations}
                activeConversation={activeConversation}
                onSelectConversation={onSelectConversation}
                isLoading={isLoading}
              />
            )}

            <div className="p-2 border-t border-slate-700 bg-slate-900 flex-shrink-0">
              <div className="flex items-center justify-between text-xs text-green-400">
                <div className="flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" />
                  <span>T: {settings?.temperature || 0.7}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-2.5 h-2.5" />
                  <span>{settings?.maxPersonas || 5}p</span>
                </div>
                {/* NEW: Mode indicator */}
                <Badge variant="outline" className="text-xs py-0 h-4">
                  {settings?.mode || 'balanced'}
                </Badge>
              </div>
            </div>
          </div>
        )}

        <Sheet open={showMobileSidebar} onOpenChange={setShowMobileSidebar}>
          <SheetContent side="left" className="w-64 bg-slate-800 border-slate-700 p-0">
            <SheetHeader className="p-3 border-b border-slate-700">
              <SheetTitle className="text-green-400 text-sm flex items-center justify-between">
                <span>{isChatOrSunoPage ? currentPageName + ' History' : 'Menu'}</span>
                {agentIndicator && (
                  <Badge className={`${agentIndicator.bgColor} ${agentIndicator.color} border-0`}>
                    <agentIndicator.icon className="w-2.5 h-2.5 mr-1" />
                    {agentIndicator.label.split(' ')[0]}
                  </Badge>
                )}
              </SheetTitle>
            </SheetHeader>

            {isChatOrSunoPage && ChatSidebarComponent && (
              <ChatSidebarComponent
                conversations={conversations}
                activeConversation={activeConversation}
                onSelectConversation={(conv) => {
                  onSelectConversation(conv);
                  setShowMobileSidebar(false);
                }}
                isLoading={isLoading}
              />
            )}
            {!isChatOrSunoPage && (
              <nav className="flex flex-col gap-2 p-2">
                {allSections.map((section) => {
                  const SectionIcon = section.icon;
                  return (
                    <div key={section.id}>
                      <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-green-400 uppercase tracking-wide">
                        <SectionIcon className="w-3.5 h-3.5" />
                        {section.title}
                        {section.adminOnly && <Shield className="w-3 h-3 text-orange-400" />}
                      </div>
                      <div className="space-y-0.5">
                        {section.items.map((item) => {
                          const ItemIcon = item.icon;
                          const isActive = location.pathname === item.url;
                          return (
                            <Link
                              key={item.title}
                              to={item.url}
                              onClick={() => setShowMobileSidebar(false)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                                isActive
                                  ? "bg-orange-900/30 text-orange-400 border border-orange-600/50"
                                  : "text-slate-400 hover:bg-slate-700 hover:text-green-300"
                              }`}
                            >
                              <ItemIcon className="w-3.5 h-3.5" />
                              <span className="text-sm">{item.title}</span>
                              {item.adminOnly && (
                                <Shield className="w-2.5 h-2.5 text-orange-400 ml-auto" />
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </nav>
            )}
          </SheetContent>
        </Sheet>

        {isChatOrSunoPage && showSettings && SettingsPanelComponent && (
          <Sheet open={showSettings} onOpenChange={setShowSettings}>
            <SheetContent side="right" className="w-80 bg-slate-800 border-slate-700 p-0">
              <SheetHeader className="p-3 border-b border-slate-700">
                <SheetTitle className="text-green-400 text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  {isSunoPage ? 'Suno Settings' : 'SMAS Settings'}
                </SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100%-60px)] overflow-y-auto">
                <SettingsPanelComponent
                  settings={settings}
                  onSettingsChange={onSettingsChange}
                />
              </div>
            </SheetContent>
          </Sheet>
        )}

        <main className="flex-1 flex flex-col min-w-0 bg-slate-900 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}