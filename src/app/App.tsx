import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  ReactFlow, Background, Node, Edge, Connection, OnConnectEnd,
  useReactFlow, applyEdgeChanges, EdgeChange,
  reconnectEdge, EdgeProps
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ReactFlowProvider } from '@xyflow/react';
import { useLiveQuery } from '@tanstack/react-db';
import { getLayoutedElements, nodeTypes, edgeTypes } from '../composition/NodeLayout';
import { nodeCollection } from '../persistence/NodeCollection';
import { CustomNodeId, GraphId } from "../core/Node";
import { GraphSelector } from '../composition/GraphSelector';
import { NewGraphDialog } from '../composition/NewGraphDialog';
import { Graph } from '../action/GraphActions';
import { FlowyNodeData } from 'src/composition/CustomNode';

function Flow() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const selectTriggerRef = useRef<HTMLButtonElement>(null);

  // Initialize graph from URL or default to 'default'
  const [graph, setGraph] = useState<GraphId>(() => {
    const params = new URLSearchParams(window.location.search);
    const graphParam = params.get('graph');
    return (graphParam as GraphId) || ('default' as GraphId);
  });

  // Promoted node state
  const [promotedNodeId, setPromotedNodeId] = useState<CustomNodeId | null>(null);

  // New graph dialog state
  const [isNewGraphDialogOpen, setIsNewGraphDialogOpen] = useState(false);

  // Sync graph state to URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('graph', graph);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [graph]);

  // Reset promoted node when switching graphs
  useEffect(() => {
    setPromotedNodeId(null);
  }, [graph]);

  const { fitView } = useReactFlow();

  const rawData = useLiveQuery((q) => q.from({ nodes: nodeCollection })).data;
  const allGraphs = Array.from(new Set(rawData.map(it => it.graph)));

  const filteredRawData = useMemo(() => rawData.filter(node => node.graph === graph), [rawData, graph]);

  // Filter data based on promoted node
  const visibleRawData = useMemo(() => {
    if (!promotedNodeId) return filteredRawData;

    const ancestors = Graph.getAncestors(promotedNodeId, filteredRawData);
    const immediateChildren = Graph.getImmediateChildren(promotedNodeId, filteredRawData);

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
      it.parents.map(parentId => ({
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

  // Keyboard shortcut handler for Cmd+K and ESC
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        selectTriggerRef.current?.click();
      }
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
    Graph.insertNode([sourceId], [targetId], graph, label);
  }, [graph]);

  const onConnect =
    (params: Connection) => {
      nodeCollection.update(params.target as CustomNodeId, (node) => {
        node.parents = Array.from(new Set([...node.parents, params.source as CustomNodeId]));
      })
    }

  const onConnectEnd: OnConnectEnd =
    (_event, connectionState) => {
      // when a connection is dropped on the pane it's not valid
      if (!connectionState.isValid && connectionState.fromNode) {
        const newNodeId = crypto.randomUUID() as CustomNodeId;

        nodeCollection.insert({
          id: newNodeId,
          label: newNodeLabel(newNodeId),
          parents: [connectionState.fromNode.id as CustomNodeId],
          isNew: true,
          graph: graph
        });
      }
    }

  const onEdgesChange = (changes: EdgeChange[]) => {
    changes.forEach(change => {
      if (change.type === 'remove') {
        const edgeToRemove = edges.find(e => e.id === change.id);
        if (edgeToRemove) {
          nodeCollection.update(edgeToRemove.target as CustomNodeId, (node) => {
            node.parents = node.parents.filter(parentId => parentId !== edgeToRemove.source);
          });
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
    onAddNode: (target: CustomNodeId, direction: 'before' | 'after') => {
      Graph.addNode(target, direction, graph, newNodeLabel);
    },
    onDeleteNode: (nodeId: CustomNodeId) => {
      Graph.deleteNode(nodeId, filteredRawData);
    },
    onPromoteNode: handlePromoteNode,
  }))

  const handleSelectedGraphChange = (value: string) => {
    if (value === '__create_new__') {
      setIsNewGraphDialogOpen(true);
    } else {
      setGraph(value as GraphId);
    }
  }

  const handleGraphCreated = (graphId: GraphId) => {
    setGraph(graphId);
    Graph.insertNode(
      [],
      [],
      graphId,
      'Root Node',
    )
  }

  const edgeTypesWithCallbacks = useMemo(
    () => ({
      custom: (props: EdgeProps) => <edgeTypes.custom {...props} onInsertNode={handleInsertNode} />,
    }),
    [handleInsertNode]
  );

  return (
    <div ref={reactFlowWrapper} style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>
        <GraphSelector
          ref={selectTriggerRef}
          value={graph}
          options={allGraphs}
          onValueChange={handleSelectedGraphChange}
        />
      </div>

      <ReactFlow
        nodes={nodesWithCallbacks}
        nodeTypes={nodeTypes}
        edges={edges}
        edgeTypes={edgeTypesWithCallbacks}
        defaultEdgeOptions={{ type: 'custom' }}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onConnectEnd={onConnectEnd}
        fitView
      >
        <Background />
      </ReactFlow>

      <NewGraphDialog
        isOpen={isNewGraphDialogOpen}
        onOpenChange={setIsNewGraphDialogOpen}
        onGraphCreated={handleGraphCreated}
      />
    </div>
  )
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}
