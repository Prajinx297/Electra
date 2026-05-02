/**
 * Computes WCAG contrast ratio for two hex colors.
 *
 * @param hex1 - First color in #RRGGBB format.
 * @param hex2 - Second color in #RRGGBB format.
 * @returns Contrast ratio where 1 is lowest and 21 is highest.
 * @throws {Error} Never thrown directly for valid hex strings.
 */
export function checkContrast(hex1: string, hex2: string): number {
  const getLuminance = (hex: string): number => {
    const rgb = Number.parseInt(hex.slice(1), 16);
    const red = (rgb >> 16) & 0xff;
    const green = (rgb >> 8) & 0xff;
    const blue = rgb & 0xff;
    const [redChannel, greenChannel, blueChannel] = [red, green, blue].map((color): number => {
      const scaled = color / 255;
      return scaled <= 0.039_28 ? scaled / 12.92 : Math.pow((scaled + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * (redChannel ?? 0) + 0.7152 * (greenChannel ?? 0) + 0.0722 * (blueChannel ?? 0);
  };

  const luminance1 = getLuminance(hex1);
  const luminance2 = getLuminance(hex2);
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  return (lighter + 0.05) / (darker + 0.05);
}
