const THEME_COLORS = ['blue', 'emerald', 'rose', 'violet'];
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700];

// 生成所有主题色变体类名
const themeClasses = THEME_COLORS.flatMap(color => [
  // 背景色
  ...SHADES.map(s => `bg-${color}-${s}`),
  // 文字色
  ...SHADES.map(s => `text-${color}-${s}`),
  // 边框色
  ...SHADES.map(s => `border-${color}-${s}`),
  // 环形色
  `ring-${color}-500`,
  `focus:ring-${color}-500`,
  // hover 状态
  ...SHADES.map(s => `hover:bg-${color}-${s}`),
  ...SHADES.map(s => `hover:text-${color}-${s}`),
  ...SHADES.map(s => `hover:border-${color}-${s}`),
]);

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  safelist: [
    ...themeClasses,
    // 自定义彩色阴影（需在 theme.extend.boxShadow 中定义实际阴影值）
    ...THEME_COLORS.flatMap(color => [
      `shadow-${color}-50`,
      `shadow-${color}-100`,
      `shadow-${color}-200`,
    ]),
  ],
  theme: {
    extend: {
      boxShadow: {
        'blue-50': '0 1px 2px 0 rgba(59, 130, 246, 0.05)',
        'blue-100': '0 1px 3px 0 rgba(59, 130, 246, 0.1)',
        'blue-200': '0 4px 6px -1px rgba(59, 130, 246, 0.15)',
        'emerald-50': '0 1px 2px 0 rgba(16, 185, 129, 0.05)',
        'emerald-100': '0 1px 3px 0 rgba(16, 185, 129, 0.1)',
        'emerald-200': '0 4px 6px -1px rgba(16, 185, 129, 0.15)',
        'rose-50': '0 1px 2px 0 rgba(244, 63, 94, 0.05)',
        'rose-100': '0 1px 3px 0 rgba(244, 63, 94, 0.1)',
        'rose-200': '0 4px 6px -1px rgba(244, 63, 94, 0.15)',
        'violet-50': '0 1px 2px 0 rgba(139, 92, 246, 0.05)',
        'violet-100': '0 1px 3px 0 rgba(139, 92, 246, 0.1)',
        'violet-200': '0 4px 6px -1px rgba(139, 92, 246, 0.15)',
      },
    },
  },
  plugins: [],
}
