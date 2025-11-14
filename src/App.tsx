import { useRef, useEffect, useState } from 'react';
import {
  ReactFlow, Background, Node, Edge, Connection, OnConnectEnd
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ReactFlowProvider } from '@xyflow/react';
import { useLiveQuery } from '@tanstack/react-db';
import { getLayoutedElements, nodeTypes } from './flow/NodeLayout';
import { CustomNodeId, nodeCollection } from './persistence/NodeCollection';

export interface RenderedNodeData extends Record<string, unknown> {
  label: string;
  onAddNode?: (nodeId: string, direction: 'before' | 'after') => void;
}

function Flow() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const rawData = useLiveQuery((q) => q.from({ nodes: nodeCollection })).data;

  if (rawData.length === 0) {
    // Initialize with some nodes
    nodeCollection.insert([
      { id: '1' as CustomNodeId, label: 'Node 1', parents: [] },
    ]);
    return null; // Will re-render on next tick
  }

  const nodeData: Node<RenderedNodeData>[] = rawData.map((node): Node<RenderedNodeData> => ({
    id: node.id,
    position: { x: 0, y: 0 }, // Initial position is 0, so the layout algorithm can position it
    data: { label: node.label },
    type: 'custom',
  }));

  const edgeData: Edge[] = rawData.flatMap(it =>
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
  }, [rawData]);

  const newNodeLabel = (input: CustomNodeId) => `Node ${input.slice(0, 4)}`;

  const handleAddNode = (target: CustomNodeId, direction: 'before' | 'after') => {
    const newNodeId = crypto.randomUUID() as CustomNodeId;

    switch (direction) {
      case 'before':
        nodeCollection.insert({
          id: newNodeId,
          label: newNodeLabel(newNodeId),
          parents: [],
        });

        // Update the existing node to add the new node as a parent
        nodeCollection.update(target, (node) => { node.parents = [newNodeId, ...node.parents] });
        break;
      case 'after':
        nodeCollection.insert({
          id: newNodeId,
          label: newNodeLabel(newNodeId),
          parents: [target],
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
        });
      }
    }

  const nodesWithCallbacks = nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      onAddNode: handleAddNode,
    },
  }))

  return (
    <div ref={reactFlowWrapper} style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodesWithCallbacks}
        nodeTypes={nodeTypes}
        edges={edges}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
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
