import React, { useState, useEffect, useCallback } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { NotificationBell } from '../../components/notifications';
import { 
  Calendar as CalendarIcon, Plus, X, ChevronLeft, ChevronRight,
  Filter, Trash2, Edit2, Save
} from 'lucide-react';
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
  { key: 'leave', label: 'Leaves', color: '#22C55E' },
  { key: 'project_deadline', label: 'Project Deadlines', color: '#3B82F6' },
  { key: 'birthday', label: 'Birthdays', color: '#A855F7' },
  { key: 'anniversary', label: 'Work Anniversaries', color: '#F97316' }
];

const AdminCalendar = () => {
  const { user, token } = useAuth();
  const [events, setEvents] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [filters, setFilters] = useState({
    holiday: true, leave: true, project_deadline: true, birthday: true, anniversary: true
  });
  
  const [holidayForm, setHolidayForm] = useState({
    name: '', date: '', description: '', is_recurring: false
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

  const fetchHolidays = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/holidays?year=${currentDate.getFullYear()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setHolidays(data);
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  }, [token, currentDate]);

  useEffect(() => {
    fetchEvents();
    fetchHolidays();
  }, [fetchEvents, fetchHolidays]);

  const handleAddHoliday = async () => {
    if (!holidayForm.name || !holidayForm.date) return;
    
    try {
      const response = await fetch(`${API_URL}/api/admin/holidays`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(holidayForm)
      });
      
      if (response.ok) {
        setHolidayForm({ name: '', date: '', description: '', is_recurring: false });
        setShowAddHoliday(false);
        fetchEvents();
        fetchHolidays();
      }
    } catch (error) {
      console.error('Error adding holiday:', error);
    }
  };

  const handleUpdateHoliday = async () => {
    if (!editingHoliday || !holidayForm.name || !holidayForm.date) return;
    
    try {
      const response = await fetch(`${API_URL}/api/admin/holidays/${editingHoliday.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(holidayForm)
      });
      
      if (response.ok) {
        setHolidayForm({ name: '', date: '', description: '', is_recurring: false });
        setEditingHoliday(null);
        fetchEvents();
        fetchHolidays();
      }
    } catch (error) {
      console.error('Error updating holiday:', error);
    }
  };

  const handleDeleteHoliday = async (holidayId) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) return;
    
    try {
      await fetch(`${API_URL}/api/admin/holidays/${holidayId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchEvents();
      fetchHolidays();
    } catch (error) {
      console.error('Error deleting holiday:', error);
    }
  };

  const startEditHoliday = (holiday) => {
    setHolidayForm({
      name: holiday.name,
      date: holiday.date,
      description: holiday.description || '',
      is_recurring: holiday.is_recurring || false
    });
    setEditingHoliday(holiday);
    setShowAddHoliday(false);
  };

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
      <AdminSidebar />
      
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
            <p className="text-gray-500">View leaves, holidays, and important dates</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setShowAddHoliday(true); setEditingHoliday(null); setHolidayForm({ name: '', date: '', description: '', is_recurring: false }); }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              data-testid="add-holiday-btn"
            >
              <Plus className="w-4 h-4" />
              Add Holiday
            </button>
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
                selectable
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="w-80 space-y-4">
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

            {/* Holiday Management */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-700">Company Holidays</span>
                <span className="text-xs text-gray-400">{currentDate.getFullYear()}</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {holidays.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No holidays added</p>
                ) : (
                  holidays.map(holiday => (
                    <div key={holiday.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg group">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{holiday.name}</p>
                        <p className="text-xs text-gray-500">{format(new Date(holiday.date), 'MMM d, yyyy')}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEditHoliday(holiday)} className="p-1 hover:bg-red-100 rounded">
                          <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        <button onClick={() => handleDeleteHoliday(holiday.id)} className="p-1 hover:bg-red-100 rounded">
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Add/Edit Holiday Form */}
            {(showAddHoliday || editingHoliday) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-700">{editingHoliday ? 'Edit Holiday' : 'Add Holiday'}</span>
                  <button onClick={() => { setShowAddHoliday(false); setEditingHoliday(null); }} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Holiday Name"
                    value={holidayForm.name}
                    onChange={(e) => setHolidayForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    data-testid="holiday-name-input"
                  />
                  <input
                    type="date"
                    value={holidayForm.date}
                    onChange={(e) => setHolidayForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    data-testid="holiday-date-input"
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={holidayForm.description}
                    onChange={(e) => setHolidayForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={holidayForm.is_recurring}
                      onChange={(e) => setHolidayForm(prev => ({ ...prev, is_recurring: e.target.checked }))}
                      className="rounded text-purple-600"
                    />
                    <span className="text-sm text-gray-600">Recurring every year</span>
                  </label>
                  <button
                    onClick={editingHoliday ? handleUpdateHoliday : handleAddHoliday}
                    disabled={!holidayForm.name || !holidayForm.date}
                    className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
                    data-testid="save-holiday-btn"
                  >
                    {editingHoliday ? 'Update Holiday' : 'Add Holiday'}
                  </button>
                </div>
              </div>
            )}
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
        .rbc-today { background-color: #F3E8FF; }
        .rbc-event { border: none; }
        .rbc-toolbar button { border-radius: 6px; }
        .rbc-toolbar button:hover { background-color: #F3F4F6; }
        .rbc-toolbar button.rbc-active { background-color: #7C3AED; color: white; }
      `}</style>
    </div>
  );
};

export default AdminCalendar;
