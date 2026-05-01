export type LanguageCode = "en" | "es" | "fr" | "en-simple";

export type CognitiveLevel =
  | "simple"
  | "normal"
  | "detailed"
  | "beginner"
  | "advanced"
  | "five-year-old"
  | "citizen"
  | "policy-expert";

export type Tone = "warm" | "informative" | "warning" | "celebratory";

export type JourneyCategory =
  | "welcome"
  | "registration"
  | "verification"
  | "voting"
  | "counting"
  | "support"
  | "completion";

export type JourneyState =
  | "WELCOME"
  | "GOAL_SELECT"
  | "FIRST_TIME_START"
  | "REGISTRATION_CHECK"
  | "REGISTERED"
  | "UNREGISTERED"
  | "REGISTRATION_FLOW"
  | "DEADLINE_CHECK"
  | "IN_TIME"
  | "REGISTER_NOW"
  | "DEADLINE_PASSED"
  | "REGISTRATION_ISSUE"
  | "STATUS_LOOKUP"
  | "STATUS_FOUND"
  | "STATUS_NOT_FOUND"
  | "VERIFY_DETAILS"
  | "REREGISTER_NOW"
  | "BACKUP_VOTE_OPTION"
  | "ID_CHECK"
  | "ID_VALID"
  | "ID_ISSUE"
  | "ID_RESOLUTION_PATH"
  | "POLLING_FINDER"
  | "ACCESSIBLE_POLLING_FINDER"
  | "POLLING_CONFIRMED"
  | "VOTING_DAY_PREP"
  | "AT_POLLS"
  | "BACKUP_VOTE_EXPLAINED"
  | "MAIL_BALLOT_PATH"
  | "MAIL_BALLOT_SIGNATURE"
  | "MAIL_BALLOT_ENVELOPE"
  | "MAIL_BALLOT_SCAN"
  | "MAIL_BALLOT_COUNTED"
  | "EARLY_VOTING_PATH"
  | "LANGUAGE_SUPPORT_PATH"
  | "ACCESSIBILITY_NEEDS_PATH"
  | "MOBILITY_SUPPORT"
  | "VISION_SUPPORT"
  | "TRANSLATION_SUPPORT"
  | "VOTE_CAST"
  | "COUNTING_EXPLAINED"
  | "PRECINCT_DELAY_BRANCH"
  | "TABULATION"
  | "CERTIFICATION"
  | "RECOUNT_TRIGGER"
  | "COMPLETE";

export type RenderKey =
  | "WelcomeStep"
  | "GoalSelect"
  | "DecisionCard"
  | "RegistrationChecker"
  | "DeadlineCalculator"
  | "IDChecker"
  | "PollingFinder"
  | "BallotWalkthrough"
  | "VoteCounter"
  | "ConsequenceTree"
  | "AccessibilitySupport"
  | "JourneySummary"
  | "StatusSummary"
  | "JourneyGraph";

export interface ProgressState {
  step: number;
  total: number;
  label: string;
}

export interface PrimaryAction {
  label: string;
  action: string;
}

export interface OracleResponse {
  message: string;
  tone: Tone;
  render: RenderKey | null;
  renderProps: Record<string, unknown>;
  primaryAction: PrimaryAction;
  secondaryAction: PrimaryAction | null;
  progress: ProgressState;
  proactiveWarning: string | null;
  stateTransition: JourneyState;
  cognitiveLevel: CognitiveLevel;
  nextAnticipated: RenderKey | null;
  confidence?: number;
  speech?: string;
  warnings?: string[];
  trust?: TrustMetadata;
}

export interface CivicSource {
  id: string;
  title: string;
  url: string;
  publisher: string;
  lastVerified: string;
}

export interface TrustMetadata {
  sources: CivicSource[];
  confidence: number;
  lastVerified: string;
  rationale: string;
}

export interface OracleStreamChunk {
  delta: string;
  done?: boolean;
  trust?: TrustMetadata;
  response?: OracleResponse;
}

export type BadgeId =
  | "civic-newcomer"
  | "informed-voter"
  | "civic-champion"
  | "democracy-defender"
  | "constitutional-scholar";

export interface CivicBadge {
  id: BadgeId;
  label: string;
  threshold: number;
  icon: string;
  earned: boolean;
}

