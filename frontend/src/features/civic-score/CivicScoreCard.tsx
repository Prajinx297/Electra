import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { civicEvents } from "../../firebase/analytics";
import { civicBus } from "../../events/civicEventBus";
import { useFeatureFlag } from "../../hooks/useFeatureFlag";
import type { CivicBadge, CivicScoreResponse } from "../../types";

interface CivicScoreCardProps {
  open: boolean;
  onClose: () => void;
}

export const badges: CivicBadge[] = [
  { id: "civic-newcomer", label: "Civic Newcomer", threshold: 50, icon: "Ballot", earned: false },
  { id: "informed-voter", label: "Informed Voter", threshold: 200, icon: "Checklist", earned: false },
  { id: "civic-champion", label: "Civic Champion", threshold: 500, icon: "Scales", earned: false },
  { id: "democracy-defender", label: "Democracy Defender", threshold: 1000, icon: "Capitol", earned: false },
  { id: "constitutional-scholar", label: "Constitutional Scholar", threshold: 2000, icon: "Scroll", earned: false }
];

const eventPoints: Record<string, number> = {
  score_shared: 20,
};

const getBadgesForScore = (score: number) =>
  badges.map((badge) => ({
    ...badge,
    earned: score >= badge.threshold
  }));

const getHighestBadge = (score: number) =>
  getBadgesForScore(score)
    .filter((badge) => badge.earned)
    .at(-1) ?? null;

const getNextBadge = (score: number) =>
  badges.find((badge) => score < badge.threshold) ?? badges.at(-1)!;

const loadLocalScore = (): CivicScoreResponse => {
  const raw = window.localStorage.getItem("electra:civic-score");
  if (!raw) {
    return {
      score: 0,
      badges: getBadgesForScore(0),
      streakDays: 1,
      highestBadge: null
    };
  }

  const parsed = JSON.parse(raw) as CivicScoreResponse;
  return {
    ...parsed,
    badges: getBadgesForScore(parsed.score),
    highestBadge: getHighestBadge(parsed.score)
  };
};

const saveLocalScore = (score: CivicScoreResponse) => {
  window.localStorage.setItem("electra:civic-score", JSON.stringify(score));
};

