import { useEffect } from "react";
import { useDebounce } from "use-debounce";
import { persistSession } from "../firebase/firestore";
import { SessionPayload } from "../types";

export function useSessionSync(userId: string, sessionPayload: SessionPayload) {
  // Debounce the state payload by 2 seconds to prevent Firestore write amplification
  const [debouncedSession] = useDebounce(sessionPayload, 2000);

  useEffect(() => {
    if (userId !== "guest" && debouncedSession) {
      persistSession(userId, debouncedSession).catch((error) => {
        console.error("Failed to sync session to Firestore:", error);
      });
    }
  }, [debouncedSession, userId]);
}
