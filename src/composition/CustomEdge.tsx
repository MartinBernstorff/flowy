import { BaseEdge, EdgeProps, getSimpleBezierPath, useReactFlow } from '@xyflow/react';
import { useState, useEffect } from 'react';
import { CustomNodeId } from 'src/persistence/NodeCollection';

interface CustomEdgeProps extends EdgeProps {
    onInsertNode?: (sourceId: CustomNodeId, targetId: CustomNodeId) => void;
}

export default function CustomEdge({
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    onInsertNode,
}: CustomEdgeProps) {
    const [isHovered, setIsHovered] = useState(false);
    const { deleteElements } = useReactFlow();

    const [edgePath] = getSimpleBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!isHovered) return;

            if (event.key === 'd') {
                deleteElements({ edges: [{ id }] });
            } else if ((event.key === 'a' || event.key === 'b') && onInsertNode) {
                onInsertNode(source as CustomNodeId, target as CustomNodeId);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isHovered, id, source, target, deleteElements, onInsertNode]);

    return (
        <>
            <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    stroke: isHovered ? 'hsl(0, 0%, 40%)' : 'hsl(0, 0%, 60%)',
                    strokeWidth: 1,
                }}
            />
            <path
                d={edgePath}
                fill="none"
                strokeWidth={10}
                stroke="transparent"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{ cursor: 'pointer' }}
            />
        </>
    );
}
