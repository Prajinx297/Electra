/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        green: 'var(--green)',
        'green-light': 'var(--green-light)',
        amber: 'var(--amber)',
        'amber-light': 'var(--amber-light)',
        red: 'var(--red)',
        'red-light': 'var(--red-light)',
        blue: 'var(--blue)',
        'blue-light': 'var(--blue-light)',
        border: 'var(--border)',
      },
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
