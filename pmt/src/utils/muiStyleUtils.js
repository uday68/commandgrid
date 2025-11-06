import { styled as muiStyled } from '@mui/material/styles';

// Export a properly configured styled function
export const styled = muiStyled;

// Add any other style-related utilities here
export const createGradient = (color1, color2) => {
  return `linear-gradient(to right, ${color1}, ${color2})`;
};

export const createShadow = (color, intensity = 0.2) => {
  return `0 8px 16px rgba(${color}, ${intensity})`;
};
