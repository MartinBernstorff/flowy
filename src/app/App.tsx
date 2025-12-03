import { ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Main } from '@/page/Main';

export default function App() {
  return (
    <ReactFlowProvider>
      <Main />
    </ReactFlowProvider>
  );
}