export const CivicScoreCard = ({ open, onClose }: CivicScoreCardProps) => {
  const enabled = useFeatureFlag("civic_score_enabled");
  const [scoreState, setScoreState] = useState<CivicScoreResponse>(() => loadLocalScore());
  const [shareOpen, setShareOpen] = useState(false);
  const [levelUp, setLevelUp] = useState<CivicBadge | null>(null);
  const shareRef = useRef<HTMLDivElement>(null);
  const highestBadge = scoreState.highestBadge ?? badges[0];
  const nextBadge = getNextBadge(scoreState.score);
  const progress = Math.min(100, Math.round((scoreState.score / nextBadge.threshold) * 100));
  const circumference = 2 * Math.PI * 48;
  const dashOffset = circumference - (progress / 100) * circumference;

  const applyScore = (points: number, reason: string) => {
    setScoreState((current) => {
      const previousBadges = current.badges.filter((badge) => badge.earned).map((badge) => badge.id);
      const nextScore = current.score + points;
      const nextBadges = getBadgesForScore(nextScore);
      const newlyUnlocked = nextBadges.filter(
        (badge) => badge.earned && !previousBadges.includes(badge.id)
      );
      const nextState: CivicScoreResponse = {
        score: nextScore,
        badges: nextBadges,
        streakDays: Math.max(current.streakDays, 1),
        highestBadge: getHighestBadge(nextScore)
      };
      if (newlyUnlocked[0]) {
        setLevelUp(newlyUnlocked[0]);
        civicBus.emit({ type: "BADGE_UNLOCKED", payload: { badge: newlyUnlocked[0] } });
      }

      void fetch("/api/civic-score/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: reason, points })
      }).catch(() => undefined);

      saveLocalScore(nextState);
      return nextState;
    });
  };

  useEffect(() => {
    if (open) {
      setScoreState(loadLocalScore());
    }
  }, [open]);

  useEffect(() => {
    if (!levelUp) {
      return undefined;
    }
    const timer = window.setTimeout(() => setLevelUp(null), 2600);
    return () => window.clearTimeout(timer);
  }, [levelUp]);

  const shareText = useMemo(
    () =>
      `I'm an informed voter powered by ELECTRA. Civic Score: ${scoreState.score}. Badge: ${highestBadge.label}.`,
    [highestBadge.label, scoreState.score]
  );

  const handleShare = async () => {
    setShareOpen(true);
    applyScore(eventPoints.score_shared, "Share civic score");
    civicEvents.civicScoreShared(scoreState.score, highestBadge.label);

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
    }
  };

  if (!enabled || !open) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.section
          role="dialog"
          aria-modal="true"
          aria-label="Civic score"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-lg bg-[var(--surface)] p-6 text-[var(--ink)] shadow-2xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.08em] text-[var(--accent)]">
                Civic Score
              </p>
              <h2 className="text-3xl font-bold">Your civic signal</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-h-10 rounded-lg border border-[var(--border)] px-3 text-sm font-semibold"
            >
              Close
            </button>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
            <div className="flex flex-col items-center rounded-lg bg-[var(--surface-2)] p-5">
              <svg width="140" height="140" viewBox="0 0 120 120" aria-label={`${scoreState.score} civic points`}>
                <circle cx="60" cy="60" r="48" stroke="var(--border)" strokeWidth="10" fill="none" />
                <motion.circle
                  cx="60"
                  cy="60"
                  r="48"
                  stroke="var(--civic-green)"
                  strokeWidth="10"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  animate={{ strokeDashoffset: dashOffset }}
                  transform="rotate(-90 60 60)"
                />
                <text x="60" y="66" textAnchor="middle" className="fill-[var(--ink)] text-2xl font-bold">
                  {scoreState.score}
                </text>
              </svg>
              <p className="mt-3 text-sm font-semibold">{scoreState.streakDays} day streak</p>
              <p className="text-sm text-[var(--ink-secondary)]">Highest badge: {highestBadge.label}</p>
            </div>

            <div>
              <div className="grid gap-3 sm:grid-cols-2">
                {scoreState.badges.map((badge) => (
                  <motion.div
                    key={badge.id}
                    animate={badge.earned ? { boxShadow: "0 0 24px rgba(45,125,90,0.28)" } : undefined}
                    className={`rounded-lg border p-4 ${
                      badge.earned
                        ? "border-[var(--civic-green)] bg-[var(--civic-green-light)]"
                        : "border-[var(--border)] bg-[var(--surface-2)] opacity-65"
                    }`}
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.08em]">
                      {badge.earned ? badge.icon : "Locked"}
                    </p>
                    <p className="mt-1 font-bold">{badge.label}</p>
                    <p className="text-sm text-[var(--ink-secondary)]">{badge.threshold} pts</p>
                  </motion.div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void handleShare()}
                className="mt-5 min-h-12 rounded-lg bg-[var(--ink)] px-4 text-sm font-bold text-[var(--surface)]"
              >
                Share your Civic Score
              </button>
            </div>
          </div>

          {shareOpen ? (
            <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div
                ref={shareRef}
                className="rounded-lg bg-white p-5 text-[#101217] shadow-inner"
              >
                <p className="text-sm font-bold text-[#2d7d5a]">ELECTRA</p>
                <p className="mt-3 text-2xl font-bold">Civic Score {scoreState.score}</p>
                <p className="mt-1">{highestBadge.label}</p>
                <p className="mt-4 text-sm">I'm an informed voter - powered by ELECTRA</p>
                <div className="mt-4 h-16 w-16 rounded-lg border-4 border-[#101217] p-2 text-center text-xs">
                  electra.app
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://electra.app")}`}
                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold"
                >
                  LinkedIn
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold"
                >
                  X
                </a>
                <a
                  href={`https://bsky.app/intent/compose?text=${encodeURIComponent(shareText)}`}
                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold"
                >
                  Bluesky
                </a>
              </div>
            </div>
          ) : null}

          <AnimatePresence>
            {levelUp ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: [1, 1.08, 1] }}
                exit={{ opacity: 0 }}
                className="fixed left-1/2 top-8 z-[60] -translate-x-1/2 rounded-lg bg-[var(--civic-green)] px-5 py-3 font-bold text-white shadow-2xl"
              >
                Badge unlocked: {levelUp.label}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
};
