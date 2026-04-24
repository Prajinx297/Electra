import ReactFlow, { Background, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { useElectraStore } from "../../engines/stateEngine";

const JourneyGraph = () => {
  const { history } = useElectraStore();
  const recent = history.slice(-4);
  const nodes: Node[] = recent.map((entry, index) => ({
    id: `${entry.state}-${index}`,
    data: { label: entry.state.replace(/_/g, " ") },
    position: { x: index * 180, y: 40 },
    style: {
      borderRadius: 18,
      border: "1px solid #E8E6E1",
      padding: 10,
      background: index === recent.length - 1 ? "#E8F5EE" : "#FFFFFF",
      color: "#1A1A2E",
      width: 150
    }
  }));
  const edges: Edge[] = recent.slice(1).map((entry, index) => ({
    id: `${recent[index].state}-${entry.state}`,
    source: `${recent[index].state}-${index}`,
    target: `${entry.state}-${index + 1}`
  }));

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_8px_24px_var(--shadow)]">
      <h2 className="px-2 text-[1.5rem] font-bold text-[var(--ink)]">Your path so far</h2>
      <div className="mt-4 h-[280px] rounded-[18px] border border-[var(--border)]">
        <ReactFlow nodes={nodes} edges={edges} fitView nodesDraggable={false}>
          <Background />
        </ReactFlow>
      </div>
    </section>
  );
};

export default JourneyGraph;
