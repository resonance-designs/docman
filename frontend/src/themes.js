/*
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */
// Theme definitions for the application
export const themes = {
  current: {
    name: "Current Theme",
    class: "current-theme",
    description: "The current default theme"
  },
  "clean-business": {
    name: "Clean Business",
    class: "clean-business-theme",
    description: "A professional, clean business theme"
  },
  "retro-gaming": {
    name: "Retro Gaming",
    class: "retro-gaming-theme",
    description: "A nostalgic retro gaming theme"
  }
};

export const getThemeClass = (theme) => {
  return themes[theme]?.class || themes.current.class;
};

export const getThemeName = (theme) => {
  return themes[theme]?.name || themes.current.name;
};

export const isValidTheme = (theme) => {
  return Object.keys(themes).includes(theme);
};