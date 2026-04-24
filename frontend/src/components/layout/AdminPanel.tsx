import { useElectraStore } from "../../engines/stateEngine";
import { getCopy } from "../../i18n";
import ReactFlow, { Background, Controls, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";

export const AdminPanel = () => {
  const { history, language } = useElectraStore();
  const counts = history.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.state] = (acc[entry.state] ?? 0) + 1;
    return acc;
  }, {});
  const steps = Object.entries(counts);
  const nodes: Node[] = steps.map(([state, count], index) => ({
    id: state,
    data: { label: `${state.replace(/_/g, " ")} (${count})` },
    position: { x: (index % 3) * 220, y: Math.floor(index / 3) * 110 },
    style: {
      borderRadius: 18,
      border: "1px solid #E8E6E1",
      background: count > 1 ? "#FFF4E0" : "#FFFFFF",
      width: 180
    }
  }));
  const edges: Edge[] = steps.slice(1).map(([state], index) => ({
    id: `${steps[index][0]}-${state}`,
    source: steps[index][0],
    target: state
  }));

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-8">
      <section className="rounded-[28px] bg-[var(--surface)] p-6 shadow-[0_8px_24px_var(--shadow)]">
        <h1 className="text-[2rem] font-extrabold text-[var(--ink)]">
          {getCopy(language, "confusionHeatmap")}
        </h1>
        <p className="mt-2 text-[var(--ink-secondary)]">
          Darker warm blocks show where people spent longer or came back again.
        </p>
        <div className="mt-6 h-[620px] rounded-[24px] border border-[var(--border)]">
          <ReactFlow nodes={nodes} edges={edges} fitView>
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      </section>
    </main>
  );
};
