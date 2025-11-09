import { useCallback, useRef } from 'react';
import {
  ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, Background, useNodesState,
  useEdgesState
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ReactFlowProvider } from '@xyflow/react';
import ELK from 'elkjs/lib/elk.bundled.js';
import { MarkerType } from '@xyflow/react';
import CustomNode from './CustomNode.jsx';


const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' }, type: 'custom' },
];
const initialEdges = [];

var id = 3;
const nextId = () => `${id++}`;

const elk = new ELK();

const nodeTypes = {
  custom: CustomNode,
};

const elkOptions = {
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

function getLayoutedElements(nodes, edges, options) {
  const isHorizontal = options?.['elk.direction'] === 'RIGHT';
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
    edges: edges,
  };

  return elk
    .layout(graph)
    .then((layoutedGraph) => ({
      nodes: layoutedGraph.children.map((node) => ({
        ...node,
        // React Flow expects a position property on the node instead of `x`
        // and `y` fields.
        position: { x: node.x, y: node.y },
      })),

      edges: layoutedGraph.edges,
    }))
    .catch(console.error);
};

function Flow() {
  const reactFlowWrapper = useRef(null);

  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  const onNodesChange = useCallback(
    (changes) => {
      const updatedNodes = applyNodeChanges(changes, nodes);
      updateLayout(updatedNodes, edges);
    },
    [nodes, updateLayout, edges],
  );
  const onEdgesChange = useCallback(
    (changes) => {
      const updatedEdges = applyEdgeChanges(changes, edges);
      updateLayout(nodes, updatedEdges);
      console.log('edges changed')
    },
    [edges, nodes, updateLayout],
  );
  const onConnect = useCallback(
    (params) => {
      const updatedEdges = addEdge(params, edges);
      updateLayout(nodes, updatedEdges);
    },
    [edges, nodes, updateLayout],
  );

  const onConnectEnd = useCallback(
    (_event, connectionState) => {
      // when a connection is dropped on the pane it's not valid
      if (!connectionState.isValid) {
        // we need to remove the wrapper bounds, in order to get the correct position
        const id = nextId();

        const newNode = {
          id,
          position: { x: 0, y: 0 },
          data: { label: `Node ${id}` },
          type: 'custom',
        };

        const updatedEdges = addEdge(
          {
            id, source: connectionState.fromNode.id, target: id, markerEnd: {
              type: MarkerType.Arrow, // or MarkerType.ArrowClosed
            },
          },
          edges
        );

        const updatedNodes = nodes.concat(newNode);

        updateLayout(updatedNodes, updatedEdges);
      }
    },
    [edges, nodes],
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

  function updateLayout(nodes, edges) {
    getLayoutedElements(nodes, edges, elkOptions).then((layouted) => {
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
    });
  }
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}