import { CustomNodeId } from "../core/Node";

export interface GraphNode {
    id: CustomNodeId;
    parents: CustomNodeId[];
}

export const GraphActions = {
    /**
     * Get all ancestors of a node
     */
    getAncestors: <T extends GraphNode>(nodeId: CustomNodeId, data: T[]): Set<CustomNodeId> => {
        const ancestors = new Set<CustomNodeId>();
        const toVisit = [nodeId];

        while (toVisit.length > 0) {
            const current = toVisit.pop()!;
            const node = data.find(n => n.id === current);

            if (node) {
                node.parents.forEach(parentId => {
                    if (!ancestors.has(parentId)) {
                        ancestors.add(parentId);
                        toVisit.push(parentId);
                    }
                });
            }
        }

        return ancestors;
    },

    /**
     * Get immediate children of a node
     */
    getImmediateChildren: <T extends GraphNode>(nodeId: CustomNodeId, data: T[]): Set<CustomNodeId> => {
        return new Set(
            data
                .filter(node => node.parents.includes(nodeId))
                .map(node => node.id)
        );
    },
}