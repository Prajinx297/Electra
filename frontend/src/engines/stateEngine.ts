import { create } from "zustand";
import { predictNextRender, scorePrediction } from "./predictionEngine";
import type {
  CognitiveLevel,
  HistoryEntry,
  JourneyCategory,
  JourneyNode,
  JourneyState,
  LanguageCode,
  OracleHistoryEntry,
  OracleResponse,
  RenderKey,
  SessionPayload
} from "../types";
import { readLanguagePreference } from "../utils/validators";

const node = (
  id: JourneyState,
  label: string,
  category: JourneyCategory,
  allowedTransitions: JourneyState[],
  bestPath: string,
  affects: string[],
  recoveryPaths: JourneyState[] = []
): JourneyNode => ({
  id,
  label,
  category,
  allowedTransitions,
  requiredConditions: {},
  consequenceData: {
    affects,
    bestPath
  },
  recoveryPaths
});

export const JOURNEY_GRAPH: Record<JourneyState, JourneyNode> = {
  WELCOME: node("WELCOME", "Welcome", "welcome", ["GOAL_SELECT"], "Pick your goal.", [], []),
  GOAL_SELECT: node("GOAL_SELECT", "Choose your goal", "welcome", ["FIRST_TIME_START", "REGISTRATION_ISSUE", "ID_ISSUE", "COUNTING_EXPLAINED", "ACCESSIBILITY_NEEDS_PATH"], "Choose the reason you are here today.", [], []),
  FIRST_TIME_START: node("FIRST_TIME_START", "First-time voter", "registration", ["REGISTRATION_CHECK"], "Check whether you are registered.", ["You need a place to start."], []),
  REGISTRATION_CHECK: node("REGISTRATION_CHECK", "Checking registration", "registration", ["REGISTERED", "UNREGISTERED", "REGISTRATION_ISSUE"], "Find out if you are already registered.", ["This decides your next step."], ["STATUS_LOOKUP"]),
  REGISTERED: node("REGISTERED", "You are registered", "registration", ["ID_CHECK", "POLLING_FINDER"], "Get your ID ready.", ["You are ready for the next step."], []),
  UNREGISTERED: node("UNREGISTERED", "Not registered yet", "registration", ["REGISTRATION_FLOW", "DEADLINE_CHECK"], "Start registration now.", ["You cannot cast a regular ballot yet."], ["BACKUP_VOTE_OPTION"]),
  REGISTRATION_FLOW: node("REGISTRATION_FLOW", "Registration flow", "registration", ["DEADLINE_CHECK", "REGISTER_NOW"], "Finish registration while there is time.", ["Missing the deadline changes your options."], []),
  DEADLINE_CHECK: node("DEADLINE_CHECK", "Check the deadline", "registration", ["IN_TIME", "DEADLINE_PASSED"], "See how much time you have left.", ["Deadlines change what you can do."], ["BACKUP_VOTE_OPTION"]),
  IN_TIME: node("IN_TIME", "Still in time", "registration", ["REGISTER_NOW"], "Register now.", ["You still have time."], []),
  REGISTER_NOW: node("REGISTER_NOW", "Register now", "registration", ["ID_CHECK", "POLLING_FINDER"], "Finish registration and move to your next voting step.", ["Small steps now prevent stress later."], []),
  DEADLINE_PASSED: node("DEADLINE_PASSED", "Deadline passed", "registration", ["BACKUP_VOTE_OPTION", "POLLING_FINDER"], "Look at the best backup path.", ["Regular registration may be closed.", "You may need a backup vote option."], ["BACKUP_VOTE_OPTION"]),
  REGISTRATION_ISSUE: node("REGISTRATION_ISSUE", "Registration issue", "registration", ["STATUS_LOOKUP", "VERIFY_DETAILS"], "Check your status calmly.", ["You may still have time to fix this."], ["REREGISTER_NOW", "BACKUP_VOTE_OPTION"]),
  STATUS_LOOKUP: node("STATUS_LOOKUP", "Look up your status", "registration", ["STATUS_FOUND", "STATUS_NOT_FOUND"], "See whether your registration was received.", ["This helps you choose the right fix."], []),
  STATUS_FOUND: node("STATUS_FOUND", "Status found", "registration", ["ID_CHECK", "POLLING_FINDER"], "You can move forward with confidence.", ["You now know you are in the system."], []),
  STATUS_NOT_FOUND: node("STATUS_NOT_FOUND", "Status not found", "registration", ["VERIFY_DETAILS", "REREGISTER_NOW", "BACKUP_VOTE_OPTION"], "Fix what you still can.", ["You may need to act today."], ["REREGISTER_NOW", "BACKUP_VOTE_OPTION"]),
  VERIFY_DETAILS: node("VERIFY_DETAILS", "Verify your details", "registration", ["STATUS_FOUND", "STATUS_NOT_FOUND", "REREGISTER_NOW"], "Check your name, address, and date of birth.", ["A small detail can block your registration."], []),
  REREGISTER_NOW: node("REREGISTER_NOW", "Register again now", "registration", ["DEADLINE_CHECK", "ID_CHECK"], "Start a clean registration path.", ["Re-registering can solve missing status problems."], []),
  BACKUP_VOTE_OPTION: node("BACKUP_VOTE_OPTION", "Backup vote option", "verification", ["ID_CHECK", "POLLING_FINDER", "AT_POLLS"], "Learn what you can still do today.", ["You may still be able to vote."], ["AT_POLLS"]),
  ID_CHECK: node("ID_CHECK", "Check your ID", "verification", ["ID_VALID", "ID_ISSUE"], "Find out whether your ID should work.", ["This can change your voting-day plan."], ["ID_RESOLUTION_PATH"]),
  ID_VALID: node("ID_VALID", "ID looks good", "verification", ["POLLING_FINDER", "VOTING_DAY_PREP"], "Get ready for voting day.", ["You have cleared one big step."], []),
  ID_ISSUE: node("ID_ISSUE", "ID problem", "verification", ["ID_RESOLUTION_PATH", "BACKUP_VOTE_EXPLAINED"], "See the safest fix right now.", ["You may need a backup plan.", "Time may matter today."], ["BACKUP_VOTE_EXPLAINED", "AT_POLLS"]),
  ID_RESOLUTION_PATH: node("ID_RESOLUTION_PATH", "Fix your ID issue", "verification", ["ID_VALID", "BACKUP_VOTE_EXPLAINED", "POLLING_FINDER"], "Choose the best fix that is still possible.", ["You may still have a path to vote."], ["BACKUP_VOTE_EXPLAINED"]),
  POLLING_FINDER: node("POLLING_FINDER", "Find where to vote", "voting", ["ACCESSIBLE_POLLING_FINDER", "POLLING_CONFIRMED"], "Pick the easiest place to get to.", ["Going to the wrong place can waste time."], ["ACCESSIBLE_POLLING_FINDER"]),
  ACCESSIBLE_POLLING_FINDER: node("ACCESSIBLE_POLLING_FINDER", "Find accessible voting places", "support", ["POLLING_CONFIRMED"], "Choose a place that works for your needs.", ["Accessibility support can make voting much easier."], []),
  POLLING_CONFIRMED: node("POLLING_CONFIRMED", "Place confirmed", "voting", ["VOTING_DAY_PREP", "AT_POLLS"], "You now know where to go.", ["A clear plan lowers stress."], []),
  VOTING_DAY_PREP: node("VOTING_DAY_PREP", "Get ready for voting day", "voting", ["AT_POLLS", "MAIL_BALLOT_PATH", "EARLY_VOTING_PATH"], "Pack what you need and choose your timing.", ["A simple plan helps avoid surprises."], []),
  AT_POLLS: node("AT_POLLS", "At the polling place", "voting", ["VOTE_CAST", "BACKUP_VOTE_EXPLAINED"], "Stay calm and ask what you can still do.", ["Even here, you may still have options."], ["BACKUP_VOTE_EXPLAINED"]),
  BACKUP_VOTE_EXPLAINED: node("BACKUP_VOTE_EXPLAINED", "Backup vote explained", "voting", ["AT_POLLS", "VOTE_CAST"], "Use the backup path if needed.", ["This can protect your chance to vote."], ["AT_POLLS"]),
  MAIL_BALLOT_PATH: node("MAIL_BALLOT_PATH", "Mail ballot path", "voting", ["MAIL_BALLOT_SIGNATURE"], "Take your ballot step by step.", ["A missed step can delay your ballot."], []),
  MAIL_BALLOT_SIGNATURE: node("MAIL_BALLOT_SIGNATURE", "Sign the ballot", "voting", ["MAIL_BALLOT_ENVELOPE"], "Sign before sealing anything.", ["A missing signature can stop your ballot."], []),
  MAIL_BALLOT_ENVELOPE: node("MAIL_BALLOT_ENVELOPE", "Seal the envelope", "voting", ["MAIL_BALLOT_SCAN"], "Seal it the way your state asks.", ["A ballot may not count if the envelope is wrong."], []),
  MAIL_BALLOT_SCAN: node("MAIL_BALLOT_SCAN", "Ballot is scanned", "counting", ["MAIL_BALLOT_COUNTED"], "Your ballot moves into processing.", ["This is a normal part of the count."], []),
  MAIL_BALLOT_COUNTED: node("MAIL_BALLOT_COUNTED", "Mail ballot counted", "counting", ["COUNTING_EXPLAINED"], "See what happens next in the count.", ["Your ballot has moved forward."], []),
  EARLY_VOTING_PATH: node("EARLY_VOTING_PATH", "Early voting", "voting", ["POLLING_CONFIRMED", "VOTE_CAST"], "Vote earlier if that is easier for you.", ["This can reduce election-day stress."], []),
  LANGUAGE_SUPPORT_PATH: node("LANGUAGE_SUPPORT_PATH", "Language support", "support", ["POLLING_FINDER", "AT_POLLS"], "Get help in your preferred language.", ["Language support can make each step clearer."], []),
  ACCESSIBILITY_NEEDS_PATH: node("ACCESSIBILITY_NEEDS_PATH", "Accessibility help", "support", ["MOBILITY_SUPPORT", "VISION_SUPPORT", "TRANSLATION_SUPPORT"], "Choose the support that fits you best.", ["Support is available for more than one need."], []),
  MOBILITY_SUPPORT: node("MOBILITY_SUPPORT", "Mobility support", "support", ["ACCESSIBLE_POLLING_FINDER", "POLLING_CONFIRMED"], "Find curbside and step-free options.", ["You should not need to guess which sites are accessible."], []),
  VISION_SUPPORT: node("VISION_SUPPORT", "Low-vision support", "support", ["ACCESSIBLE_POLLING_FINDER", "POLLING_CONFIRMED"], "Find large print and audio ballot help.", ["Accessible ballot tools may be available at your site."], []),
  TRANSLATION_SUPPORT: node("TRANSLATION_SUPPORT", "Language help", "support", ["LANGUAGE_SUPPORT_PATH", "POLLING_CONFIRMED"], "Find translation services near you.", ["You may be able to get help in your language."], []),
  VOTE_CAST: node("VOTE_CAST", "Vote cast", "voting", ["COUNTING_EXPLAINED"], "See what happens after you vote.", ["Your part is done. The process continues."], []),
  COUNTING_EXPLAINED: node("COUNTING_EXPLAINED", "How votes are counted", "counting", ["PRECINCT_DELAY_BRANCH", "TABULATION", "CERTIFICATION"], "Watch the count in simple steps.", ["Vote counting takes time for a reason."], []),
  PRECINCT_DELAY_BRANCH: node("PRECINCT_DELAY_BRANCH", "A precinct reports late", "counting", ["TABULATION"], "See how a late report changes the timeline.", ["A delay can look dramatic without changing the rules."], []),
  TABULATION: node("TABULATION", "Totals are updated", "counting", ["CERTIFICATION", "RECOUNT_TRIGGER"], "Watch totals build up across precincts.", ["Close margins may lead to a recount."], []),
  CERTIFICATION: node("CERTIFICATION", "Results are certified", "counting", ["COMPLETE", "RECOUNT_TRIGGER"], "Certification is the final review step.", ["Certification happens after checks are complete."], []),
  RECOUNT_TRIGGER: node("RECOUNT_TRIGGER", "Recount trigger", "counting", ["CERTIFICATION", "COMPLETE"], "See what margin starts a recount.", ["Very close results may be checked again."], []),
  COMPLETE: node("COMPLETE", "You are ready", "completion", ["WELCOME"], "You can restart or review any step.", ["You made it through the journey."], [])
};

