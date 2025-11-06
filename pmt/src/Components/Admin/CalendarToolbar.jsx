import React from 'react';
import { 
  FiChevronLeft, 
  FiChevronRight, 
  FiPlus, 
  FiRefreshCw,
  FiDownload,
  FiUpload,
  FiSettings,
  FiCalendar as CalendarIcon
} from 'react-icons/fi';
import { 
  Button,
  ButtonGroup,
  Select,
  MenuItem,
  Tooltip,
  Stack,
  Typography
} from '@mui/material';
import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import { Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { dateFnsLocalizer } from 'react-big-calendar';
import { useTranslation } from 'react-i18next';

import enUS from 'date-fns/locale/en-US';

const CalendarToolbar = ({ 
  view, 
  onView, 
  date, 
  onNavigate, 
  onExport, 
  onImport,
  onSettingsOpen,
  onRefresh,
}) => {
  const { t } = useTranslation();
  const locales = {
    'en-US': enUS,
  };
  
  const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
  });
  const theme = useTheme();
  const currentDate = localizer.format(date, 'MMMM yyyy');

  const handleToday = () => {
    onNavigate(new Date());
  };

  const handleViewChange = (e) => {
    onView(e.target.value);
  };

  return (
    <Stack 
      sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2,
        p: 1,
        backgroundColor: theme.palette.background.paper,
        borderRadius: 1,
        boxShadow: theme.shadows[1]
      }}
    >
      {/* Left side: Navigation and view controls */}
      <Stack sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ButtonGroup variant="contained" size="small">
          <Tooltip title={t('calendar.previous')}>
            <Button onClick={() => onNavigate(localizer.add(date, -1, view))}>
              <FiChevronLeft />
            </Button>
          </Tooltip>
          
          <Button onClick={handleToday}>
            {t('calendar.today')}
          </Button>
          
          <Tooltip title={t('calendar.next')}>
            <Button onClick={() => onNavigate(localizer.add(date, 1, view))}>
              <FiChevronRight />
            </Button>
          </Tooltip>
        </ButtonGroup>
        
        <Typography variant="h6" sx={{ ml: 2, fontWeight: 500 }}>
          {currentDate}
        </Typography>
      </Stack>
      
      {/* Center: View selector */}
      <Stack>
        <Select
          value={view}
          onChange={handleViewChange}
          size="small"
          sx={{ 
            minWidth: 120,
            '& .MuiSelect-select': { 
              display: 'flex', 
              alignItems: 'center',
              gap: 1 
            }
          }}
        >
          <MenuItem value={Views.DAY} sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 1.5
          }}>
            <CalendarIcon size={14} /> <span>{t('calendar.day')}</span>
          </MenuItem>
          <MenuItem value={Views.WEEK} sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 1.5
          }}>
            <CalendarIcon size={14} /> <span>{t('calendar.week')}</span>
          </MenuItem>
          <MenuItem value={Views.MONTH} sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 1.5
          }}>
            <CalendarIcon size={14} /> <span>{t('calendar.month')}</span>
          </MenuItem>
        </Select>
      </Stack>
      
      {/* Right side: Action buttons */}
      <Stack sx={{ display: 'flex', gap: 1 }}>
        <Tooltip title={t('calendar.refresh')}>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={onRefresh}
            startIcon={<FiRefreshCw size={16} />}
          >
            {t('calendar.refresh')}
          </Button>
        </Tooltip>
        
        <Tooltip title={t('calendar.export')}>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={onExport}
            startIcon={<FiDownload size={16} />}
          >
            {t('calendar.export')}
          </Button>
        </Tooltip>
        
        <Tooltip title={t('calendar.import')}>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={onImport}
            startIcon={<FiUpload size={16} />}
          >
            {t('calendar.import')}
          </Button>
        </Tooltip>
        
        <Button 
          variant="contained" 
          color="primary" 
          size="small" 
          onClick={() => onNavigate(new Date(), Views.DAY)}
          startIcon={<FiPlus size={16} />}
        >
          {t('calendar.newEvent')}
        </Button>
        
        <Tooltip title={t('calendar.settings')}>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={onSettingsOpen}
            sx={{ minWidth: 40 }}
          >
            <FiSettings size={16} />
          </Button>
        </Tooltip>
      </Stack>
    </Stack>
  );
};
CalendarToolbar.propTypes = {
  view: PropTypes.string.isRequired,
  onView: PropTypes.func.isRequired,
  date: PropTypes.instanceOf(Date).isRequired,
  onNavigate: PropTypes.func.isRequired,
  onExport: PropTypes.func,
  onImport: PropTypes.func,
  onSettingsOpen: PropTypes.func,
  onRefresh: PropTypes.func,
  localizer: PropTypes.shape({
    format: PropTypes.func.isRequired,
    add: PropTypes.func.isRequired,
  }).isRequired,
};

export default CalendarToolbar;
