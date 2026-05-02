import type { ContrastResult, JourneyState, PrimaryAction } from '../types';

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;
  const numeric = parseInt(value, 16);
  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255,
  };
};

const luminanceChannel = (channel: number) => {
  const normalized = channel / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * luminanceChannel(r) + 0.7152 * luminanceChannel(g) + 0.0722 * luminanceChannel(b);
};

export const calculateContrastRatio = (foreground: string, background: string): ContrastResult => {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  const ratio = Number((((lighter + 0.05) / (darker + 0.05)) * 100).toFixed(0)) / 100;
  return {
    ratio,
    passesAA: ratio >= 4.5,
    passesAAA: ratio >= 7,
  };
};

export const buildOracleAriaLabel = (message: string, tone: string) =>
  `Oracle message. Tone: ${tone}. ${message}`;

export const buildPrimaryActionAriaLabel = (action: PrimaryAction, progressLabel: string) =>
  `${action.label}. Current step: ${progressLabel}.`;

export const buildStateChangeAnnouncement = (state: JourneyState, label: string) =>
  `Now on ${label}. Internal state ${state.replace(/_/g, ' ').toLowerCase()}.`;

export const focusFirstInteractive = (container: ParentNode | null) => {
  const target = container?.querySelector<HTMLElement>(
    "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
  );
  target?.focus();
};
