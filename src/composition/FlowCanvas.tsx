import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
    ReactFlow, Background, Node, Edge, Connection, useReactFlow, applyEdgeChanges, EdgeChange,
    reconnectEdge, EdgeProps,
    OnConnectEnd
} from '@xyflow/react';
import { getLayoutedElements, nodeTypes, edgeTypes } from './NodeLayout';
import { CustomNodeId, GraphId, CustomNode } from "../core/Node";
import { GraphActions } from '../action/GraphActions';
import { NodeActions as NodeActions } from '../action/NodeActions';
import { FlowyNodeData } from './CustomNode';

interface FlowCanvasProps {
    graph: GraphId;
    filteredRawData: CustomNode[];
}

export function FlowCanvas({
    graph,
    filteredRawData,
}: FlowCanvasProps) {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { fitView } = useReactFlow();

    // Promoted node state
    const [promotedNodeId, setPromotedNodeId] = useState<CustomNodeId | null>(null);

    // Reset promoted node when switching graphs
    useEffect(() => {
        setPromotedNodeId(null);
    }, [graph]);

    const onConnect = useCallback((params: Connection) => {
        const node = NodeActions.getNode(params.target as CustomNodeId)!;

        NodeActions.updateNode(
            params.target as CustomNodeId,
            {
                parents: Array.from(new Set([...node.parents, params.source as CustomNodeId])),
            }
        )
    }, []);

    const handleConnectEnd: OnConnectEnd = useCallback(
        (_event, connectionState) => {
            // when a connection is dropped on the pane it's not valid
            if (!connectionState.isValid && connectionState.fromNode) {

                NodeActions.insertNode(
                    [connectionState.fromNode.id as CustomNodeId],
                    [],
                    graph,
                    "New node",
                );
            }
        },
        [graph]
    );

    // Filter data based on promoted node
    const visibleRawData = useMemo(() => {
        if (!promotedNodeId) return filteredRawData;

        const ancestors = GraphActions.getAncestors(promotedNodeId, filteredRawData);
        const immediateChildren = GraphActions.getImmediateChildren(promotedNodeId, filteredRawData);

        return filteredRawData.filter(node =>
            node.id === promotedNodeId ||
            ancestors.has(node.id) ||
            immediateChildren.has(node.id)
        );
    }, [filteredRawData, promotedNodeId]);

    const nodeData: Node<FlowyNodeData>[] = useMemo(() =>
        visibleRawData.map((node) => ({
            id: node.id,
            position: { x: 0, y: 0 }, // Initial position is 0, so the layout algorithm can position it
            data: {
                label: node.label,
                isNew: node.isNew,
                isPromoted: node.id === promotedNodeId
            },
            type: 'custom',
        }))
        , [visibleRawData, promotedNodeId]);

    const edgeData: Edge[] = useMemo(() =>
        visibleRawData.flatMap(it =>
            it.parents.map((parentId: CustomNodeId) => ({
                id: `${parentId}-${it.id}`,
                source: parentId,
                target: it.id,
            }))
        )
        , [visibleRawData]);

    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);

    const onReconnect = useCallback(
        (oldEdge: Edge, newConnection: Connection) =>
            setEdges((els) => reconnectEdge(oldEdge, newConnection, els)),
        [],
    );

    useEffect(() => {
        getLayoutedElements(nodeData, edgeData).then(({ nodes: layoutedNodes, edges: layoutedEdges }) => {
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
            // Fit view after layout is applied
            setTimeout(() => fitView(), 0);
        });
    }, [nodeData, edgeData, fitView]);

    // Keyboard shortcut handler for ESC
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && promotedNodeId) {
                event.preventDefault();
                setPromotedNodeId(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [promotedNodeId]);

    const newNodeLabel = (input: CustomNodeId) => `Node ${input.slice(0, 4)}`;

    const handleInsertNode = useCallback((sourceId: CustomNodeId, targetId: CustomNodeId, label: string) => {
        NodeActions.insertNode([sourceId], [targetId], graph, label);
    }, [graph]);

    const onEdgesChange = (changes: EdgeChange[]) => {
        changes.forEach(change => {
            if (change.type === 'remove') {
                const edgeToRemove = edges.find(e => e.id === change.id);
                if (edgeToRemove) {
                    // Edge removal is handled by parent component through data updates
                }
            }
        });
        setEdges((eds) => applyEdgeChanges(changes, eds));
    }

    const handlePromoteNode = useCallback((nodeId: CustomNodeId) => {
        setPromotedNodeId(nodeId);
    }, []);

    const nodesWithCallbacks = nodes.map(node => ({
        ...node,
        data: {
            ...node.data,
            actions: {
                onAddNode: (target: CustomNodeId, direction: 'before' | 'after') => {
                    NodeActions.addNode(target, direction, graph, newNodeLabel);
                },
                onDeleteNode: (nodeId: CustomNodeId) => {
                    NodeActions.deleteNode(nodeId, filteredRawData);
                },
                onPromoteNode: handlePromoteNode,
            }
        }
    }))

    const edgeTypesWithCallbacks = useMemo(
        () => ({
            custom: (props: EdgeProps) => <edgeTypes.custom {...props} onInsertNode={handleInsertNode} />,
        }),
        [handleInsertNode]
    );

    return (
        <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
            <ReactFlow
                nodes={nodesWithCallbacks}
                nodeTypes={nodeTypes}
                edges={edges}
                edgeTypes={edgeTypesWithCallbacks}
                defaultEdgeOptions={{ type: 'custom' }}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onReconnect={onReconnect}
                onConnectEnd={handleConnectEnd}
                fitView
            >
                <Background />
            </ReactFlow>
        </div>
    );
}
