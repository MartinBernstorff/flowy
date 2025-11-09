import { Handle, Position, useConnection } from '@xyflow/react';

interface CustomNodeData extends Record<string, unknown> {
  label: string;
}

interface CustomNodeProps {
  id: string;
  data: CustomNodeData;
}

export default function CustomNode({ id, data }: CustomNodeProps) {
  const connection = useConnection();

  const isTarget = connection.inProgress && connection.fromNode.id !== id;

  return (
    <div className="px-4 py-2 shadow-sm rounded-sm bg-white border border-black relative">
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
