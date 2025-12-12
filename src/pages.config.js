import Personas from './pages/Personas';
import Chat from './pages/Chat';
import index from './pages/index';
import GitHub from './pages/GitHub';
import Suno from './pages/Suno';
import SunoPersonas from './pages/SunoPersonas';
import Benchmark from './pages/Benchmark';
import BenchmarkDatasetBuilder from './pages/BenchmarkDatasetBuilder';
import Profile from './pages/Profile';
import ResourceMonitoring from './pages/ResourceMonitoring';
import BenchmarkRunner from './pages/BenchmarkRunner';
import BenchmarkTestRunner from './pages/BenchmarkTestRunner';
import SelfOptimizationDashboard from './pages/SelfOptimizationDashboard';
import AutoOptimization from './pages/AutoOptimization';
import AutoOptimizationTest from './pages/AutoOptimizationTest';
import ValidationDashboard from './pages/ValidationDashboard';
import PerplexityHistory from './pages/PerplexityHistory';
import SystemDiagnostic from './pages/SystemDiagnostic';
import DynamicGradingTest from './pages/DynamicGradingTest';
import SystemHealth from './pages/SystemHealth';
import SystemDocumentation from './pages/SystemDocumentation';
import SystemMetrics from './pages/SystemMetrics';
import RootCauseAnalysis from './pages/RootCauseAnalysis';
import BenchmarkAnalytics from './pages/BenchmarkAnalytics';
import DevTest from './pages/DevTest';
import DevTestAnalytics from './pages/DevTestAnalytics';
import CollaborativeWorkspace from './pages/CollaborativeWorkspace';
import NeuronasGauntlet from './pages/NeuronasGauntlet';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Personas": Personas,
    "Chat": Chat,
    "index": index,
    "GitHub": GitHub,
    "Suno": Suno,
    "SunoPersonas": SunoPersonas,
    "Benchmark": Benchmark,
    "BenchmarkDatasetBuilder": BenchmarkDatasetBuilder,
    "Profile": Profile,
    "ResourceMonitoring": ResourceMonitoring,
    "BenchmarkRunner": BenchmarkRunner,
    "BenchmarkTestRunner": BenchmarkTestRunner,
    "SelfOptimizationDashboard": SelfOptimizationDashboard,
    "AutoOptimization": AutoOptimization,
    "AutoOptimizationTest": AutoOptimizationTest,
    "ValidationDashboard": ValidationDashboard,
    "PerplexityHistory": PerplexityHistory,
    "SystemDiagnostic": SystemDiagnostic,
    "DynamicGradingTest": DynamicGradingTest,
    "SystemHealth": SystemHealth,
    "SystemDocumentation": SystemDocumentation,
    "SystemMetrics": SystemMetrics,
    "RootCauseAnalysis": RootCauseAnalysis,
    "BenchmarkAnalytics": BenchmarkAnalytics,
    "DevTest": DevTest,
    "DevTestAnalytics": DevTestAnalytics,
    "CollaborativeWorkspace": CollaborativeWorkspace,
    "NeuronasGauntlet": NeuronasGauntlet,
}

export const pagesConfig = {
    mainPage: "Chat",
    Pages: PAGES,
    Layout: __Layout,
};