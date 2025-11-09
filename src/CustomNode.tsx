import { useState, useEffect, useRef } from 'react';
import { Handle, Position, useConnection, useReactFlow } from '@xyflow/react';

interface CustomNodeData extends Record<string, unknown> {
    label: string;
    onAddNode?: (nodeId: string, direction: 'before' | 'after') => void;
}

interface CustomNodeProps {
    id: string;
    data: CustomNodeData;
}

export default function CustomNode({ id, data }: CustomNodeProps) {
    const connection = useConnection();
    const { deleteElements } = useReactFlow();
    const [isHovered, setIsHovered] = useState(false);
    const nodeRef = useRef<HTMLDivElement>(null);

    const isTarget = connection.inProgress && connection.fromNode.id !== id;

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!isHovered) return;

            const key = event.key.toLowerCase();

            event.preventDefault();

            switch (key) {
                case 'a':
                case 'b':
                    if (!data.onAddNode) return;
                    const direction = key === 'a' ? 'after' : 'before';
                    data.onAddNode(id, direction);
                    break;
                case 'd':
                    deleteElements({ nodes: [{ id }] });
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isHovered, id, data, deleteElements]);

    return (
        <div
            ref={nodeRef}
            className="px-4 py-2 shadow-sm rounded-sm bg-white border border-black relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex items-center justify-center">
                {/* Target handle covers the full node */}
                {(!connection.inProgress || isTarget) && (
                    <Handle
                        className="w-full! h-full! absolute! top-0! left-0! transform-none! border-none! rounded-none! opacity-0!"
                        position={Position.Top}
                        type="target"
                        isConnectableStart={false}
                    />
                )}
                {!connection.inProgress && (
                    <Handle
                        className="w-2! h-2! bg-gray-400!"
                        position={Position.Bottom}
                        type="source"
                    />
                )}
                {data.label}
            </div>
        </div>
    );
}
