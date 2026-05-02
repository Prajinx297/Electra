/**
 * All valid render targets the Oracle can select.
 * Each maps to a React component in ComponentRegistry.
 */
export enum RenderKey {
  /** Electoral map of polling stations */
  Map = 'map',
  /** Voter registration form */
  Form = 'form',
  /** Civic knowledge quiz */
  Quiz = 'quiz',
  /** Full ballot walkthrough simulation */
  ElectionSimulator = 'election_simulator',
  /** Confusion heatmap visualization */
  ConfusionHeatmap = 'confusion_heatmap',
  /** Civic engagement score display */
  CivicScore = 'civic_score',
  /** Journey completion summary */
  Summary = 'summary',
}

/** User's preferred explanation complexity level. */
export enum CognitiveLevel {
  /** Plain language, short sentences */
  Simple = 'simple',
  /** Full context with background information */
  Detailed = 'detailed',
  /** Constitutional and statutory terminology */
  Legal = 'legal',
}

/** Async operation lifecycle states. */
export enum JourneyStatus {
  /** No operation in progress */
  Idle = 'idle',
  /** Request is in flight */
  Loading = 'loading',
  /** Request completed successfully */
  Success = 'success',
  /** Request failed with an error */
  Error = 'error',
}

/**
 * Structured response from the Electra Oracle API.
 */
export interface OracleResponse {
  /** Which React component the Oracle wants to render */
  renderKey: RenderKey;
  /** Explanation text in the requested cognitive level */
  explanation: string;
  /** Props forwarded to the rendered component */
  componentProps: Record<string, unknown>;
  /** Oracle's top predictions for the user's next action */
  predictedNextKeys: RenderKey[];
  /** Score increase to award for this civic step */
  civicScoreDelta: number;
  /** Oracle's confidence in this render decision (0-1) */
  confidence: number;
}

/**
 * A single node in the user's civic journey directed acyclic graph.
 * Enables the Temporal Rewind Engine to restore any prior state.
 */
export interface JourneyNode {
  /** UUID v4 identifier for this node */
  id: string;
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Oracle-selected component rendered at this step */
  renderKey: RenderKey;
  /** Raw user input that triggered this Oracle call */
  userInput: string;
  /** The full Oracle response that created this node */
  oracleResponse: OracleResponse;
}

/** Structured request sent to the Electra Oracle API. */
export interface OracleRequest {
  /** The civic question or action from the user */
  userInput: string;
  /** User's preferred explanation style */
  cognitiveLevel: CognitiveLevel;
  /** Firebase session/user ID for telemetry */
  sessionId: string;
  /** Last N journey nodes for Oracle context */
  journeyHistory: JourneyNode[];
  /** BCP-47 locale code (e.g. "en", "hi", "ta") */
  locale: string;
}

/** A confusion telemetry event emitted by the civicBus. */
export interface ConfusionEvent {
  /** The component that triggered the confusion signal */
  componentKey: RenderKey;
  /** Type of confusion behavior detected */
  type: 'reread' | 'retreat' | 'timeout' | 'stuck';
  /** How long the user spent before the confusion signal */
  durationMs: number;
  /** Session ID for heatmap aggregation */
  sessionId: string;
}

/** Authenticated or anonymous user state. */
export interface UserState {
  /** Firebase UID (null if not yet authenticated) */
  uid: string | null;
  /** True when signed in anonymously before Google OAuth */
  isAnonymous: boolean;
  /** Current accumulated civic engagement score */
  civicScore: number;
  /** User's preferred explanation complexity */
  cognitiveLevel: CognitiveLevel;
  /** Active locale for LLM translation routing */
  locale: string;
}
