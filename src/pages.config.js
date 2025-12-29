import AutoOptimization from './pages/AutoOptimization';
import AutoOptimizationTest from './pages/AutoOptimizationTest';
import Benchmark from './pages/Benchmark';
import BenchmarkAnalytics from './pages/BenchmarkAnalytics';
import BenchmarkDatasetBuilder from './pages/BenchmarkDatasetBuilder';
import BenchmarkRunner from './pages/BenchmarkRunner';
import BenchmarkTestRunner from './pages/BenchmarkTestRunner';
import Chat from './pages/Chat';
import CollaborativeWorkspace from './pages/CollaborativeWorkspace';
import DatasetManager from './pages/DatasetManager';
import DevTest from './pages/DevTest';
import DevTestAnalytics from './pages/DevTestAnalytics';
import DevTestDatasetBuilder from './pages/DevTestDatasetBuilder';
import DevTestRunner from './pages/DevTestRunner';
import DynamicGradingTest from './pages/DynamicGradingTest';
import GitHub from './pages/GitHub';
import Home from './pages/Home';
import HuggingFaceSettings from './pages/HuggingFaceSettings';
import MemoryExplorer from './pages/MemoryExplorer';
import MemoryVisualization from './pages/MemoryVisualization';
import NeuronasGauntlet from './pages/NeuronasGauntlet';
import OptimizationMetricsDashboard from './pages/OptimizationMetricsDashboard';
import PerformanceTracker from './pages/PerformanceTracker';
import PerplexityHistory from './pages/PerplexityHistory';
import Personas from './pages/Personas';
import Phase3JerkFilterTest from './pages/Phase3JerkFilterTest';
import Phase4EnhancedSMASTest from './pages/Phase4EnhancedSMASTest';
import Profile from './pages/Profile';
import ResourceMonitoring from './pages/ResourceMonitoring';
import RootCauseAnalysis from './pages/RootCauseAnalysis';
import SMASUpgradeTest from './pages/SMASUpgradeTest';
import SelfOptimizationDashboard from './pages/SelfOptimizationDashboard';
import Suno from './pages/Suno';
import SunoPersonas from './pages/SunoPersonas';
import SystemDiagnostic from './pages/SystemDiagnostic';
import SystemDocumentation from './pages/SystemDocumentation';
import SystemHealth from './pages/SystemHealth';
import SystemMetrics from './pages/SystemMetrics';
import SystemPipelineTest from './pages/SystemPipelineTest';
import ValidationDashboard from './pages/ValidationDashboard';
import VectorRoutingTest from './pages/VectorRoutingTest';
import index from './pages/index';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AutoOptimization": AutoOptimization,
    "AutoOptimizationTest": AutoOptimizationTest,
    "Benchmark": Benchmark,
    "BenchmarkAnalytics": BenchmarkAnalytics,
    "BenchmarkDatasetBuilder": BenchmarkDatasetBuilder,
    "BenchmarkRunner": BenchmarkRunner,
    "BenchmarkTestRunner": BenchmarkTestRunner,
    "Chat": Chat,
    "CollaborativeWorkspace": CollaborativeWorkspace,
    "DatasetManager": DatasetManager,
    "DevTest": DevTest,
    "DevTestAnalytics": DevTestAnalytics,
    "DevTestDatasetBuilder": DevTestDatasetBuilder,
    "DevTestRunner": DevTestRunner,
    "DynamicGradingTest": DynamicGradingTest,
    "GitHub": GitHub,
    "Home": Home,
    "HuggingFaceSettings": HuggingFaceSettings,
    "MemoryExplorer": MemoryExplorer,
    "MemoryVisualization": MemoryVisualization,
    "NeuronasGauntlet": NeuronasGauntlet,
    "OptimizationMetricsDashboard": OptimizationMetricsDashboard,
    "PerformanceTracker": PerformanceTracker,
    "PerplexityHistory": PerplexityHistory,
    "Personas": Personas,
    "Phase3JerkFilterTest": Phase3JerkFilterTest,
    "Phase4EnhancedSMASTest": Phase4EnhancedSMASTest,
    "Profile": Profile,
    "ResourceMonitoring": ResourceMonitoring,
    "RootCauseAnalysis": RootCauseAnalysis,
    "SMASUpgradeTest": SMASUpgradeTest,
    "SelfOptimizationDashboard": SelfOptimizationDashboard,
    "Suno": Suno,
    "SunoPersonas": SunoPersonas,
    "SystemDiagnostic": SystemDiagnostic,
    "SystemDocumentation": SystemDocumentation,
    "SystemHealth": SystemHealth,
    "SystemMetrics": SystemMetrics,
    "SystemPipelineTest": SystemPipelineTest,
    "ValidationDashboard": ValidationDashboard,
    "VectorRoutingTest": VectorRoutingTest,
    "index": index,
}

export const pagesConfig = {
    mainPage: "index",
    Pages: PAGES,
    Layout: __Layout,
};