import React, { useState, useEffect, useCallback } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useAuth } from '../../context/AuthContext';
import EmployeeSidebar from '../../components/employee/EmployeeSidebar';
import { NotificationBell } from '../../components/notifications';
import { Calendar as CalendarIcon, X, Filter } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const EVENT_COLORS = {
  holiday: { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' },
  leave: { bg: '#DCFCE7', border: '#22C55E', text: '#166534' },
  leave_pending: { bg: '#FEF9C3', border: '#EAB308', text: '#854D0E' },
  project_deadline: { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' },
  birthday: { bg: '#F3E8FF', border: '#A855F7', text: '#6B21A8' },
  anniversary: { bg: '#FFEDD5', border: '#F97316', text: '#9A3412' }
};

const EVENT_FILTERS = [
  { key: 'holiday', label: 'Holidays', color: '#EF4444' },
  { key: 'leave', label: 'My Leaves', color: '#22C55E' },
  { key: 'project_deadline', label: 'Project Deadlines', color: '#3B82F6' },
  { key: 'birthday', label: 'Birthdays', color: '#A855F7' },
  { key: 'anniversary', label: 'Work Anniversaries', color: '#F97316' }
];

const EmployeeCalendar = () => {
  const { user, token } = useAuth();
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filters, setFilters] = useState({
    holiday: true, leave: true, project_deadline: true, birthday: true, anniversary: true
  });

  const fetchEvents = useCallback(async () => {
    try {
      const start = startOfMonth(subMonths(currentDate, 1));
      const end = endOfMonth(addMonths(currentDate, 1));
      
      const response = await fetch(
        `${API_URL}/api/calendar/events?start_date=${format(start, 'yyyy-MM-dd')}&end_date=${format(end, 'yyyy-MM-dd')}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      
      const calendarEvents = data.map(event => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
        allDay: event.allDay
      }));
      
      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }, [token, currentDate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = events.filter(event => {
    if (event.type === 'leave' && event.status === 'PENDING') {
      return filters.leave;
    }
    return filters[event.type] !== false;
  });

  const eventStyleGetter = (event) => {
    let colorSet = EVENT_COLORS[event.type] || EVENT_COLORS.holiday;
    if (event.type === 'leave' && event.status === 'PENDING') {
      colorSet = EVENT_COLORS.leave_pending;
    }
    
    return {
      style: {
        backgroundColor: colorSet.bg,
        borderLeft: `4px solid ${colorSet.border}`,
        color: colorSet.text,
        borderRadius: '4px',
        padding: '2px 6px',
        fontSize: '12px',
        fontWeight: '500'
      }
    };
  };

  const handleNavigate = (newDate) => setCurrentDate(newDate);
  const handleSelectEvent = (event) => setSelectedEvent(event);

  return (
    <div className="min-h-screen bg-gray-50">
      <EmployeeSidebar />
      
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
            <p className="text-gray-500">View your leaves, holidays, and important dates</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user?.name}</span>
            <NotificationBell />
          </div>
        </div>

        <div className="flex gap-6">
          {/* Main Calendar */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            {loading ? (
              <div className="h-[600px] flex items-center justify-center text-gray-500">Loading calendar...</div>
            ) : (
              <BigCalendar
                localizer={localizer}
                events={filteredEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 600 }}
                date={currentDate}
                onNavigate={handleNavigate}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventStyleGetter}
                views={['month', 'week', 'day']}
                popup
              />
            )}
          </div>

          {/* Sidebar - Filters & Legend */}
          <div className="w-72 space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-700">Filter Events</span>
              </div>
              <div className="space-y-2">
                {EVENT_FILTERS.map(filter => (
                  <label key={filter.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters[filter.key]}
                      onChange={(e) => setFilters(prev => ({ ...prev, [filter.key]: e.target.checked }))}
                      className="rounded"
                      style={{ accentColor: filter.color }}
                    />
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: filter.color }}></span>
                    <span className="text-sm text-gray-600">{filter.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <span className="font-medium text-gray-700 block mb-3">Color Legend</span>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded" style={{ backgroundColor: '#EF4444' }}></span>
                  <span className="text-gray-600">Company Holiday</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded" style={{ backgroundColor: '#22C55E' }}></span>
                  <span className="text-gray-600">Approved Leave</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded" style={{ backgroundColor: '#EAB308' }}></span>
                  <span className="text-gray-600">Pending Leave</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded" style={{ backgroundColor: '#3B82F6' }}></span>
                  <span className="text-gray-600">Project Deadline</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded" style={{ backgroundColor: '#A855F7' }}></span>
                  <span className="text-gray-600">Birthday</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded" style={{ backgroundColor: '#F97316' }}></span>
                  <span className="text-gray-600">Work Anniversary</span>
                </div>
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <span className="font-medium text-gray-700 block mb-3">Upcoming This Month</span>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {events
                  .filter(e => e.start >= new Date() && e.start <= endOfMonth(currentDate))
                  .sort((a, b) => a.start - b.start)
                  .slice(0, 5)
                  .map(event => (
                    <div key={event.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: EVENT_COLORS[event.type]?.border }}></span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{event.title}</p>
                        <p className="text-xs text-gray-500">{format(event.start, 'MMM d')}</p>
                      </div>
                    </div>
                  ))}
                {events.filter(e => e.start >= new Date() && e.start <= endOfMonth(currentDate)).length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-2">No upcoming events</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Event Detail Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedEvent(null)}>
            <div className="bg-white rounded-xl p-6 w-96 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">{selectedEvent.title}</h3>
                <button onClick={() => setSelectedEvent(null)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{format(selectedEvent.start, 'MMMM d, yyyy')}</span>
                </div>
                <div>
                  <span className={`text-xs px-2 py-1 rounded-full capitalize`} style={{
                    backgroundColor: EVENT_COLORS[selectedEvent.type]?.bg,
                    color: EVENT_COLORS[selectedEvent.type]?.text
                  }}>
                    {selectedEvent.type.replace('_', ' ')}
                  </span>
                  {selectedEvent.status && (
                    <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                      selectedEvent.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {selectedEvent.status}
                    </span>
                  )}
                </div>
                {selectedEvent.description && (
                  <p className="text-sm text-gray-600">{selectedEvent.description}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .rbc-calendar { font-family: inherit; }
        .rbc-header { padding: 8px; font-weight: 600; color: #374151; }
        .rbc-today { background-color: #FEF2F2; }
        .rbc-event { border: none; }
        .rbc-toolbar button { border-radius: 6px; }
        .rbc-toolbar button:hover { background-color: #F3F4F6; }
        .rbc-toolbar button.rbc-active { background-color: #DC2626; color: white; }
      `}</style>
    </div>
  );
};

export default EmployeeCalendar;
