import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Views, dateFnsLocalizer, momentLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import axios from 'axios';
import { 
  FiChevronLeft, 
  FiChevronRight, 
  FiPlus, 
  FiCalendar,
  FiRefreshCw,
  FiDownload,
  FiUpload,
  FiSettings
} from 'react-icons/fi';
import EventModal from './EventModal';
import CalendarToolbar from './CalendarToolbar';
import { useSnackbar } from 'notistack';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

const DragAndDropCalendar = withDragAndDrop(Calendar);
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: {},
});

const CalendarView = ({ projects, users, currentUser }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(Views.WEEK);
  const [date, setDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [calendarSettings, setCalendarSettings] = useState({
    timezone: 'UTC',
    workingHours: { start: 9, end: 17 },
    showWeekends: true,
    hideDeclined: false
  });
  const [showSettings, setShowSettings] = useState(false);
  const API = 'http://localhost:5000';

  const fetchEvents = useCallback(async (rangeStart, rangeEnd) => {
    try {
      setLoading(true);
      const params = {
        start: rangeStart.toISOString(),
        end: rangeEnd.toISOString(),
        timezone: calendarSettings.timezone
      };
      
      const response = await axios.get(`${API}/api/calendar`,{
        headers:{
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      },{ params });
      setEvents(response.data.map(event => ({
        ...event,
        start: new Date(event.event_date),
        end: new Date(event.end_date),
        title: event.title,
        allDay: event.all_day,
        resource: event,
      })));
    } catch (err) {
      enqueueSnackbar('Failed to load calendar events', { variant: 'error' });
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [calendarSettings.timezone, enqueueSnackbar]);

  useEffect(() => {
    const rangeStart = new Date(date);
    const rangeEnd = new Date(date);
    
    switch (view) {
      case Views.DAY:
        rangeEnd.setDate(rangeStart.getDate() + 1);
        break;
      case Views.WEEK:
        rangeEnd.setDate(rangeStart.getDate() + 7);
        break;
      case Views.MONTH:
        rangeStart.setDate(1);
        rangeEnd.setMonth(rangeStart.getMonth() + 1);
        rangeEnd.setDate(0);
        break;
      default:
        break;
    }
    
    fetchEvents(rangeStart, rangeEnd);
  }, [date, view, fetchEvents]);

  const handleSelectEvent = (event) => {
    setSelectedEvent(event.resource);
    setShowModal(true);
  };
  const handleFile = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${API}/api/calendar/import`, formData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      enqueueSnackbar(t('calendar.importSuccess', { count: response.data.imported_events }), { 
        variant: 'success' 
      });
      fetchEvents(); // Refresh the calendar
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || t('calendar.importFailed'), { 
        variant: 'error' 
      });
      console.error('Import error:', err);
    }
  };
  const handleSelectSlot = (slotInfo) => {
    setSelectedSlot({
      start: slotInfo.start,
      end: slotInfo.end,
      isAllDay: slotInfo.action === 'click'
    });
    setSelectedEvent(null);
    setShowModal(true);
  };

  const handleEventDrop = async ({ event, start, end }) => {
    try {
      await axios.put(`${API}/api/calendar/${event.resource.event_id}`,{
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }, {
        event_date: start,
        end_date: end,
        last_modified_by: currentUser.id
      });
      
      enqueueSnackbar('Event rescheduled', { variant: 'success' });
      fetchEvents();
    } catch (err) {
      enqueueSnackbar('Failed to reschedule event', { variant: 'error' });
      console.error(err);
    }
  };

  const handleEventResize = async ({ event, start, end }) => {
    try {
      await axios.put(`${API}/api/calendar/${event.resource.event_id}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        },{
        end_date: end,
        last_modified_by: currentUser.id
      });
      
      enqueueSnackbar('Event updated', { variant: 'success' });
      fetchEvents();
    } catch (err) {
      enqueueSnackbar('Failed to update event duration', { variant: 'error' });
      console.error(err);
    }
  };

  const handleExportCalendar = async () => {
    try {
      const response = await axios.get(`${API}/api/calendar/export`, 
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        },{
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'calendar.ics');
      document.body.appendChild(link);
      link.click();
      
      enqueueSnackbar('Calendar exported', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Failed to export calendar', { variant: 'error' });
      console.error(err);
    }
  };

  const eventStyleGetter = (event) => {
    const backgroundColor = event.resource?.event_color || theme.palette.primary.main;
    const style = {
      backgroundColor,
      borderRadius: '4px',
      opacity: 0.8,
      color: 'white',
      border: '0px',
      display: 'block',
    };
    
    return { style };
  };

  return (
    <div className="enterprise-calendar-container">
      <input
        type="file"
        id="ics-import"
        accept=".ics"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      <CalendarToolbar
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        onExport={handleExportCalendar}
        onImport={() => document.getElementById('ics-import').click()}
        onSettingsOpen={() => setShowSettings(true)}
        onRefresh={() => fetchEvents()}
        t={t} // Pass the translate function to the toolbar
      />
      
      <div className="calendar-wrapper">
        <DragAndDropCalendar
          localizer={localizer}
          events={events}
          view={view}
          date={date}
          onView={setView}
          onNavigate={setDate}
          selectable
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          eventPropGetter={eventStyleGetter}
          style={{ height: 'calc(100vh - 180px)' }}
          defaultView={Views.WEEK}
          views={[Views.DAY, Views.WEEK, Views.MONTH]}
          step={15}
          timeslots={4}
          min={new Date(0, 0, 0, calendarSettings.workingHours.start)}
          max={new Date(0, 0, 0, calendarSettings.workingHours.end)}
          messages={{
            today: t('calendar.today'),
            previous: t('calendar.previous'),
            next: t('calendar.next'),
            month: t('calendar.month'),
            week: t('calendar.week'),
            day: t('calendar.day'),
            agenda: t('calendar.agenda'),
            date: t('calendar.date'),
            time: t('calendar.time'),
            event: t('calendar.event'),
            allDay: t('calendar.allDay'),
            showMore: total => t('calendar.showMore', { count: total })
          }}
        />
      </div>
      
      {showModal && (
        <EventModal
          open={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedEvent(null);
            setSelectedSlot(null);
          }}
          event={selectedEvent}
          slot={selectedSlot}
          projects={projects}
          users={users}
          currentUser={currentUser}
          timezone={calendarSettings.timezone}
          onSave={() => fetchEvents()}
        />
      )}
    </div>
  );
};

export default CalendarView;