export interface CivicScoreResponse {
  score: number;
  badges: CivicBadge[];
  streakDays: number;
  highestBadge: CivicBadge | null;
}

export interface ScoreUpdate extends CivicScoreResponse {
  addedPoints: number;
  newlyUnlocked: CivicBadge[];
  reason: string;
}

export type CivicScoreEventType =
  | "onboarding_complete"
  | "oracle_question"
  | "journey_step_complete"
  | "journey_complete"
  | "outdated_source_reviewed"
  | "simulator_run"
  | "score_shared"
  | "return_streak";

export interface BallotSelection {
  president: string;
  senator: string;
  measureA: "yes" | "no";
}

export interface BallotEvent {
  serial: string;
  precinct: string;
  timestamp: string;
  encryptedPayload: string;
  signature: string;
}

export interface TallyResult {
  totalVotes: number;
  precinctsReporting: number;
  confidenceInterval: number;
  anomalyInjected: boolean;
  totals: Array<{ candidate: string; votes: number }>;
  affectedPrecinct?: string;
}

export interface CertificationEvent {
  certifiedAt: string;
  certificateId: string;
  provenanceChain: string[];
  summary: string;
}

export interface AuditResult {
  ballotsSampled: number;
  machineCount: number;
  handCount: number;
  discrepancy: number;
  recommendation: string;
}

export interface OnboardingProfile {
  location: string;
  familiarity: "first-time" | "some-experience" | "confident";
  accessibilityNeeds: string[];
  toneMode: Extract<CognitiveLevel, "five-year-old" | "citizen" | "policy-expert">;
  preferredLanguage?: LanguageCode;
  completedAt: string;
}

export interface OracleRequest {
  userMessage: string;
  currentState: JourneyState;
  history: HistoryEntry[];
  cognitiveLevel: CognitiveLevel;
  language: LanguageCode;
  sessionId?: string;
  profile?: OnboardingProfile | null;
}

export interface JourneyNode {
  id: JourneyState;
  label: string;
  category: JourneyCategory;
  allowedTransitions: JourneyState[];
  requiredConditions: Record<string, boolean>;
  consequenceData: {
    affects: string[];
    bestPath: string;
  };
  recoveryPaths: JourneyState[];
}

export interface HistoryEntry {
  state: JourneyState;
  timestamp: string;
  oracleMessage: string;
  decision: string;
  render: RenderKey | null;
  rewound?: boolean;
}

export interface OracleHistoryEntry {
  prompt: string;
  response: OracleResponse;
  timestamp: string;
  predictionHit: boolean;
}

export interface SessionPayload {
  journeyId: string;
  currentState: JourneyState;
  stateHistory: HistoryEntry[];
  oracleHistory: OracleHistoryEntry[];
  cognitiveLevel: CognitiveLevel;
  language: LanguageCode;
  bookmarkedStates: JourneyState[];
  completedJourneys: string[];
  profile: OnboardingProfile | null;
}

export interface PollingLocation {
  id: string;
  name: string;
  address: string;
  hours: string;
  lat: number;
  lng: number;
  accessible: boolean;
  curbside: boolean;
  languages: string[];
  parking: string;
}

export interface VoteCountParams {
  regionSize: number;
  candidateCount: number;
  precinctCount: number;
  recountThresholdPercent: number;
}

export interface VoteCountFrame {
  precinct: string;
  reportedVotes: number;
  outstandingVotes: number;
  totals: number[];
}

export interface DeadlineResult {
  state: string;
  deadlineLabel: string;
  daysRemaining: number;
  urgency: "green" | "amber" | "red";
  officialUrl: string;
}

export interface IdAnswers {
  hasPhotoId: boolean;
  hasAddressProof: boolean;
  nameMatches: boolean;
  stateIssued: boolean;
}

export interface IdCheckResult {
  status: "valid" | "partial" | "needs-action";
  message: string;
  nextSteps: string[];
}

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors: Record<string, string>;
}

export interface TranslationDictionary {
  appTitle: string;
  guestMode: string;
  signedInAs: string;
  keepGoing: string;
  goBack: string;
  tellMeMore: string;
  language: string;
  simple: string;
  normal: string;
  detailed: string;
  accessibleOnly: string;
  addToCalendar: string;
  directions: string;
  whatThisMeans: string;
  oneStepAtATime: string;
  confusionHeatmap: string;
}

export interface ContrastResult {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
}
