export const getEntranceMotionProps = (reducedMotion: boolean | null) =>
  reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
      };
