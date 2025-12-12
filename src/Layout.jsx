import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/entities/User";
import { MessageSquare, Users, Github, Brain, Menu, Settings, Plus, Zap, Music, FlaskConical, User as UserIcon, Activity, Shield, BarChart3, Search, Stethoscope, BookOpen, Trash2, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

const navigationItems = [
  {
    title: "AI Chat",
    url: createPageUrl("Chat"),
    icon: MessageSquare,
    description: "Neuronas AI Assistant"
  },
  {
    title: "Suno AI",
    url: createPageUrl("Suno"),
    icon: Music,
    description: "Music composition"
  },
  {
    title: "Perplexity",
    url: createPageUrl("PerplexityHistory"),
    icon: Search,
    description: "Web search history"
  },
  {
    title: "Tests Dev",
    url: createPageUrl("DevTest"),
    icon: FlaskConical,
    description: "Tests de développement A/B"
  },
  {
    title: "Analytics Dev",
    url: createPageUrl("DevTestAnalytics"),
    icon: BarChart3,
    description: "Analyse tests de développement"
  },
  {
    title: "🧪 LLM Grader",
    url: createPageUrl("DynamicGradingTest"),
    icon: Zap,
    description: "Test dev évaluation dynamique"
  },
  {
    title: "Validation",
    url: createPageUrl("ValidationDashboard"),
    icon: BarChart3,
    description: "Dashboard de validation"
  },
  {
    title: "Resources",
    url: createPageUrl("ResourceMonitoring"),
    icon: Activity,
    description: "Resource monitoring"
  },
  {
    title: "GitHub",
    url: createPageUrl("GitHub"),
    icon: Github,
    description: "Code analysis"
  },
  {
    title: "Personas",
    url: createPageUrl("Personas"),
    icon: Users,
    description: "SMAS persona library"
  },
  {
    title: "Suno Personas",
    url: createPageUrl("SunoPersonas"),
    icon: Music,
    description: "Suno AI personas"
  },
  {
    title: "Cleanup",
    url: createPageUrl("PersonaCleanup"),
    icon: Trash2,
    description: "Persona cleanup tool",
    adminOnly: true
  },
  {
    title: "Profile",
    url: createPageUrl("Profile"),
    icon: UserIcon,
    description: "Manage your profile and settings"
  },
  {
    title: "System Health",
    url: createPageUrl("SystemHealth"),
    icon: Activity,
    description: "System health & auto-repair",
    adminOnly: true
  },
  {
    title: "Metrics",
    url: createPageUrl("SystemMetrics"),
    icon: BarChart3,
    description: "Performance metrics",
    adminOnly: true
  },
  {
    title: "RCA & AI",
    url: createPageUrl("RootCauseAnalysis"),
    icon: Search,
    description: "Root cause analysis & ML anomalies",
    adminOnly: true
  },
  {
    title: "Documentation",
    url: createPageUrl("SystemDocumentation"),
    icon: BookOpen,
    description: "System documentation",
    adminOnly: true
  },
  {
    title: "Diagnostic",
    url: createPageUrl("SystemDiagnostic"),
    icon: Stethoscope,
    description: "System diagnostic & health check",
    adminOnly: true
  },
  {
    title: "Workspace",
    url: createPageUrl("CollaborativeWorkspace"),
    icon: UsersIcon,
    description: "Team collaboration workspaces"
  }
];

const adminNavigationItems = [
  {
    title: "Auto-Opt",
    url: createPageUrl("AutoOptimization"),
    icon: Zap,
    description: "Self-Optimization Engine",
    adminOnly: true
  },
  {
    title: "Test DSTIB",
    url: createPageUrl("AutoOptimizationTest"),
    icon: Zap,
    description: "Test Auto-Optimization",
    adminOnly: true
  },
  {
    title: "Test Runner",
    url: createPageUrl("DevTestRunner"),
    icon: Zap,
    description: "Runner tests de développement",
    adminOnly: true
  },
  {
    title: "Dataset Builder",
    url: createPageUrl("DevTestDatasetBuilder"),
    icon: Plus,
    description: "Créer datasets tests dev",
    adminOnly: true
  }
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showDesktopSidebar, setShowDesktopSidebar] = useState(true);
  const [user, setUser] = useState(null);

  const layoutProps = window.chatLayoutProps || {};
  const {
    conversations = [],
    activeConversation = null,
    onSelectConversation = null,
    onNewConversation = null,
    settings = {},
    onSettingsChange = null,
    showSettings = false,
    setShowSettings = null,
    user: propsUser = null,
    ChatSidebarComponent = null,
    SettingsPanelComponent = null,
    isLoading = false
  } = layoutProps;

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

  const allNavigationItems = [
    ...navigationItems,
    ...(isAdmin ? adminNavigationItems : [])
  ];

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
            <div className="grid grid-cols-7 gap-1 mb-1">
              {allNavigationItems.slice(0, 7).map((item) => {
                const isActive = location.pathname === item.url ||
                                (item.url === createPageUrl('Chat') && location.pathname === '/');
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    className={`flex items-center justify-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
                      isActive
                        ? "bg-orange-900/30 text-orange-400 border border-orange-600/50"
                        : "text-slate-400 hover:bg-slate-700 hover:text-green-300"
                    } ${item.adminOnly ? 'relative' : ''}`}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium hidden xl:inline truncate">{item.title}</span>
                    {item.adminOnly && (
                      <Shield className="w-3 h-3 text-orange-400 absolute -top-1 -right-1" />
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {allNavigationItems.slice(7, 14).map((item) => {
                const isActive = location.pathname === item.url ||
                                (item.url === createPageUrl('Chat') && location.pathname === '/');
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    className={`flex items-center justify-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
                      isActive
                        ? "bg-orange-900/30 text-orange-400 border border-orange-600/50"
                        : "text-slate-400 hover:bg-slate-700 hover:text-green-300"
                    } ${item.adminOnly ? 'relative' : ''}`}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium hidden xl:inline truncate">{item.title}</span>
                    {item.adminOnly && (
                      <Shield className="w-3 h-3 text-orange-400 absolute -top-1 -right-1" />
                    )}
                  </Link>
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
              <nav className="flex flex-col gap-1 p-2">
                {allNavigationItems.map((item) => {
                  const isActive = location.pathname === item.url ||
                                  (item.url === createPageUrl('Chat') && location.pathname === '/');
                  return (
                    <Link
                      key={item.title}
                      to={item.url}
                      onClick={() => setShowMobileSidebar(false)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                        isActive
                          ? "bg-orange-900/30 text-orange-400 border border-orange-600/50"
                          : "text-slate-400 hover:bg-slate-700 hover:text-green-300"
                      } ${item.adminOnly ? 'relative' : ''}`}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm font-medium">{item.title}</span>
                      {item.adminOnly && (
                        <Shield className="w-3 h-3 text-orange-400 absolute -top-1 -right-1" />
                      )}
                    </Link>
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