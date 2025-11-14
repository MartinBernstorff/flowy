import { Node, Edge } from '@xyflow/react';
import { RenderedNodeData } from '../App';
import ELK from 'elkjs/lib/elk.bundled.js';
import CustomNode from '../CustomNode';

export const elk = new ELK();

export async function getLayoutedElements(nodes: Node<RenderedNodeData>[], edges: Edge[]): Promise<{ nodes: Node<RenderedNodeData>[]; edges: Edge[]; }> {
  const isHorizontal = elkOptions?.['elk.direction'] === 'RIGHT';
  const nodeIds = new Set(nodes.map(node => node.id));

  // Filter out edges that don't have both valid source and target nodes
  const validEdges = edges.filter(edge => nodeIds.has(edge.source) && nodeIds.has(edge.target)
  );

  const graph = {
    id: 'root',
    layoutOptions: elkOptions,
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

  try {
    const layoutedGraph = await elk.layout(graph);
    return {
      nodes: (layoutedGraph.children || []).map((node) => ({
        ...node,
        // React Flow expects a position property on the node instead of `x`
        // and `y` fields.
        position: { x: node.x || 0, y: node.y || 0 },
      })) as Node<RenderedNodeData>[],

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

