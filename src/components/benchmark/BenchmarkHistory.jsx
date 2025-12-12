import React from 'react';
import { Trophy } from 'lucide-react';
import BenchmarkListView from './BenchmarkListView';

export default function BenchmarkHistory({ 
    results = [], 
    onSelectResult = null,
    selectedResultId = null,
    showCategory = true 
}) {
    return (
        <BenchmarkListView
            benchmarks={results}
            title="Historique des Tests"
            icon={Trophy}
            onViewDetails={onSelectResult}
            onDownload={null}
            selectedBenchmarkId={selectedResultId}
            showCategory={showCategory}
        />
    );
}