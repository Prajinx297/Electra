import type { ReactNode } from 'react';
import ReactFlow, { Background, type Edge, type Node } from 'reactflow';

import 'reactflow/dist/style.css';

import { useElectraStore } from '../../engines/stateEngine';
import type { HistoryEntry } from '../../types';

/** Maximum journey nodes rendered simultaneously inside the mini-flow preview. */
const JOURNEY_GRAPH_VISIBLE_STEP_WINDOW = 4;

/** Horizontal spacing between synthesized React Flow nodes (pixels). */
const JOURNEY_GRAPH_NODE_STEP_X_PX = 180;

/** Vertical baseline offset applied to every synthesized node (pixels). */
const JOURNEY_GRAPH_NODE_BASELINE_Y_PX = 40;

/** Fixed canvas height utility class for embedded React Flow canvases. */
const JOURNEY_GRAPH_CANVAS_HEIGHT_CLASS = 'h-[280px]';

/** Neutral chrome border token applied to journey nodes. */
const JOURNEY_GRAPH_NODE_BORDER_HEX = '#E8E6E1';

/** Highlight fill applied to the active (latest) journey step node. */
const JOURNEY_GRAPH_NODE_ACTIVE_FILL_HEX = '#E8F5EE';

/** Default fill for historical nodes prior to the active step. */
const JOURNEY_GRAPH_NODE_DEFAULT_FILL_HEX = '#FFFFFF';

/** Typography color applied to node labels for WCAG-friendly contrast. */
const JOURNEY_GRAPH_NODE_TEXT_HEX = '#1A1A2E';

/** Fixed node width for consistent mini-graph alignment. */
const JOURNEY_GRAPH_NODE_WIDTH_PX = 150;

/** Corner radius applied to each synthesized mini-graph node. */
const JOURNEY_GRAPH_NODE_RADIUS_PX = 18;

/** Internal padding applied inside each node chrome box. */
const JOURNEY_GRAPH_NODE_PADDING_PX = 10;

/**
 * Props for {@link JourneyGraph}.
 *
 * The graph intentionally stays prop-less today — it hydrates entirely from
 * {@link useElectraStore} so lazy-loaded civic routes avoid redundant plumbing.
 */
export interface JourneyGraphProps {
  /** Reserved for future overrides; intentionally unused in the current UX shell. */
  readonly storeBacked?: true;
}

/**
 * Converts trimmed Electra history entries into React Flow nodes.
 *
 * @param recent - Chronologically ordered slice of learner journey checkpoints.
 * @returns Positional React Flow nodes describing each checkpoint visually.
 */
function journeyEntriesToNodes(recent: HistoryEntry[]): Node[] {
  return recent.map((entry: HistoryEntry, index: number): Node => {
    const isLatest = index === recent.length - 1;
    return {
      id: `${entry.state}-${String(index)}`,
      data: { label: entry.state.replace(/_/g, ' ') },
      position: {
        x: index * JOURNEY_GRAPH_NODE_STEP_X_PX,
        y: JOURNEY_GRAPH_NODE_BASELINE_Y_PX,
      },
      style: {
        borderRadius: JOURNEY_GRAPH_NODE_RADIUS_PX,
        border: `1px solid ${JOURNEY_GRAPH_NODE_BORDER_HEX}`,
        padding: JOURNEY_GRAPH_NODE_PADDING_PX,
        background: isLatest ? JOURNEY_GRAPH_NODE_ACTIVE_FILL_HEX : JOURNEY_GRAPH_NODE_DEFAULT_FILL_HEX,
        color: JOURNEY_GRAPH_NODE_TEXT_HEX,
        width: JOURNEY_GRAPH_NODE_WIDTH_PX,
      },
    };
  });
}

/**
 * Builds directed edges between sequential nodes in the trimmed journey slice.
 *
 * @param recent - Same trimmed slice used for {@link journeyEntriesToNodes}.
 * @returns Edge definitions wiring each prior step to its successor.
 */
function journeyEntriesToEdges(recent: HistoryEntry[]): Edge[] {
  return recent.slice(1).map((entry: HistoryEntry, index: number): Edge => ({
    id: `${recent[index]?.state ?? 'start'}-${entry.state}`,
    source: `${recent[index]?.state ?? entry.state}-${String(index)}`,
    target: `${entry.state}-${String(index + 1)}`,
  }));
}

/**
 * Compact React Flow preview summarizing the learner's recent civic checkpoints.
 *
 * Reads {@link useElectraStore.history}, trims to the latest window, and renders a non-draggable
 * digest suitable for Agentic UI side rails.
 *
 * @param _props - Reserved prop bag for future graph customization hooks.
 * @returns Embedded React Flow canvas wrapped in civic chrome.
 */
export default function JourneyGraph(_props: JourneyGraphProps): ReactNode {
  const { history } = useElectraStore();
  const recent = history.slice(-JOURNEY_GRAPH_VISIBLE_STEP_WINDOW);
  const nodes = journeyEntriesToNodes(recent);
  const edges = journeyEntriesToEdges(recent);

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_8px_24px_var(--shadow)]">
      <h2 className="px-2 text-[1.5rem] font-bold text-[var(--ink)]">Your path so far</h2>
      <div className={`mt-4 ${JOURNEY_GRAPH_CANVAS_HEIGHT_CLASS} rounded-[18px] border border-[var(--border)]`}>
        <ReactFlow edges={edges} fitView nodes={nodes} nodesDraggable={false}>
          <Background />
        </ReactFlow>
      </div>
    </section>
  );
}
