import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const EVENT_COLORS = {
  'Meeting': '#8b5cf6',
  'Conference': '#0a84ff',
  'Workshop': '#34c759',
  'Deadline': '#ff9f0a',
  'Other': '#ff375f'
};

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function EventsManager({ role = 'Staff1' }) {
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventFormData, setEventFormData] = useState({ id: null, title: '', event_type: 'Meeting', description: '', location: '', event_date: '', start_time: '', end_time: '', status: 'Upcoming' });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const queryClient = useQueryClient();

  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await fetch('/api/post_events');
      if (!res.ok) throw new Error('Failed to fetch events');
      return res.json();
    }
  });

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    try {
      const method = eventFormData.id ? 'PUT' : 'POST';
      const url = eventFormData.id ? `/api/post_events/${eventFormData.id}` : '/api/post_events';

      // Ensure time formatting is correct (H:i)
      let payload = { ...eventFormData };
      if (payload.start_time && payload.start_time.length > 5) payload.start_time = payload.start_time.substring(0, 5);
      if (payload.end_time && payload.end_time.length > 5) payload.end_time = payload.end_time.substring(0, 5);

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowEventForm(false);
        setEventFormData({ id: null, title: '', event_type: 'Meeting', description: '', location: '', event_date: '', start_time: '', end_time: '', status: 'Upcoming' });
        refetch(); 
      } else {
        alert('Failed to save event');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving event');
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      const res = await fetch(`/api/post_events/${id}`, { method: 'DELETE' });
      if (res.ok) refetch();
    } catch (err) { console.error(err); }
  };

  const editEvent = (item) => {
    // Format for datetime-local or date input
    const formattedDate = item.event_date ? new Date(item.event_date).toISOString().split('T')[0] : '';
    setEventFormData({ 
      ...item, 
      event_date: formattedDate,
      start_time: item.start_time ? item.start_time.substring(0, 5) : '',
      end_time: item.end_time ? item.end_time.substring(0, 5) : '',
      event_type: item.event_type || 'Other'
    });
    setShowEventForm(true);
  };

  // --- Calendar Logic ---
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    let daysArray = [];
    
    // Prev month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      daysArray.push({ 
        day: prevMonthDays - i, 
        isCurrentMonth: false,
        dateStr: new Date(year, month - 1, prevMonthDays - i).toISOString().split('T')[0]
      });
    }
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      daysArray.push({ 
        day: i, 
        isCurrentMonth: true,
        dateStr: new Date(year, month, i, 12).toISOString().split('T')[0] // use noon to avoid timezone shift
      });
    }
    // Next month (fill to 35 or 42)
    const totalSlots = daysArray.length > 35 ? 42 : 35;
    let nextMonthDay = 1;
    while (daysArray.length < totalSlots) {
      daysArray.push({ 
        day: nextMonthDay, 
        isCurrentMonth: false,
        dateStr: new Date(year, month + 1, nextMonthDay).toISOString().split('T')[0]
      });
      nextMonthDay++;
    }
    return daysArray;
  }, [currentMonth]);

  const changeMonth = (offset) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const d = new Date();
    d.setHours(parseInt(h, 10));
    d.setMinutes(parseInt(m, 10));
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };

  const selectedDateStr = new Date(selectedDate.getTime() - (selectedDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  
  // Filter events
  const todayStr = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  const selectedDayEvents = events.filter(e => e.event_date.startsWith(selectedDateStr));
  const upcomingEvents = [...events].filter(e => e.event_date >= todayStr && e.status !== 'Completed').sort((a,b) => new Date(a.event_date) - new Date(b.event_date));
  const historyEvents = [...events].filter(e => e.status === 'Completed').sort((a,b) => new Date(b.event_date) - new Date(a.event_date));

  if (isLoading) return <div className="p-8 text-center text-gray-400">Loading dashboard...</div>;

  return (
    <div className="bg-[#111116] rounded-2xl p-6 shadow-xl text-white font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <span className="bg-[#181822] p-2 rounded-lg border border-[#2b2b35]">📅</span> 
            Post Event
          </h2>
          <p className="text-sm text-gray-400 m-0">Manage and organize your events</p>
        </div>
        {role === 'Staff1' && (
          <button 
            className="bg-[#0a84ff] hover:bg-[#0066cc] text-white px-5 py-2.5 rounded-lg font-semibold transition-all text-sm flex items-center gap-2 shadow-lg shadow-[#0a84ff]/20"
            onClick={() => { setEventFormData({ id: null, title: '', event_type: 'Meeting', description: '', location: '', event_date: selectedDateStr, start_time: '', end_time: '', status: 'Upcoming' }); setShowEventForm(true); }}
          >
            + Add Event
          </button>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left/Middle Column Wrapper */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Top Half: Calendar & Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Calendar */}
            <div className="bg-[#181822] border border-[#2b2b35] rounded-xl p-5 flex flex-col h-[400px]">
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => changeMonth(-1)} className="text-gray-400 hover:text-white p-1">❮</button>
                <h3 className="text-lg font-bold">
                  {currentMonth.toLocaleString('default', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/,/g, '')} 
                  {/* Or 'MM/DD/YY' format as in design */}
                </h3>
                <button onClick={() => changeMonth(1)} className="text-gray-400 hover:text-white p-1">❯</button>
              </div>
              
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {DAYS_OF_WEEK.map(d => <div key={d} className="text-xs font-semibold text-gray-500 py-2">{d}</div>)}
              </div>
              
              <div className="grid grid-cols-7 gap-1 text-center flex-grow">
                {calendarDays.map((d, i) => {
                  const isSelected = d.dateStr === selectedDateStr;
                  const dayEvents = events.filter(e => e.event_date.startsWith(d.dateStr));
                  
                  return (
                    <div 
                      key={i} 
                      onClick={() => {
                        const newDate = new Date(d.dateStr);
                        // Fix timezone shift
                        newDate.setMinutes(newDate.getMinutes() + newDate.getTimezoneOffset());
                        setSelectedDate(newDate);
                        if (!d.isCurrentMonth) setCurrentMonth(newDate);
                      }}
                      className={`relative flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all border border-transparent
                        ${!d.isCurrentMonth ? 'text-gray-600' : 'text-gray-300 hover:bg-[#2b2b35]'} 
                        ${isSelected ? 'bg-[#0a84ff] !text-white font-bold shadow-md shadow-[#0a84ff]/30' : ''}
                      `}
                    >
                      <span className="mb-1">{d.day}</span>
                      {dayEvents.length > 0 && (
                        <div className="flex gap-0.5 absolute bottom-1">
                          {dayEvents.slice(0,3).map((e, idx) => (
                            <div key={idx} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: EVENT_COLORS[e.event_type] || EVENT_COLORS['Other'] }} />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-[#2b2b35] text-[10px] text-gray-400">
                {Object.entries(EVENT_COLORS).map(([type, color]) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    {type}
                  </div>
                ))}
              </div>
            </div>

            {/* Event Details */}
            <div className="bg-[#181822] border border-[#2b2b35] rounded-xl p-5 flex flex-col h-[400px]">
              <div className="text-right text-gray-300 font-medium mb-4">
                {new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
              </div>
              <h3 className="text-base font-bold mb-4 text-gray-400 border-b border-[#2b2b35] pb-2">Event Details</h3>
              
              <div className="flex-grow overflow-y-auto pr-2">
                {selectedDayEvents.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500 text-sm">No events scheduled for this day.</div>
                ) : (
                  selectedDayEvents.map(ev => (
                    <div key={ev.id} className="mb-6 last:mb-0 bg-[#0c0c10] p-4 rounded-xl border border-[#1f1f26]">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: EVENT_COLORS[ev.event_type] || EVENT_COLORS['Other'] }} />
                        <h4 className="text-white font-bold m-0">{ev.title}</h4>
                      </div>
                      
                      <div className="flex flex-col gap-3 text-sm">
                        <div className="flex items-start gap-3">
                          <span className="text-gray-500 mt-0.5">📅</span>
                          <div>
                            <span className="text-gray-500 text-xs block">Date</span>
                            <span className="text-gray-300">{new Date(ev.event_date).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: '2-digit' })} ({new Date(ev.event_date).toLocaleDateString(undefined, { weekday: 'long' })})</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-gray-500 mt-0.5">🕒</span>
                          <div>
                            <span className="text-gray-500 text-xs block">Time</span>
                            <span className="text-gray-300">
                              {ev.start_time ? formatTime(ev.start_time) : 'TBA'} {ev.end_time ? `- ${formatTime(ev.end_time)}` : ''}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-gray-500 mt-0.5">📍</span>
                          <div>
                            <span className="text-gray-500 text-xs block">Location</span>
                            <span className="text-gray-300">{ev.location || 'TBA'}</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-gray-500 mt-0.5">📝</span>
                          <div>
                            <span className="text-gray-500 text-xs block">Description</span>
                            <span className="text-gray-300 leading-relaxed">{ev.description || 'No description provided.'}</span>
                          </div>
                        </div>
                      </div>
                      
                      {role === 'Staff1' && (
                        <div className="mt-4 pt-3 border-t border-[#1f1f26] flex gap-2">
                          <button className="flex-1 bg-transparent border border-[#2b2b35] hover:bg-[#2b2b35] text-[#0a84ff] py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2" onClick={() => editEvent(ev)}>
                            ✏️ Edit Event
                          </button>
                          <button className="bg-transparent border border-[#2b2b35] hover:bg-[rgba(255,69,58,0.1)] text-[#ff453a] py-1.5 px-3 rounded-lg text-xs transition-colors" onClick={() => handleDeleteEvent(ev.id)}>
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Bottom Half: History */}
          <div className="bg-[#181822] border border-[#2b2b35] rounded-xl p-5 flex-grow">
            <h3 className="text-base font-bold mb-4">Event History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-[#2b2b35]">
                    <th className="pb-3 font-medium">Event Name</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Time</th>
                    <th className="pb-3 font-medium">Location</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyEvents.length === 0 ? (
                    <tr><td colSpan="5" className="py-4 text-center text-gray-500">No completed events found.</td></tr>
                  ) : historyEvents.slice(0, 5).map(ev => (
                    <tr key={ev.id} className="border-b border-[#1f1f26] last:border-0 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                      <td className="py-3 flex items-center gap-2">
                        <span className="text-[#34c759]">✓</span> {ev.title}
                      </td>
                      <td className="py-3 text-gray-400">{new Date(ev.event_date).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: '2-digit' })}</td>
                      <td className="py-3 text-gray-400">{ev.start_time ? formatTime(ev.start_time) : 'TBA'} - {ev.end_time ? formatTime(ev.end_time) : 'TBA'}</td>
                      <td className="py-3 text-gray-400">{ev.location || 'TBA'}</td>
                      <td className="py-3"><span className="text-[#34c759] border border-[rgba(52,199,89,0.2)] bg-[rgba(52,199,89,0.1)] px-2 py-0.5 rounded text-xs">Completed</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {historyEvents.length > 5 && (
                <button className="w-full mt-2 py-2 text-center text-xs text-gray-400 hover:text-white transition-colors">View all history ❯</button>
              )}
            </div>
          </div>
          
        </div>

        {/* Right Column: Upcoming Events */}
        <div className="lg:col-span-4 bg-[#181822] border border-[#2b2b35] rounded-xl p-5 h-[calc(400px+24px+100px)] lg:h-auto flex flex-col">
          <h3 className="text-base font-bold mb-5">Upcoming Events</h3>
          <div className="flex-grow overflow-y-auto pr-1 flex flex-col gap-3">
            {upcomingEvents.length === 0 ? (
              <div className="text-center text-gray-500 text-sm mt-10">No upcoming events.</div>
            ) : upcomingEvents.map(ev => (
              <div key={ev.id} className="bg-[#0c0c10] border border-[#1f1f26] p-4 rounded-xl flex gap-4 hover:border-[#2b2b35] transition-colors cursor-pointer" onClick={() => {
                  const d = new Date(ev.event_date);
                  d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
                  setSelectedDate(d);
                  setCurrentMonth(d);
                }}>
                <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg shrink-0" style={{ backgroundColor: `${EVENT_COLORS[ev.event_type] || EVENT_COLORS['Other']}20` }}>
                  <span style={{ color: EVENT_COLORS[ev.event_type] || EVENT_COLORS['Other'] }} className="text-xl">📅</span>
                </div>
                <div className="flex-grow min-w-0">
                  <h4 className="text-sm font-bold text-white truncate mb-1">{ev.title}</h4>
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>{new Date(ev.event_date).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: '2-digit' })} ({new Date(ev.event_date).toLocaleDateString(undefined, { weekday: 'short' })})</span>
                    <span>{ev.start_time ? formatTime(ev.start_time) : ''}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 truncate">{ev.location || 'TBA'}</div>
                </div>
              </div>
            ))}
          </div>
          {upcomingEvents.length > 0 && (
             <button className="w-full mt-4 pt-3 border-t border-[#2b2b35] text-center text-xs text-gray-400 hover:text-white transition-colors">View all upcoming events ❯</button>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#181822] border border-[#2b2b35] rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative">
            <button className="absolute top-4 right-4 text-gray-500 hover:text-white" onClick={() => setShowEventForm(false)}>✕</button>
            <h4 className="text-white text-lg font-bold mb-6">{eventFormData.id ? 'Edit Event' : 'Schedule New Event'}</h4>
            <form onSubmit={handleSaveEvent}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div className="flex flex-col gap-2">
                  <label className="text-gray-400 text-xs font-medium">Event Title</label>
                  <input type="text" required value={eventFormData.title} onChange={e => setEventFormData({ ...eventFormData, title: e.target.value })} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors" placeholder="e.g. Team Standup" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-gray-400 text-xs font-medium">Event Type</label>
                  <select required value={eventFormData.event_type} onChange={e => setEventFormData({ ...eventFormData, event_type: e.target.value })} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors">
                    {Object.keys(EVENT_COLORS).map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-gray-400 text-xs font-medium">Event Date</label>
                  <input type="date" min={todayStr} required value={eventFormData.event_date} onChange={e => setEventFormData({ ...eventFormData, event_date: e.target.value })} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <label className="text-gray-400 text-xs font-medium">Start Time</label>
                    <input type="time" value={eventFormData.start_time} onChange={e => setEventFormData({ ...eventFormData, start_time: e.target.value })} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-gray-400 text-xs font-medium">End Time</label>
                    <input type="time" min={eventFormData.start_time} value={eventFormData.end_time} onChange={e => setEventFormData({ ...eventFormData, end_time: e.target.value })} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-gray-400 text-xs font-medium">Location</label>
                  <input type="text" value={eventFormData.location} onChange={e => setEventFormData({ ...eventFormData, location: e.target.value })} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors" placeholder="e.g. Conference Room A" />
                </div>
                {eventFormData.id && (
                  <div className="flex flex-col gap-2">
                    <label className="text-gray-400 text-xs font-medium">Status</label>
                    <select required value={eventFormData.status} onChange={e => setEventFormData({ ...eventFormData, status: e.target.value })} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors">
                      <option value="Upcoming">Upcoming</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                )}
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-gray-400 text-xs font-medium">Description</label>
                  <textarea rows="3" value={eventFormData.description} onChange={e => setEventFormData({ ...eventFormData, description: e.target.value })} className="p-3 bg-[#0c0c10] border border-[#2b2b35] rounded-lg text-white text-sm focus:border-[#0a84ff] focus:outline-none transition-colors w-full resize-y" placeholder="Brief details about the event..."></textarea>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[#2b2b35]">
                <button type="button" className="bg-transparent hover:bg-[#2b2b35] text-gray-300 px-5 py-2.5 rounded-lg font-semibold transition-all text-sm" onClick={() => setShowEventForm(false)}>Cancel</button>
                <button type="submit" className="bg-[#0a84ff] hover:bg-[#0066cc] text-white px-6 py-2.5 rounded-lg font-semibold transition-all text-sm shadow-lg shadow-[#0a84ff]/20">Save Event</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
