import { useState, useEffect, useRef } from 'react';
import { Handle, Position, useConnection } from '@xyflow/react';
import { CustomNodeId } from "../core/Node";
import { Graph } from '../action/GraphActions';

interface CustomNodeProps {
    id: string;
    data: FlowyRenderableNode;
}

// A react-flow node must take properties id and data
export default function CustomNode({ id, data }: CustomNodeProps) {
    const customNodeId = id as CustomNodeId;
    const connection = useConnection();
    const [isHovered, setIsHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(data.isNew || false);
    const [editedLabel, setEditedLabel] = useState(data.label);
    const nodeRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const isTarget = connection.inProgress && connection.fromNode.id !== customNodeId;

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

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        switch (event.key) {
            case 'Enter':
                event.preventDefault();
                Graph.updateNode(customNodeId, {
                    label: editedLabel,
                    isNew: false
                });
                setIsEditing(false);
                break;
            case 'Escape':
                event.preventDefault();
                setIsEditing(false);
                setEditedLabel(data.label);

                if (data.isNew) {
                    Graph.updateNode(customNodeId, {
                        isNew: false
                    });
                }

                break;
        }
    };

    const handleBlur = () => {
        Graph.updateNode(customNodeId,
            {
                label: editedLabel,
                isNew: false
            }
        );
        setIsEditing(false);
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!isHovered) return;
            if (isEditing) return;

            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                return;
            }

            const key = event.key.toLowerCase();

            event.preventDefault();

            switch (key) {
                case 'a':
                case 'b': {
                    const direction = key === 'a' ? 'after' : 'before';
                    data.actions.onAddNode(customNodeId, direction);
                    break;
                }
                case 'd':
                    data.actions.onDeleteNode(customNodeId);
                    break;
                case 'w':
                    data.actions.onPromoteNode(customNodeId);
                    break;
                case 'e':
                    event.preventDefault();
                    setIsEditing(true);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isHovered, customNodeId, data, isEditing]);

    const fieldClasses = "border-none outline-none bg-transparent text-center wrap-break-word w-full h-full resize-none text-black overflow-hidden text-sm";

    const getStateStyle = () => {
        if (data.isPromoted) {
            return 'border-2 border-orange-300 bg-white';
        }
        if (isHovered) {
            return 'border-2 border-black bg-gray-200';
        }
        return 'border-2 border-gray-300 bg-white';
    };

    return (
        <div
            ref={nodeRef}
            className={`w-32 h-24 shadow-sm rounded-sm ${getStateStyle()} relative flex items-center justify-center p-2 shadow-sm cursor-pointer`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
        >
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
                <textarea
                    ref={inputRef as unknown as React.RefObject<HTMLTextAreaElement>}
                    value={editedLabel}
                    onChange={(e) => setEditedLabel(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    className={fieldClasses}
                />
            ) : (
                <span
                    className={fieldClasses}
                >
                    {data.label}
                </span>
            )}
        </div>
    );
}

export interface FlowyNodeActions {
    onAddNode: (nodeId: string, direction: 'before' | 'after') => void;
    onDeleteNode: (nodeId: string) => void;
    onPromoteNode: (nodeId: string) => void;
    onUnpromoteNode: () => void;
}

export interface FlowyNodeData extends Record<string, unknown> {
    label: string;
    isNew: boolean;
    isPromoted: boolean;
}

export interface FlowyRenderableNode extends FlowyNodeData {
    actions: FlowyNodeActions;
}



