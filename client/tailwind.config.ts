import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Forest green theme
        dominant: '#1a2e1a',
        secondary: '#2d4a2d',
        accent: '#d4a847',
        // Player colors
        red: {
          DEFAULT: '#c0392b',
          light: 'rgba(192, 57, 43, 0.15)',
        },
        blue: {
          DEFAULT: '#2980b9',
          light: 'rgba(41, 128, 185, 0.15)',
        },
        // Board colors
        board: {
          light: '#4a7c4a',
          dark: '#3a6a3a',
        },
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
        '3xl': '64px',
      },
    },
  },
  plugins: [],
}

export default config
