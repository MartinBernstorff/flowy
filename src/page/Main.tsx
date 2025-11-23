import { useLiveQuery } from '@tanstack/react-db';
import { useRef, useState, useEffect, useMemo } from 'react';
import { NodeActions } from 'src/action/NodeActions';
import { FlowCanvas } from 'src/composition/FlowCanvas';
import { GraphSelector } from 'src/composition/GraphSelector';
import { NewGraphDialog } from 'src/composition/NewGraphDialog';
import { GraphId } from 'src/core/Node';
import { nodeCollection } from 'src/persistence/NodeCollection';

export function Main() {
    const selectTriggerRef = useRef<HTMLButtonElement>(null);

    // Initialize graph from URL or default to 'default'
    const [graph, setGraph] = useState<GraphId>(() => {
        const params = new URLSearchParams(window.location.search);
        const graphParam = params.get('graph');
        return (graphParam as GraphId) || ('default' as GraphId);
    });

    // New graph dialog state
    const [isNewGraphDialogOpen, setIsNewGraphDialogOpen] = useState(false);

    // Sync graph state to URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        params.set('graph', graph);
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, '', newUrl);
    }, [graph]);

    // Load data
    const rawData = useLiveQuery((q) => q.from({ nodes: nodeCollection })).data;
    const allGraphs = Array.from(new Set(rawData.map(it => it.graph)));

    const filteredRawData = useMemo(() => rawData.filter(node => node.graph === graph), [rawData, graph]);

    // Keyboard shortcut handler for Cmd+K
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault();
                selectTriggerRef.current?.click();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleSelectedGraphChange = (value: string) => {
        if (value === '__create_new__') {
            setIsNewGraphDialogOpen(true);
        } else {
            setGraph(value as GraphId);
        }
    };

    const handleGraphCreated = (graphId: GraphId) => {
        setGraph(graphId);
        NodeActions.insertNode(
            [],
            [],
            graphId,
            'Root Node'
        );
    };

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>
                <GraphSelector
                    ref={selectTriggerRef}
                    value={graph}
                    options={allGraphs}
                    onValueChange={handleSelectedGraphChange} />
            </div>

            <FlowCanvas
                graph={graph}
                filteredRawData={filteredRawData} />

            <NewGraphDialog
                isOpen={isNewGraphDialogOpen}
                onOpenChange={setIsNewGraphDialogOpen}
                onGraphCreated={handleGraphCreated} />
        </div>
    );
}
