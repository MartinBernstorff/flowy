import { CustomNode, GraphId, nodeCollection } from 'src/persistence/NodeCollection';
import { CustomNodeId } from "src/core/Node";

export interface GraphNode {
    id: CustomNodeId;
    parents: CustomNodeId[];
}

export const Graph = {
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

    /**
     * Add a new node before or after a target node
     */
    addNode: (target: CustomNodeId, direction: 'before' | 'after', graph: GraphId, newNodeLabel: (id: CustomNodeId) => string) => {
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
    },

    /**
     * Insert a new node between a source and target node
     */
    insertNode: (sourceId: CustomNodeId, targetId: CustomNodeId, graph: GraphId, newNodeLabel: (id: CustomNodeId) => string) => {
        const newNodeId = crypto.randomUUID() as CustomNodeId;

        // Create the new node with the source as its parent
        nodeCollection.insert({
            id: newNodeId,
            label: newNodeLabel(newNodeId),
            parents: [sourceId],
            isNew: true,
            graph: graph
        });

        // Update the target to replace the source with the new node
        nodeCollection.update(targetId, (node) => {
            node.parents = node.parents.map(parentId =>
                parentId === sourceId ? newNodeId : parentId
            );
        });
    },

    /**
     * Update node
     */
    updateNode: (nodeId: CustomNodeId, input: Partial<CustomNode>) => {
        nodeCollection.update(nodeId, (draft) => {
            Object.assign(draft, input);
        });
    },

    /**
     * Delete a node and reconnect its parents to its children
     */
    deleteNode: <T extends GraphNode>(nodeId: CustomNodeId, nodes: T[]) => {
        const nodeToDelete = nodes.find(n => n.id === nodeId);
        if (!nodeToDelete) return;

        const parents = nodeToDelete.parents;
        const children = nodes.filter(n => n.parents.includes(nodeId));

        // If the node has both parents and children, link parents to all children
        if (parents.length > 0 && children.length > 0) {
            children.forEach(child => {
                nodeCollection.update(child.id, (node) => {
                    node.parents = node.parents.filter(p => p !== nodeId).concat(parents);
                });
            });
        } else if (children.length > 0) {
            // If node has children but no parents, remove this node from children's parent list
            children.forEach(child => {
                nodeCollection.update(child.id, (node) => {
                    node.parents = node.parents.filter(p => p !== nodeId);
                });
            });
        }

        // Delete the node
        nodeCollection.delete(nodeId);
    }
}