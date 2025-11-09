import { useCallback, useRef } from 'react';
import {
    ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, Background, useNodesState,
    useEdgesState, Node, Edge, NodeChange, EdgeChange, Connection, OnConnectEnd
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ReactFlowProvider } from '@xyflow/react';
import ELK from 'elkjs/lib/elk.bundled.js';
import { MarkerType } from '@xyflow/react';
import CustomNode from './CustomNode';

interface CustomNodeData extends Record<string, unknown> {
  label: string;
}

const initialNodes: Node<CustomNodeData>[] = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' }, type: 'custom' },
];
const initialEdges: Edge[] = [];

let id = 3;
const nextId = () => `${id++}`;

const elk = new ELK();

const nodeTypes = {
  custom: CustomNode,
};

const elkOptions: Record<string, string> = {
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",
  "elk.spacing.nodeNode": "25",
  "elk.layered.spacing.nodeNodeBetweenLayers": "50",
  "elk.layered.spacing": "50",
  "elk.layered.mergeEdges": "true",
  "elk.spacing": "50",
  "elk.spacing.individual": "50",
  "elk.edgeRouting": "SPLINES"
};

function getLayoutedElements(
  nodes: Node<CustomNodeData>[], 
  edges: Edge[], 
  options: Record<string, string>
): Promise<{ nodes: Node<CustomNodeData>[]; edges: Edge[] } | undefined> {
  const isHorizontal = options?.['elk.direction'] === 'RIGHT';
  const nodeIds = new Set(nodes.map(node => node.id));
  
  // Filter out edges that don't have both valid source and target nodes
  const validEdges = edges.filter(edge => 
    nodeIds.has(edge.source) && nodeIds.has(edge.target)
  );
  
  const graph = {
    id: 'root',
    layoutOptions: options,
    children: nodes.map((node) => ({
      ...node,
      // Adjust the target and source handle positions based on the layout
      // direction.
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',

      // Hardcode a width and height for elk to use when layouting.
      width: 150,
      height: 50,
    })),
    edges: validEdges.map(edge => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    }))
  };

  return elk
    .layout(graph)
    .then((layoutedGraph) => ({
      nodes: (layoutedGraph.children || []).map((node) => ({
        ...node,
        // React Flow expects a position property on the node instead of `x`
        // and `y` fields.
        position: { x: node.x || 0, y: node.y || 0 },
      })) as Node<CustomNodeData>[],

      edges: validEdges,
    }))
    .catch((error) => {
      console.error(error);
      return undefined;
    });
}

function Flow() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const [nodes, setNodes] = useNodesState<Node<CustomNodeData>>(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  const updateLayout = useCallback((nodes: Node<CustomNodeData>[], edges: Edge[]) => {
    getLayoutedElements(nodes, edges, elkOptions).then((layouted) => {
      if (layouted) {
        setNodes(layouted.nodes);
        setEdges(layouted.edges);
      }
    });
  }, [setNodes, setEdges]);

  const onNodesChange = useCallback(
    (changes: NodeChange<Node<CustomNodeData>>[]) => {
      const updatedNodes = applyNodeChanges(changes, nodes);
      updateLayout(updatedNodes, edges);
    },
    [nodes, updateLayout, edges],
  );
  
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const updatedEdges = applyEdgeChanges(changes, edges);
      updateLayout(nodes, updatedEdges);
      console.log('edges changed')
    },
    [edges, nodes, updateLayout],
  );
  
  const onConnect = useCallback(
    (params: Connection) => {
      const updatedEdges = addEdge(params, edges);
      updateLayout(nodes, updatedEdges);
    },
    [edges, nodes, updateLayout],
  );

  const onConnectEnd: OnConnectEnd = useCallback(
    (_event, connectionState) => {
      // when a connection is dropped on the pane it's not valid
      if (!connectionState.isValid && connectionState.fromNode) {
        // we need to remove the wrapper bounds, in order to get the correct position
        const newId = nextId();

        const newNode: Node<CustomNodeData> = {
          id: newId,
          position: { x: 0, y: 0 },
          data: { label: `Node ${newId}` },
          type: 'custom',
        };

        const updatedEdges = addEdge(
          {
            id: newId, 
            source: connectionState.fromNode.id, 
            target: newId, 
            markerEnd: {
              type: MarkerType.Arrow,
            },
          },
          edges
        );

        const updatedNodes = nodes.concat(newNode);

        updateLayout(updatedNodes, updatedEdges);
      }
    },
    [edges, nodes, updateLayout],
  );

  return (
    <div ref={reactFlowWrapper} style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        nodeTypes={nodeTypes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
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
