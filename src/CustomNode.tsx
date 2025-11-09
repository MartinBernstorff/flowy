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
    <div className="customNode">
      <div
        className="customNodeBody"
      >
        {/* If handles are conditionally rendered and not present initially, you need to update the node internals https://reactflow.dev/docs/api/hooks/use-update-node-internals/ */}
        {/* In this case we don't need to use useUpdateNodeInternals, since !isConnecting is true at the beginning and all handles are rendered initially. */}
        {!connection.inProgress && (
          <Handle
            className="customHandle"
            position={Position.Bottom}
            type="source"
          />
        )}
        {/* We want to disable the target handle, if the connection was started from this node */}
        {(!connection.inProgress || isTarget) && (
          <Handle className="customHandle" position={Position.Top} type="target" isConnectableStart={false} />
        )}
        {data.label}
      </div>
    </div>
  );
}
