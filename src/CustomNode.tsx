import { useState, useEffect, useRef } from 'react';
import { Handle, Position, useConnection } from '@xyflow/react';
import { nodeCollection } from './persistence/NodeCollection';

interface CustomNodeData extends Record<string, unknown> {
    label: string;
    isNew?: boolean;
    onAddNode?: (nodeId: string, direction: 'before' | 'after') => void;
}

interface CustomNodeProps {
    id: string;
    data: CustomNodeData;
}

export default function CustomNode({ id, data }: CustomNodeProps) {
    const connection = useConnection();
    const [isHovered, setIsHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(data.isNew || false);
    const [editedLabel, setEditedLabel] = useState(data.label);
    const nodeRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const isTarget = connection.inProgress && connection.fromNode.id !== id;

    // Auto-enter edit mode for new nodes
    useEffect(() => {
        if (data.isNew) {
            setIsEditing(true);
            setIsHovered(false);
        }
    }, [data.isNew]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleClick = () => {
        setIsHovered(false);
        setIsEditing(true);
        setEditedLabel(data.label);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        switch (event.key) {
            case 'Enter':
                event.preventDefault();
                nodeCollection.update(id, (node) => {
                    node.label = editedLabel;
                    node.isNew = false;
                });
                setIsEditing(false);
                break;
            case 'Escape':
                event.preventDefault();
                setIsEditing(false);
                setEditedLabel(data.label);
                if (data.isNew) {
                    nodeCollection.update(id, (node) => {
                        node.isNew = false;
                    });
                }
                break;
        }
    };

    const handleBlur = () => {
        nodeCollection.update(id, (node) => {
            node.label = editedLabel;
            node.isNew = false;
        });
        setIsEditing(false);
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!isHovered) return;
            if (isEditing) return;

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
                    nodeCollection.delete(id);
                    break;
                case 'e':
                    event.preventDefault();
                    setIsEditing(true);
                    setIsHovered(false);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isHovered, id, data]);

    return (
        <div
            ref={nodeRef}
            className={`px-4 py-2 shadow-sm rounded-sm border ${isHovered ? 'border-black bg-gray-200' : 'border-gray-300 bg-white'} relative`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
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
                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={editedLabel}
                        onChange={(e) => setEditedLabel(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        className="border-none outline-none bg-transparent text-center px-1 text-black"
                        style={{ width: `${Math.max(50, editedLabel.length * 8)}px` }}
                    />
                ) : (
                    <span className={`text-black ${isHovered ? 'border-gray-300' : ''}`}>{data.label}</span>
                )}
            </div>
        </div>
    );
}
