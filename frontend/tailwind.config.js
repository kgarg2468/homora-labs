/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'Menlo', 'monospace'],
      },
      colors: {
        accent: {
          50: '#FBF7EE',
          100: '#F5ECDA',
          200: '#EAD5B0',
          300: '#DEBB83',
          400: '#D4A664',
          500: '#C48C3C',
          600: '#A87430',
          700: '#8C5E28',
          800: '#724C22',
          900: '#5E3E1E',
          950: '#352010',
        },
        stone: {
          50: '#F9F6F1',
          100: '#F3EDE5',
          200: '#EDE8E1',
          300: '#E3DCD3',
          400: '#9A8E82',
          500: '#5C5045',
          600: '#1C1610',
          700: '#141210',
          800: '#1E1B17',
          900: '#282420',
          950: '#352F28',
        },
      },
      boxShadow: {
        'warm-sm': '0 1px 2px rgba(28, 22, 16, 0.04)',
        'warm-md': '0 4px 12px rgba(28, 22, 16, 0.06), 0 1px 3px rgba(28, 22, 16, 0.04)',
        'warm-lg': '0 8px 24px rgba(28, 22, 16, 0.08), 0 2px 8px rgba(28, 22, 16, 0.04)',
        'warm-xl': '0 16px 48px rgba(28, 22, 16, 0.12), 0 4px 12px rgba(28, 22, 16, 0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'breathe': 'breathe 3s ease-in-out infinite',
        'hover-lift': 'hoverLift 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px) scale(0.98)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        hoverLift: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-2px)' },
        },
      },
    },
  },
  plugins: [],
}
