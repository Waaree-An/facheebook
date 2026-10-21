import React, { useState } from 'react';
import {
  Calendar, Plus, ChevronLeft, ChevronRight, Clock,
  BookOpen, FileText, Award, X, CheckCircle2,
} from 'lucide-react';
import type { StudyCalendarEvent, CalendarEventType } from '../types';

const EVENT_TYPE_CONFIG: Record<CalendarEventType, { label: string; color: string; dot: string; icon: any }> = {
  exam: { label: 'Exam', color: 'bg-rose-50 border-rose-200 text-rose-800', dot: 'bg-rose-500', icon: FileText },
  assignment: { label: 'Assignment', color: 'bg-amber-50 border-amber-200 text-amber-800', dot: 'bg-amber-500', icon: BookOpen },
  study_session: { label: 'Study Session', color: 'bg-indigo-50 border-indigo-200 text-indigo-800', dot: 'bg-indigo-500', icon: Clock },
  deadline: { label: 'Deadline', color: 'bg-purple-50 border-purple-200 text-purple-800', dot: 'bg-purple-500', icon: Award },
};

interface StudyCalendarProps {
  events: StudyCalendarEvent[];
  onAddEvent: (event: StudyCalendarEvent) => void;
  onEditEvent?: (event: StudyCalendarEvent) => void;
  onDeleteEvent?: (id: string) => void;
}

export const StudyCalendar: React.FC<StudyCalendarProps> = ({
  events,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<StudyCalendarEvent | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<CalendarEventType>('study_session');
  const [formSubject, setFormSubject] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formStartTime, setFormStartTime] = useState('');
  const [formPriority, setFormPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [formDescription, setFormDescription] = useState('');

  const resetForm = () => {
    setFormTitle('');
    setFormType('study_session');
    setFormSubject('');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormStartTime('');
    setFormPriority('medium');
    setFormDescription('');
  };

  const handleSubmitEvent = (event: React.FormEvent) => {
    event.preventDefault();
    const title = formTitle.trim();
    if (!title) return;

    onAddEvent({
      id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title,
      type: formType,
      subject: formSubject.trim() || 'General',
      date: formDate,
      startTime: formStartTime || undefined,
      priority: formPriority,
      description: formDescription.trim() || undefined,
      completed: false,
      createdAt: new Date().toISOString(),
    });

    resetForm();
    setIsAddModalOpen(false);
  };

  const openAddForDate = (date: string) => {
    setFormDate(date);
    setIsAddModalOpen(true);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const eventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => e.date === dateStr);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-900">Study Calendar</h2>
          <p className="text-sm text-slate-500">Track exams, assignments, and study sessions</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Event
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-bold text-slate-900">{monthNames[month]} {year}</h3>
        <button
          onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-6">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
            {day}
          </div>
        ))}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="h-12" />
        ))}
        {Array.from({ length: totalDays }).map((_, i) => {
          const day = i + 1;
          const dayEvents = eventsForDay(day);
          const today = isToday(day);
          return (
            <div
              key={day}
              onClick={() => openAddForDate(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openAddForDate(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
                }
              }}
              title="Add an event on this day"
              className={`aspect-square flex flex-col items-center justify-center rounded-2xl border cursor-pointer transition-all ${
                today
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-900 font-bold'
                  : 'border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200 text-slate-700'
              }`}
            >
              <span className="text-sm font-medium">{day}</span>
              {dayEvents.length > 0 && (
                <div className="mt-1 flex gap-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <span
                      key={event.id}
                      className={`h-2 w-2 rounded-full ${EVENT_TYPE_CONFIG[event.type].dot}`}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="h-2 w-2 rounded-full bg-slate-300" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Upcoming Events</h3>
        <div className="space-y-2">
          {events
            .slice()
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 5)
            .map((event) => {
              const config = EVENT_TYPE_CONFIG[event.type];
              return (
                <div key={event.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
                  <div className={`h-8 w-8 flex items-center justify-center rounded-lg ${config.color}`}>
                    <config.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{event.title}</p>
                    <p className="text-xs text-slate-500 truncate">{event.subject} • {event.date}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {onEditEvent && (
                      <button
                        onClick={() => setSelectedEvent(event)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 transition-colors"
                        title="Edit event"
                      >
                        <Clock className="h-3 w-3" />
                      </button>
                    )}
                    {onDeleteEvent && (
                      <button
                        onClick={() => onDeleteEvent(event.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50 transition-colors"
                        title="Delete event"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
        {events.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No upcoming events. Add your first exam, assignment, or study session.</p>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsAddModalOpen(false); }}>
          <form onSubmit={handleSubmitEvent} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Add a study event</h3>
                <p className="text-xs text-slate-500">Plan an exam, assignment, or focus session.</p>
              </div>
              <button type="button" onClick={() => { setIsAddModalOpen(false); resetForm(); }} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close add event dialog">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="fb-event-title" className="mb-1.5 block text-xs font-bold text-slate-700">Title</label>
                <input id="fb-event-title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g. Biology midterm exam" autoFocus className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="fb-event-type" className="mb-1.5 block text-xs font-bold text-slate-700">Type</label>
                  <select id="fb-event-type" value={formType} onChange={(e) => setFormType(e.target.value as CalendarEventType)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                    {(Object.keys(EVENT_TYPE_CONFIG) as CalendarEventType[]).map((type) => (
                      <option key={type} value={type}>{EVENT_TYPE_CONFIG[type].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="fb-event-priority" className="mb-1.5 block text-xs font-bold text-slate-700">Priority</label>
                  <select id="fb-event-priority" value={formPriority} onChange={(e) => setFormPriority(e.target.value as 'low' | 'medium' | 'high')} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="fb-event-date" className="mb-1.5 block text-xs font-bold text-slate-700">Date</label>
                  <input id="fb-event-date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div>
                  <label htmlFor="fb-event-time" className="mb-1.5 block text-xs font-bold text-slate-700">Start time</label>
                  <input id="fb-event-time" type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </div>
              </div>

              <div>
                <label htmlFor="fb-event-subject" className="mb-1.5 block text-xs font-bold text-slate-700">Subject</label>
                <input id="fb-event-subject" value={formSubject} onChange={(e) => setFormSubject(e.target.value)} placeholder="e.g. Biology" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
              </div>

              <div>
                <label htmlFor="fb-event-notes" className="mb-1.5 block text-xs font-bold text-slate-700">Notes</label>
                <textarea id="fb-event-notes" rows={3} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Chapters to revise, topics to cover…" className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button type="submit" className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
                Save event
              </button>
              <button type="button" onClick={() => { setIsAddModalOpen(false); resetForm(); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};