import { useRef, useEffect, useState } from 'react';
import {
  ReactFlow, Background, Node, Edge, Connection, OnConnectEnd,
  useReactFlow, applyEdgeChanges, EdgeChange
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ReactFlowProvider } from '@xyflow/react';
import { useLiveQuery } from '@tanstack/react-db';
import { getLayoutedElements, nodeTypes } from './flow/NodeLayout';
import { CustomNodeId, GraphId, nodeCollection } from './persistence/NodeCollection';
import { GraphSelector } from '@/components/GraphSelector';

export interface RenderedNodeData extends Record<string, unknown> {
  label: string;
  isNew?: boolean;
  onAddNode?: (nodeId: string, direction: 'before' | 'after') => void;
}

function Flow() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const selectTriggerRef = useRef<HTMLButtonElement>(null);
  const [graph, setGraph] = useState('default' as GraphId);

  const rawData = useLiveQuery((q) => q.from({ nodes: nodeCollection })).data;
  const allGraphs = Array.from(new Set(rawData.map(it => it.graph)));
  const graphOptions = [...allGraphs];

  // Filter nodes by selected graph
  const filteredRawData = rawData.filter(node => node.graph === graph);

  const { fitView } = useReactFlow();

  if (filteredRawData.length === 0) {
    // Initialize with some nodes
    nodeCollection.insert([
      { id: '1' as CustomNodeId, label: 'Node 1', parents: [], graph: 'default' },
    ]);
    return null; // Will re-render on next tick
  }

  const nodeData: Node<RenderedNodeData>[] = filteredRawData.map((node): Node<RenderedNodeData> => ({
    id: node.id,
    position: { x: 0, y: 0 }, // Initial position is 0, so the layout algorithm can position it
    data: { label: node.label, isNew: node.isNew },
    type: 'custom',
  }));

  const edgeData: Edge[] = filteredRawData.flatMap(it =>
    it.parents.map(parentId => ({
      id: `${parentId}-${it.id}`,
      source: parentId,
      target: it.id,
    }))
  );

  const [nodes, setNodes] = useState<Node<RenderedNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    getLayoutedElements(nodeData, edgeData).then(({ nodes: layoutedNodes, edges: layoutedEdges }) => {
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    });
  }, [filteredRawData]);

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

  const newNodeLabel = (input: CustomNodeId) => `Node ${input.slice(0, 4)}`;

  const handleAddNode = (target: CustomNodeId, direction: 'before' | 'after') => {
    const newNodeId = crypto.randomUUID() as CustomNodeId;

    switch (direction) {
      case 'before':
        nodeCollection.insert({
          id: newNodeId,
          label: newNodeLabel(newNodeId),
          parents: [],
          isNew: true,
          graph: graph
        });

        // Update the existing node to add the new node as a parent
        nodeCollection.update(target, (node) => { node.parents = [newNodeId, ...node.parents] });
        break;
      case 'after':
        nodeCollection.insert({
          id: newNodeId,
          label: newNodeLabel(newNodeId),
          parents: [target],
          isNew: true,
          graph: graph
        });
        break;
    }
  }

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

  const nodesWithCallbacks = nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      onAddNode: handleAddNode,
    },
  }))

  const handleGraphChange = (value: string) => {
    if (value === '__create_new__') {
      const newGraphName = prompt('Enter new graph name:');
      if (newGraphName && newGraphName.trim()) {
        setGraph(newGraphName.trim() as GraphId);
        nodeCollection.insert({
          id: crypto.randomUUID() as CustomNodeId,
          label: 'Node 1',
          parents: [],
          graph: newGraphName.trim() as GraphId
        });
      }
    } else {
      setGraph(value as GraphId);
    }
  }

  fitView();

  return (
    <div ref={reactFlowWrapper} style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>
        <GraphSelector
          ref={selectTriggerRef}
          value={graph}
          options={graphOptions}
          onValueChange={handleGraphChange}
        />
      </div>
      <ReactFlow
        nodes={nodesWithCallbacks}
        nodeTypes={nodeTypes}
        edges={edges}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Background />
      </ReactFlow>
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
