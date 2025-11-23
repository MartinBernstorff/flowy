import { Node, Edge } from '@xyflow/react';
import ELK from 'elkjs/lib/elk.bundled.js';
import CustomNode from '../composition/CustomNode';
import CustomEdge from '../composition/CustomEdge';
import { FlowyNodeData } from 'src/app/App';

export const elk = new ELK();

export async function getLayoutedElements(nodes: Node<FlowyNodeData>[], edges: Edge[]): Promise<{ nodes: Node<FlowyNodeData>[]; edges: Edge[]; }> {
  const nodeIds = new Set(nodes.map(node => node.id));

  // Filter out edges that don't have both valid source and target nodes
  const validEdges = edges.filter(edge => nodeIds.has(edge.source) && nodeIds.has(edge.target));

  const graph = {
    id: 'root',
    layoutOptions: elkOptions,
    children: nodes.map((node) => ({
      ...node,
      // Hardcode a width and height for elk to use when layouting.
      width: 150,
      height: 100,
    })),
    edges: validEdges.map(edge => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    }))
  };

  try {
    const layoutedGraph = await elk.layout(graph);
    return {
      // XXX: Throw an error if children is empty?
      nodes: (layoutedGraph.children || []).map((node) => ({
        ...node,
        position: { x: node.x || 0, y: node.y || 0 },
      })),
      edges: validEdges,
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export const elkOptions: Record<string, string> = {
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

export const nodeTypes = {
  custom: CustomNode,
};

export const edgeTypes = {
  custom: CustomEdge,
};


