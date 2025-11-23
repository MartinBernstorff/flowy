import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  ReactFlow, Background, Node, Edge, Connection, OnConnectEnd,
  useReactFlow, applyEdgeChanges, EdgeChange,
  reconnectEdge, EdgeProps
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ReactFlowProvider } from '@xyflow/react';
import { useLiveQuery } from '@tanstack/react-db';
import { getLayoutedElements, nodeTypes, edgeTypes } from 'src/composition/NodeLayout';
import { CustomNodeId, GraphId, nodeCollection } from 'src/persistence/NodeCollection';
import { GraphSelector } from 'src/composition/GraphSelector';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from 'src/component/dialog';
import { Button } from 'src/component/button';
import { Graph } from 'src/action/Graph';

export interface RenderedNodeData extends Record<string, unknown> {
  label: string;
  isNew?: boolean;
  isPromoted?: boolean;
  onAddNode?: (nodeId: string, direction: 'before' | 'after') => void;
  onPromoteNode?: (nodeId: string) => void;
  onUnpromoteNode?: () => void;
}

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
  const [newGraphName, setNewGraphName] = useState('');

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

  const nodeData: Node<RenderedNodeData>[] = useMemo(() =>
    visibleRawData.map((node): Node<RenderedNodeData> => ({
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

  const [nodes, setNodes] = useState<Node<RenderedNodeData>[]>([]);
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


  const handleInsertNode = useCallback((sourceId: CustomNodeId, targetId: CustomNodeId) => {
    Graph.insertNode(sourceId, targetId, graph, newNodeLabel);
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

  const handleUnpromoteNode = useCallback(() => {
    setPromotedNodeId(null);
  }, []);

  const nodesWithCallbacks = nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      onAddNode: (target: CustomNodeId, direction: 'before' | 'after') => {
        Graph.addNode(target, direction, graph, newNodeLabel);
      },
      onDeleteNode: (nodeId: CustomNodeId) => {
        Graph.deleteNode(nodeId, filteredRawData);
      },
      onPromoteNode: handlePromoteNode,
      onUnpromoteNode: handleUnpromoteNode,
    },
  }))

  const handleSelectedGraphChange = (value: string) => {
    if (value === '__create_new__') {
      setIsNewGraphDialogOpen(true);
    } else {
      setGraph(value as GraphId);
    }
  }

  const handleCreateNewGraph = () => {
    if (newGraphName && newGraphName.trim()) {
      setGraph(newGraphName.trim() as GraphId);
      nodeCollection.insert({
        id: crypto.randomUUID() as CustomNodeId,
        label: 'Node 1',
        parents: [],
        graph: newGraphName.trim() as GraphId
      });
      setIsNewGraphDialogOpen(false);
      setNewGraphName('');
    }
  }

  const handleCancelNewGraph = () => {
    setIsNewGraphDialogOpen(false);
    setNewGraphName('');
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
        onEdgesChange={onEdgesChange}
        defaultEdgeOptions={{ type: 'custom' }}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onConnectEnd={onConnectEnd}
        fitView
      >
        <Background />
      </ReactFlow>

      <Dialog open={isNewGraphDialogOpen} onOpenChange={setIsNewGraphDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Graph</DialogTitle>
            <DialogDescription>
              Enter a name for your new graph.
            </DialogDescription>
          </DialogHeader>
          <input
            type="text"
            value={newGraphName}
            onChange={(e) => setNewGraphName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateNewGraph();
              } else if (e.key === 'Escape') {
                handleCancelNewGraph();
              }
            }}
            placeholder="Graph name"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelNewGraph}>
              Cancel
            </Button>
            <Button onClick={handleCreateNewGraph} disabled={!newGraphName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
