tailwind.config = {
    darkMode: 'class',
    theme: {
      extend: {
        fontFamily: {
          display: ['"Space Grotesk"', 'sans-serif'],
          body: ['"Inter"', 'sans-serif'],
        },
        colors: {
          storm: {
            50: '#EEF2F6', 100: '#DCE4EC', 300: '#9AB0C7',
            500: '#2B6CB0', 600: '#1E4E79', 700: '#173C5E', 900: '#0B1220',
          },
          sun: { DEFAULT: '#F2A93B', dark: '#D98F1F' },
          navy: { 800: '#131C2E', 900: '#0B1220', 700: '#1B2740' },
        },
        borderRadius: { '2xl': '1.25rem', '3xl': '1.75rem' },
      }
    }
  }
