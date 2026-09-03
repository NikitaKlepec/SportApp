/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#EDEFEA',      // фон приложения, тёплый серо-зелёный
        surface: '#FFFFFF',   // карточки/панели
        ink: '#1A1D1B',       // основной текст, графитовый
        muted: '#6B7169',     // второстепенный текст
        accent: '#C6FF33',    // кислотный лайм — прогресс, активные состояния
        line: '#DCDFD9',      // тонкие разделители/бордеры
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
      },
    },
  },
  plugins: [],
}