export const JOURNEY_STATES = Object.keys(JOURNEY_GRAPH) as JourneyState[];

export interface ElectraStoreState {
  journeyId: string;
  currentState: JourneyState;
  history: HistoryEntry[];
  oracleHistory: OracleHistoryEntry[];
  currentRender: RenderKey | null;
  currentRenderProps: Record<string, unknown>;
  currentResponse: OracleResponse;
  predictedRender: RenderKey | null;
  predictionHit: boolean;
  draftSelection: string | null;
  cognitiveLevel: CognitiveLevel;
  language: LanguageCode;
  bookmarkedStates: JourneyState[];
  completedJourneys: string[];
  pauseStartedAt: number;
  demoMode: boolean;
  demoPaused: boolean;
  setLanguage: (language: LanguageCode) => void;
  setCognitiveLevel: (level: CognitiveLevel) => void;
  setDraftSelection: (value: string | null) => void;
  applyOracleResponse: (prompt: string, response: OracleResponse) => void;
  rewindToState: (state: JourneyState) => void;
  toggleDemoMode: () => void;
  toggleDemoPaused: () => void;
  bookmarkState: (state: JourneyState) => void;
  hydrateSession: (payload: Partial<SessionPayload>) => void;
}

const createInitialResponse = (): OracleResponse => ({
  message: "Hi. I can help you take the next voting step.",
  tone: "warm",
  render: "WelcomeStep",
  renderProps: {
    title: "You are not behind.",
    description: "We will do one small step together."
  },
  primaryAction: {
    label: "Start",
    action: "start"
  },
  secondaryAction: null,
  progress: {
    step: 1,
    total: 7,
    label: "Getting started"
  },
  proactiveWarning: null,
  stateTransition: "WELCOME",
  cognitiveLevel: "simple",
  nextAnticipated: "GoalSelect",
  confidence: 0.97
});

