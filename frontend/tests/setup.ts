import "@testing-library/jest-dom";
import { toHaveNoViolations } from "jest-axe";
import * as React from "react";
import { expect, vi } from "vitest";

expect.extend(toHaveNoViolations);

declare module "vitest" {
  interface Assertion<T = any> {
    toHaveNoViolations(): T;
  }
}

vi.mock("reactflow", () => {
  const ReactFlow = ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "react-flow" }, children);

  return {
    default: ReactFlow,
    Background: () => React.createElement("div", { "data-testid": "react-flow-background" }),
    Controls: () => React.createElement("div", { "data-testid": "react-flow-controls" }),
    MarkerType: { ArrowClosed: "arrowclosed" }
  };
});

vi.mock("framer-motion", () => {
  const motionComponentCache = new Map<
    string,
    React.ComponentType<{ children?: React.ReactNode } & Record<string, unknown>>
  >();
  const motionPropNames = new Set([
    "animate",
    "custom",
    "drag",
    "dragConstraints",
    "dragElastic",
    "exit",
    "initial",
    "layout",
    "layoutId",
    "transition",
    "variants",
    "whileFocus",
    "whileHover",
    "whileTap"
  ]);
  const omitMotionProps = (props: Record<string, unknown>) => {
    return Object.fromEntries(
      Object.entries(props).filter(([name]) => !motionPropNames.has(name))
    );
  };
  const getMotionComponent = (tag: string | symbol) => {
    const tagName = String(tag);
    const cached = motionComponentCache.get(tagName);

    if (cached !== undefined) {
      return cached;
    }

    const MotionComponent = ({
      children,
      ...props
    }: { children?: React.ReactNode } & Record<string, unknown>) =>
      React.createElement(tagName, omitMotionProps(props), children);
    motionComponentCache.set(tagName, MotionComponent);

    return MotionComponent;
  };
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string | symbol) => getMotionComponent(tag)
    }
  );

  return {
    AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    motion,
    useReducedMotion: () => true
  };
});

vi.mock("recharts", () => {
  const passthrough = ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", null, children);

  return {
    ResponsiveContainer: passthrough,
    BarChart: passthrough,
    CartesianGrid: () => React.createElement("div", { "data-testid": "chart-grid" }),
    Tooltip: () => React.createElement("div", { "data-testid": "chart-tooltip" }),
    XAxis: () => React.createElement("div", { "data-testid": "chart-x-axis" }),
    YAxis: () => React.createElement("div", { "data-testid": "chart-y-axis" }),
    Bar: () => React.createElement("div", { "data-testid": "chart-bar" })
  };
});

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: vi.fn(),
  getAuth: vi.fn(() => ({ currentUser: null })),
  onAuthStateChanged: vi.fn((_auth, callback: (user: { uid: string; isAnonymous: boolean; displayName: string | null }) => void) => {
    callback({ uid: "test-user", isAnonymous: true, displayName: null });
    return () => {};
  }),
  signInAnonymously: vi.fn().mockResolvedValue({
    user: {
      uid: "test-user",
      isAnonymous: true,
      displayName: null,
      getIdToken: vi.fn().mockResolvedValue("test-token")
    }
  }),
  signInWithPopup: vi.fn().mockResolvedValue({ user: { uid: "google-user" } }),
  signOut: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("firebase/firestore", () => ({
  addDoc: vi.fn().mockResolvedValue({ id: "doc-1" }),
  collection: vi.fn(() => ({})),
  doc: vi.fn(() => ({ withConverter: () => ({}) })),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => null }),
  getFirestore: vi.fn(() => ({})),
  serverTimestamp: vi.fn(() => "server-time"),
  setDoc: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({}))
}));

vi.mock("firebase/analytics", () => ({
  getAnalytics: vi.fn(() => ({})),
  isSupported: vi.fn().mockResolvedValue(false),
  logEvent: vi.fn()
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  })
});

Object.defineProperty(URL, "createObjectURL", {
  writable: true,
  value: vi.fn(() => "blob:electra-test")
});

Object.defineProperty(URL, "revokeObjectURL", {
  writable: true,
  value: vi.fn()
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;
