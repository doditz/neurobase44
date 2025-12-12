import React from 'react';
import { BarChart3 } from 'lucide-react';
import BenchmarkListView from './BenchmarkListView';

export default function UnifiedBenchmarkHistory({ 
    benchmarks, 
    onViewDetails,
    onDownload,
    isLoading = false 
}) {
    return (
        <BenchmarkListView
            benchmarks={benchmarks}
            title="Historique Complet des Tests"
            icon={BarChart3}
            onViewDetails={onViewDetails}
            onDownload={onDownload}
            selectedBenchmarkId={null}
            showCategory={true}
            isLoading={isLoading}
        />
    );
}