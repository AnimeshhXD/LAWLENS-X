/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Professional SaaS color system
        background: '#0B0F19',
        card: '#111827',
        border: '#1F2937',
        'text-primary': '#E5E7EB',
        'text-secondary': '#9CA3AF',
        accent: '#6366F1',
        danger: '#EF4444',
        success: '#10B981',
        warning: '#F59E0B',
        // Extended palette
        'card-hover': '#1A2332',
        'accent-hover': '#5558E3',
        'border-light': '#374151',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      maxWidth: {
        '4xl': '56rem',
        '5xl': '64rem',
      },
    },
  },
  plugins: [],
}