export const canTransition = (from: JourneyState, to: JourneyState) =>
  JOURNEY_GRAPH[from].allowedTransitions.includes(to) || from === to;

export const buildHistoryEntry = (
  state: JourneyState,
  decision: string,
  response: OracleResponse,
  rewound = false
): HistoryEntry => ({
  state,
  timestamp: new Date().toISOString(),
  oracleMessage: response.message,
  decision,
  render: response.render,
  rewound
});

export const resolveNextState = (from: JourneyState, to: JourneyState): JourneyState =>
  canTransition(from, to) ? to : from;

export const useElectraStore = create<ElectraStoreState>((set, get) => {
  const initialResponse = createInitialResponse();
  return {
    journeyId: crypto.randomUUID(),
    currentState: "WELCOME",
    history: [buildHistoryEntry("WELCOME", "Started", initialResponse)],
    oracleHistory: [],
    currentRender: initialResponse.render,
    currentRenderProps: initialResponse.renderProps,
    currentResponse: initialResponse,
    predictedRender: initialResponse.nextAnticipated,
    predictionHit: false,
    draftSelection: null,
    cognitiveLevel: "simple",
    language: readLanguagePreference(),
    bookmarkedStates: [],
    completedJourneys: [],
    pauseStartedAt: Date.now(),
    demoMode: false,
    demoPaused: false,
    setLanguage: (language) => set({ language }),
    setCognitiveLevel: (level) => set({ cognitiveLevel: level }),
    setDraftSelection: (value) => set({ draftSelection: value }),
    applyOracleResponse: (prompt, response) =>
      set((state) => {
        const nextState = resolveNextState(state.currentState, response.stateTransition);
        const prediction = scorePrediction(state.predictedRender, response.render).hit;
        const completedJourneys =
          nextState === "COMPLETE"
            ? Array.from(new Set([...state.completedJourneys, prompt]))
            : state.completedJourneys;
        return {
          currentState: nextState,
          history: [...state.history, buildHistoryEntry(nextState, prompt, response)],
          oracleHistory: [
            ...state.oracleHistory,
            {
              prompt,
              response,
              timestamp: new Date().toISOString(),
              predictionHit: prediction
            }
          ],
          currentRender: response.render,
          currentRenderProps: response.renderProps,
          currentResponse: response,
          predictedRender: response.nextAnticipated ?? predictNextRender(nextState),
          predictionHit: prediction,
          draftSelection: null,
          cognitiveLevel: response.cognitiveLevel,
          completedJourneys,
          pauseStartedAt: Date.now()
        };
      }),
    rewindToState: (targetState) =>
      set((state) => {
        const snapshot = [...state.history].reverse().find((entry) => entry.state === targetState);
        if (!snapshot) {
          return state;
        }
        const response = {
          ...state.currentResponse,
          message: `Let's go back to ${JOURNEY_GRAPH[targetState].label.toLowerCase()}.`,
          tone: "warm" as const,
          progress: {
            ...state.currentResponse.progress,
            label: JOURNEY_GRAPH[targetState].label
          },
          stateTransition: targetState,
          render: predictNextRender(targetState),
          renderProps: {
            title: JOURNEY_GRAPH[targetState].label,
            description: JOURNEY_GRAPH[targetState].consequenceData.bestPath
          }
        };
        return {
          currentState: targetState,
          currentRender: response.render,
          currentRenderProps: response.renderProps,
          currentResponse: response,
          history: [...state.history, buildHistoryEntry(targetState, "Rewound", response, true)],
          pauseStartedAt: Date.now()
        };
      }),
    toggleDemoMode: () => set((state) => ({ demoMode: !state.demoMode })),
    toggleDemoPaused: () => set((state) => ({ demoPaused: !state.demoPaused })),
    bookmarkState: (targetState) =>
      set((state) => ({
        bookmarkedStates: state.bookmarkedStates.includes(targetState)
          ? state.bookmarkedStates
          : [...state.bookmarkedStates, targetState]
      })),
    hydrateSession: (payload) =>
      set((state) => ({
        ...state,
        ...payload,
        currentRender:
          payload.oracleHistory?.at(-1)?.response.render ?? state.currentRender,
        currentRenderProps:
          payload.oracleHistory?.at(-1)?.response.renderProps ?? state.currentRenderProps,
        currentResponse:
          payload.oracleHistory?.at(-1)?.response ?? state.currentResponse
      }))
  };
});
