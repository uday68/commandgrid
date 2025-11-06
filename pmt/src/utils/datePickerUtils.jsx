import React from 'react';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

/**
 * DatePickerProvider - A consistent wrapper for MUI date pickers
 * This helps prevent adapter inconsistency errors
 */
export const DatePickerProvider = ({ children }) => {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      {children}
    </LocalizationProvider>
  );
};

/**
 * Format a date to string using consistent formatting
 */
export const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return '';
  // Use dayjs directly since we're using AdapterDayjs
  const dayjs = require('dayjs');
  return dayjs(date).format(format);
};
