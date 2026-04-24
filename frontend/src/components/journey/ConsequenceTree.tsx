import ReactFlow, { Background, Controls, MarkerType, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";

interface ConsequenceTreeProps {
  affects?: string[];
  recoveryPaths?: string[];
  bestPath?: string;
}

const ConsequenceTree = ({
  affects = ["Your regular ballot path may be blocked."],
  recoveryPaths = ["Ask for a backup vote option."],
  bestPath = "Ask for the backup option before you leave."
}: ConsequenceTreeProps) => {
  const nodes: Node[] = [
    {
      id: "decision",
      data: { label: "What happened" },
      position: { x: 230, y: 20 },
      style: { background: "#FFF4E0", border: "1px solid #C4730A", borderRadius: 18, width: 160 }
    },
    ...affects.map((item, index) => ({
      id: `affect-${index}`,
      data: { label: item },
      position: { x: index * 220, y: 170 },
      style: { background: "#FFFFFF", border: "1px solid #E8E6E1", borderRadius: 18, width: 180 }
    })),
    ...recoveryPaths.map((item, index) => ({
      id: `recovery-${index}`,
      data: { label: item },
      position: { x: index * 220, y: 320 },
      style: { background: "#E8F5EE", border: "1px solid #2D7D5A", borderRadius: 18, width: 180 }
    }))
  ];

  const edges: Edge[] = [
    ...affects.map((_, index) => ({
      id: `edge-${index}`,
      source: "decision",
      target: `affect-${index}`,
      markerEnd: { type: MarkerType.ArrowClosed }
    })),
    ...recoveryPaths.map((_, index) => ({
      id: `recovery-edge-${index}`,
      source: `affect-${Math.min(index, affects.length - 1)}`,
      target: `recovery-${index}`,
      markerEnd: { type: MarkerType.ArrowClosed }
    }))
  ];

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_8px_24px_var(--shadow)]">
      <h2 className="px-2 text-[1.5rem] font-bold text-[var(--ink)]">What this affects</h2>
      <p className="px-2 pt-2 text-[var(--ink-secondary)]">{bestPath}</p>
      <div className="mt-4 h-[420px] rounded-[18px] border border-[var(--border)]">
        <ReactFlow nodes={nodes} edges={edges} fitView nodesDraggable={false}>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </section>
  );
};

export default ConsequenceTree;
