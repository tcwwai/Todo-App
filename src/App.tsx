import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Trash2, Check, Calendar, X, Pencil } from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Todo {
  id: string;
  task: string;
  is_completed: boolean;
  created_at: string;
  due_date: string | null;
  description: string | null;
}

interface Subtask {
  id: string;
  todo_id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
  due_date: string | null;
}

const sortTodosByDate = (items: Todo[]): Todo[] => {
  return [...items].sort((a, b) => {
    const aTime = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;

    if (aTime !== bTime) {
      return aTime - bTime;
    }

    const aCreated = new Date(a.created_at).getTime();
    const bCreated = new Date(b.created_at).getTime();
    return bCreated - aCreated;
  });
};

const sortSubtasksByDate = (items: Subtask[]): Subtask[] => {
  return [...items].sort((a, b) => {
    const aTime = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;

    if (aTime !== bTime) {
      return aTime - bTime;
    }

    const aCreated = new Date(a.created_at).getTime();
    const bCreated = new Date(b.created_at).getTime();
    return bCreated - aCreated;
  });
};

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [input, setInput] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSide, setEditingSide] = useState<'left' | 'right' | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [showNewTask, setShowNewTask] = useState(false);
  const [description, setDescription] = useState('');
  const [editTask, setEditTask] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [globalFilter, setGlobalFilter] = useState<'active' | 'unscheduled'>('active');
  const [newSubtaskTitleByTodo, setNewSubtaskTitleByTodo] = useState<Record<string, string>>({});
  const [newSubtaskDueDateByTodo, setNewSubtaskDueDateByTodo] = useState<Record<string, string>>({});
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState('');
  const [editSubtaskDueDate, setEditSubtaskDueDate] = useState('');
  const [openDayParents, setOpenDayParents] = useState<Record<string, boolean>>({});
  const [openOverviewParents, setOpenOverviewParents] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchTodos();
    fetchSubtasks();
  }, []);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTodos(sortTodosByDate(data || []));
    } catch (error) {
      console.error('Error fetching todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubtasks = async () => {
    try {
      const { data, error } = await supabase
        .from('subtasks')
        .select('*')
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubtasks(sortSubtasksByDate(data || []));
    } catch (error) {
      console.error('Error fetching subtasks:', error);
    }
  };

  const addTodo = async (e: React.FormEvent): Promise<boolean> => {
    e.preventDefault();
    if (!input.trim()) return false;

    try {
      let isoDueDate: string | null = null;

      if (dueDate.trim()) {
        const parsed = parseDdMmYyyyToISO(dueDate);
        if (!parsed) {
          alert('Please enter the date in dd/mm/yyyy format.');
          return false;
        }
        isoDueDate = parsed;
      }

      const { data, error } = await supabase
        .from('todos')
        .insert([{
          task: input.trim(),
          description: description.trim() || null,
          due_date: isoDueDate
        }])
        .select();

      if (error) throw error;
      if (data) {
        setTodos(sortTodosByDate([...data, ...todos]));
        setInput('');
        setDueDate('');
        setDescription('');
        return true;
      }
    } catch (error) {
      console.error('Error adding todo:', error);
      alert('There was a problem saving this task. Please make sure your database has a "description" column on the todos table, then try again.');
    }
    return false;
  };

  const toggleComplete = async (id: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('todos')
        .update({ is_completed: !isCompleted })
        .eq('id', id);

      if (error) throw error;
      setTodos(todos.map(todo =>
        todo.id === id ? { ...todo, is_completed: !isCompleted } : todo
      ));
    } catch (error) {
      console.error('Error updating todo:', error);
      const message =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as any).message)
          : 'Unknown error updating task.';
      alert(`There was a problem updating this task: ${message}`);
    }
  };

  const saveEdit = async (id: string) => {
    if (!editTask.trim()) {
      setEditingId(null);
      setEditingSide(null);
      return;
    }

    try {
      let isoDueDate: string | null = null;

      if (editDueDate.trim()) {
        const parsed = parseDdMmYyyyToISO(editDueDate);
        if (!parsed) {
          alert('Please enter the date in dd/mm/yyyy format.');
          return;
        }
        isoDueDate = parsed;
      }

      const updates = {
        task: editTask.trim(),
        description: editDescription.trim() || null,
        due_date: isoDueDate,
      };

      const { data, error } = await supabase
        .from('todos')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      if (data) {
        const updated = data[0];
        setTodos(
          sortTodosByDate(
            todos.map((todo) => (todo.id === id ? { ...todo, ...updated } : todo))
          )
        );
      }
      setEditingId(null);
      setEditingSide(null);
      setEditTask('');
      setEditDescription('');
      setEditDueDate('');
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTodos(todos.filter(todo => todo.id !== id));
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const addSubtask = async (todoId: string) => {
    const title = (newSubtaskTitleByTodo[todoId] || '').trim();
    const dueInput = (newSubtaskDueDateByTodo[todoId] || '').trim();

    if (!title) {
      return;
    }

    try {
      let isoDueDate: string | null = null;

      if (dueInput) {
        const parsed = parseDdMmYyyyToISO(dueInput);
        if (!parsed) {
          alert('Please enter the date in dd/mm/yyyy format for the sub-task.');
          return;
        }
        isoDueDate = parsed;
      }

      const { data, error } = await supabase
        .from('subtasks')
        .insert([
          {
            todo_id: todoId,
            title,
            due_date: isoDueDate,
          },
        ])
        .select();

      if (error) throw error;
      if (data) {
        setSubtasks(sortSubtasksByDate([...subtasks, ...data]));
        setNewSubtaskTitleByTodo((prev) => ({ ...prev, [todoId]: '' }));
        setNewSubtaskDueDateByTodo((prev) => ({ ...prev, [todoId]: '' }));
      }
    } catch (error) {
      console.error('Error adding subtask:', error);
      const message =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as any).message)
          : 'Unknown error adding sub-task.';
      alert(
        `There was a problem adding this sub-task. Please make sure your Supabase database has a "subtasks" table with the expected columns, then try again.\n\nDetails: ${message}`
      );
    }
  };

  const toggleSubtaskComplete = async (id: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('subtasks')
        .update({ is_completed: !isCompleted })
        .eq('id', id);

      if (error) throw error;
      setSubtasks((current) =>
        current.map((subtask) =>
          subtask.id === id
            ? { ...subtask, is_completed: !isCompleted }
            : subtask
        )
      );
    } catch (error) {
      console.error('Error updating subtask:', error);
    }
  };

  const deleteSubtask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSubtasks((current) => current.filter((subtask) => subtask.id !== id));
    } catch (error) {
      console.error('Error deleting subtask:', error);
    }
  };

  const saveSubtaskEdit = async (id: string) => {
    if (!editSubtaskTitle.trim()) {
      setEditingSubtaskId(null);
      setEditSubtaskTitle('');
      setEditSubtaskDueDate('');
      return;
    }

    try {
      let isoDueDate: string | null = null;

      if (editSubtaskDueDate.trim()) {
        const parsed = parseDdMmYyyyToISO(editSubtaskDueDate);
        if (!parsed) {
          alert('Please enter the date in dd/mm/yyyy format for the sub-task.');
          return;
        }
        isoDueDate = parsed;
      }

      const updates = {
        title: editSubtaskTitle.trim(),
        due_date: isoDueDate,
      };

      const { data, error } = await supabase
        .from('subtasks')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      if (data) {
        const updated = data[0];
        setSubtasks((current) =>
          sortSubtasksByDate(
            current.map((subtask) =>
              subtask.id === id ? { ...subtask, ...updated } : subtask
            )
          )
        );
      }

      setEditingSubtaskId(null);
      setEditSubtaskTitle('');
      setEditSubtaskDueDate('');
    } catch (error) {
      console.error('Error updating subtask:', error);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isSameDay = (dateString: string | null, targetDate: Date) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return (
      date.getFullYear() === targetDate.getFullYear() &&
      date.getMonth() === targetDate.getMonth() &&
      date.getDate() === targetDate.getDate()
    );
  };
  
  const parseDdMmYyyyToISO = (value: string): string | null => {
    const trimmed = value.trim();
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
    if (!match) return null;

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date.toISOString();
  };

  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getMonthGrid = (month: Date) => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstOfMonth = new Date(year, m, 1);
    const startDay = firstOfMonth.getDay();
    const gridStart = new Date(year, m, 1 - startDay);

    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      days.push(
        new Date(
          gridStart.getFullYear(),
          gridStart.getMonth(),
          gridStart.getDate() + i
        )
      );
    }
    return days;
  };

  type InlineDatePickerProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    inputClassName: string;
  };

  const InlineDatePicker = ({
    value,
    onChange,
    placeholder = 'dd/mm/yyyy',
    inputClassName,
  }: InlineDatePickerProps) => {
    const [open, setOpen] = useState(false);
    const [month, setMonth] = useState<Date>(() => {
      const trimmed = value.trim();
      if (trimmed) {
        const iso = parseDdMmYyyyToISO(trimmed);
        if (iso) return new Date(iso);
      }
      return new Date();
    });

    useEffect(() => {
      if (!open) return;
      const trimmed = value.trim();
      if (trimmed) {
        const iso = parseDdMmYyyyToISO(trimmed);
        if (iso) {
          setMonth(new Date(iso));
          return;
        }
      }
      setMonth(new Date());
    }, [open, value]);

    const selectedIso = value.trim() ? parseDdMmYyyyToISO(value) : null;
    const selectedDate = selectedIso ? new Date(selectedIso) : null;
    const days = getMonthGrid(month);
    const today = new Date();

    const handleSelectDay = (date: Date) => {
      const iso = date.toISOString();
      onChange(formatDateForInput(iso));
      setOpen(false);
    };

    const monthLabel = month.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    return (
      <div className="relative inline-flex items-center">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="absolute left-0 top-1/2 -translate-y-1/2 pl-3 text-slate-400 hover:text-slate-600"
          aria-label="Open date picker"
        >
          <Calendar className="h-4 w-4" />
        </button>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode="numeric"
          maxLength={10}
          className={inputClassName}
        />
        {open && (
          <div className="absolute left-0 top-full mt-2 z-50 w-64 rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-lg shadow-slate-200 sm:left-full sm:top-1/2 sm:mt-0 sm:ml-3 sm:-translate-y-1/2">
            <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-slate-700">
              <button
                type="button"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() - 1, 1)
                  )
                }
                className="rounded-full px-2 py-1 text-slate-500 hover:bg-slate-100"
                aria-label="Previous month"
              >
                
                
                
                
                
                
                
                
                
                
                
                ‹
              </button>
              <span>{monthLabel}</span>
              <button
                type="button"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() + 1, 1)
                  )
                }
                className="rounded-full px-2 py-1 text-slate-500 hover:bg-slate-100"
                aria-label="Next month"
              >
                ›
              </button>
            </div>
            <div className="mb-1 grid grid-cols-7 gap-1 text-[10px] font-medium text-slate-400">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <div
                  key={d}
                  className="flex h-6 w-6 items-center justify-center"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((date) => {
                const inCurrentMonth =
                  date.getMonth() === month.getMonth() &&
                  date.getFullYear() === month.getFullYear();
                const isSelected =
                  selectedDate && isSameDay(date.toISOString(), selectedDate);
                const isToday = isSameDay(date.toISOString(), today);

                let cellClasses =
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs ';
                if (isSelected) {
                  cellClasses +=
                    'bg-indigo-600 text-white shadow-sm shadow-indigo-500/40';
                } else if (!inCurrentMonth) {
                  cellClasses += 'text-slate-300 hover:bg-slate-50';
                } else if (isToday) {
                  cellClasses +=
                    'border border-indigo-500 bg-indigo-50 text-indigo-600';
                } else {
                  cellClasses += 'text-slate-700 hover:bg-slate-100';
                }

                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    onClick={() => handleSelectDay(date)}
                    className={cellClasses}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };
  const todosWithDates = todos.filter((todo) => todo.due_date);

  const dayTodos = todos.filter(
    (todo) => todo.due_date && isSameDay(todo.due_date, currentDate)
  );

  const daySubtasks = subtasks.filter(
    (subtask) => subtask.due_date && isSameDay(subtask.due_date, currentDate)
  );

  const dayRemainingCount =
    dayTodos.filter((todo) => !todo.is_completed).length +
    daySubtasks.filter((subtask) => !subtask.is_completed).length;

  const allActiveTodos = todos.filter((todo) => !todo.is_completed);
  const unscheduledTodos = todos.filter(
    (todo) => !todo.due_date && !todo.is_completed
  );
  const allActiveSubtasks = subtasks.filter((subtask) => !subtask.is_completed);
  const unscheduledSubtasks = subtasks.filter(
    (subtask) => !subtask.due_date && !subtask.is_completed
  );

  const rightTodos =
    globalFilter === 'active' ? allActiveTodos : unscheduledTodos;

  const visibleTodos: Todo[] = dayTodos;

  return (
    <div className="h-screen overflow-y-scroll bg-slate-50 py-10 px-4 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Tasks</h1>
          </div>
          <button
            type="button"
            onClick={() => setShowNewTask(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 transition-colors hover:bg-indigo-700"
          >
            <Plus size={18} />
            Add Task
          </button>
        </header>

        <div className="space-y-6">
          {showNewTask && (
            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6 flex items-start justify-between">
                <h2 className="text-xl font-semibold text-slate-900">New Task</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewTask(false);
                    setDescription('');
                    setInput('');
                    setDueDate('');
                  }}
                  className="text-slate-400 transition-colors hover:text-slate-600"
                  aria-label="Close new task"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  const ok = await addTodo(e);
                  if (ok) {
                    setShowNewTask(false);
                  }
                }}
                className="space-y-5"
              >
                <input
                  id="task-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="What needs to be done?"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description (optional)"
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <InlineDatePicker
                    value={dueDate}
                    onChange={setDueDate}
                    placeholder="dd/mm/yyyy"
                    inputClassName="w-[190px] rounded-2xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />

                  <div className="ml-auto flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewTask(false);
                        setDescription('');
                        setInput('');
                        setDueDate('');
                      }}
                      className="text-sm font-medium text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 transition-colors hover:bg-indigo-700"
                    >
                      <Plus size={16} />
                      Add Task
                    </button>
                  </div>
                </div>
              </form>
            </section>
          )}

          <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)]">
            <section className="relative z-10 rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm backdrop-blur-sm sm:p-8">
              <div className="mb-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {currentDate.toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      {isSameDay(new Date().toISOString(), currentDate) && ' (Today)'}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {dayRemainingCount} {dayRemainingCount === 1 ? 'task' : 'tasks'} remaining
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setWeekOffset((prev) => prev - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
                        aria-label="Previous week"
                      >
                        
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setWeekOffset(0);
                          setCurrentDate(new Date());
                        }}
                        className="rounded-2xl bg-indigo-600 px-4 py-1.5 text-[12px] font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => setWeekOffset((prev) => prev + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
                        aria-label="Next week"
                      >
                        ›
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 px-2 sm:flex sm:gap-3 sm:px-4 sm:justify-center">
                  {Array.from({ length: 7 }, (_, index) => {
                    const base = new Date(currentDate);
                    const startOfWeek = new Date(
                      base.getFullYear(),
                      base.getMonth(),
                      base.getDate() - base.getDay() + weekOffset * 7
                    );
                    const dateForDay = new Date(
                      startOfWeek.getFullYear(),
                      startOfWeek.getMonth(),
                      startOfWeek.getDate() + index
                    );
                    const isSelected = isSameDay(dateForDay.toISOString(), currentDate);
                    const hasTodosForDay =
                      todosWithDates.some((todo) =>
                        isSameDay(todo.due_date, dateForDay)
                      ) ||
                      subtasks.some(
                        (subtask) =>
                          subtask.due_date &&
                          isSameDay(subtask.due_date, dateForDay)
                      );

                    const weekdayLabel = dateForDay.toLocaleDateString('en-US', {
                      weekday: 'long',
                    });

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setWeekOffset(0);
                          setCurrentDate(dateForDay);
                        }}
                        className={`flex flex-col items-center justify-center rounded-xl px-1.5 py-1 text-[11px] transition-colors sm:rounded-2xl sm:px-3 sm:py-2 sm:text-sm ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                            : 'bg-slate-50 text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <span className="font-medium opacity-80 truncate max-w-[56px] sm:max-w-none">
                          {weekdayLabel}
                        </span>
                        <div className="mt-0.5 flex items-center gap-1 text-base font-semibold sm:mt-1 sm:text-lg">
                          <span>{dateForDay.getDate()}</span>
                          {hasTodosForDay && (
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isSelected ? 'bg-white' : 'bg-indigo-500'
                              }`}
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            <div>
              {loading ? (
                <div className="py-10 text-center text-sm text-slate-500">Loading tasks...</div>
              ) : todos.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  You don't have any tasks yet.
                </div>
              ) : visibleTodos.length === 0 && daySubtasks.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  No tasks on this day.
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleTodos.map((todo) => {
                    const isEditing = editingId === todo.id && editingSide === 'left';
                    const todoSubtasks = sortSubtasksByDate(
                      subtasks.filter((subtask) => subtask.todo_id === todo.id)
                    );
                    const newSubtaskTitle = newSubtaskTitleByTodo[todo.id] || '';
                    const newSubtaskDueDate = newSubtaskDueDateByTodo[todo.id] || '';
                    const hasSubtasks = todoSubtasks.length > 0;
                    const isSubtasksOpen = openDayParents[todo.id] ?? false;

                    const articleClasses = hasSubtasks
                      ? 'group flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-4 text-sm shadow-sm transition-colors hover:bg-white hover:shadow-md'
                      : 'group flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm shadow-sm transition-colors hover:bg-white hover:shadow-md';
                    return (
                      <article
                        key={todo.id}
                        className={articleClasses}
                      >
                        <button
                          type="button"
                          onClick={() => toggleComplete(todo.id, todo.is_completed)}
                          className={`mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-white transition-all ${
                            todo.is_completed
                              ? 'border-indigo-600 bg-indigo-600 shadow-sm'
                              : 'border-slate-300 bg-white text-transparent hover:border-indigo-500'
                          }`}
                        >
                          <Check size={14} className="text-white" />
                        </button>
                        <div className="flex-1">
                          {isEditing ? (
                            <div className="space-y-3">
                              <input
                                type="text"
                                value={editTask}
                                onChange={(e) => setEditTask(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                              />
                              <textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                rows={2}
                                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                              />
                              <div className="flex flex-wrap items-center gap-3">
                                <InlineDatePicker
                                  value={editDueDate}
                                  onChange={setEditDueDate}
                                  placeholder="dd/mm/yyyy"
                                  inputClassName="rounded-xl border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                                <div className="ml-auto flex items-center gap-2 text-xs">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingId(null);
                                      setEditingSide(null);
                                      setEditTask('');
                                      setEditDescription('');
                                      setEditDueDate('');
                                    }}
                                    className="rounded-full px-3 py-1 font-medium text-slate-500 hover:text-slate-700"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => saveEdit(todo.id)}
                                    className="rounded-full bg-indigo-600 px-3 py-1 font-medium text-white shadow-sm hover:bg-indigo-700"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                              {todoSubtasks.length > 0 && (
                                <div className="mt-2 space-y-2">
                                  {todoSubtasks.map((subtask) => (
                                    <div
                                      key={subtask.id}
                                      className="flex items-center gap-3 rounded-xl bg-white/80 px-3 py-2 text-xs"
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          toggleSubtaskComplete(
                                            subtask.id,
                                            subtask.is_completed
                                          )
                                        }
                                        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border text-white transition-all ${
                                          subtask.is_completed
                                            ? 'border-indigo-600 bg-indigo-600'
                                            : 'border-slate-300 bg-white text-transparent hover:border-indigo-500'
                                        }`}
                                      >
                                        <Check size={10} className="text-white" />
                                      </button>
                                      <div className="flex-1">
                                        <p
                                          className={`text-sm font-medium ${
                                            subtask.is_completed
                                              ? 'text-slate-400 line-through'
                                              : 'text-slate-800'
                                          }`}
                                        >
                                          {subtask.title}
                                        </p>
                                        {subtask.due_date && (
                                          <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                                            <Calendar size={10} />
                                            <span>{formatDate(subtask.due_date)}</span>
                                          </div>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => deleteSubtask(subtask.id)}
                                        className="rounded-full p-1 text-slate-300 hover:text-red-500"
                                        aria-label="Delete sub-task"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <input
                                  type="text"
                                  value={newSubtaskTitle}
                                  onChange={(e) =>
                                    setNewSubtaskTitleByTodo((prev) => ({
                                      ...prev,
                                      [todo.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="Add sub-task"
                                  className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                                <InlineDatePicker
                                  value={newSubtaskDueDate}
                                  onChange={(value) =>
                                    setNewSubtaskDueDateByTodo((prev) => ({
                                      ...prev,
                                      [todo.id]: value,
                                    }))
                                  }
                                  placeholder="dd/mm/yyyy"
                                  inputClassName="w-[130px] rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-[11px] text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                                <button
                                  type="button"
                                  onClick={() => addSubtask(todo.id)}
                                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm hover:bg-indigo-700"
                                >
                                  <Plus size={12} />
                                  Add
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <h3
                                className={`text-sm font-medium ${
                                  todo.is_completed
                                    ? 'text-slate-400 line-through'
                                    : 'text-slate-900'
                                }`}
                              >
                                {todo.task}
                              </h3>
                              {todo.description && (
                                <p className="mt-1 text-xs text-slate-500">{todo.description}</p>
                              )}
                              {todo.due_date && (
                                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                  <Calendar size={14} />
                                  <span>{formatDate(todo.due_date)}</span>
                                </div>
                              )}
                              {hasSubtasks && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenDayParents((prev) => ({
                                      ...prev,
                                      [todo.id]: !isSubtasksOpen,
                                    }))
                                  }
                                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
                                >
                                  <span>{isSubtasksOpen ? 'Hide sub-tasks' : 'Show sub-tasks'}</span>
                                  <span
                                    className={`transition-transform ${
                                      isSubtasksOpen ? 'rotate-180' : ''
                                    }`}
                                  >
                                    ˅
                                  </span>
                                </button>
                              )}
                              {isSubtasksOpen && hasSubtasks && (
                                <div className="mt-2 space-y-2">
                                  {todoSubtasks.map((subtask) => (
                                    <div
                                      key={subtask.id}
                                      className="flex items-center gap-3 rounded-xl bg-white/80 px-3 py-2 text-xs"
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          toggleSubtaskComplete(
                                            subtask.id,
                                            subtask.is_completed
                                          )
                                        }
                                        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border text-white transition-all ${
                                          subtask.is_completed
                                            ? 'border-indigo-600 bg-indigo-600'
                                            : 'border-slate-300 bg-white text-transparent hover:border-indigo-500'
                                        }`}
                                      >
                                        <Check size={10} className="text-white" />
                                      </button>
                                      <div className="flex-1">
                                        <p
                                          className={`text-sm font-medium ${
                                            subtask.is_completed
                                              ? 'text-slate-400 line-through'
                                              : 'text-slate-800'
                                          }`}
                                        >
                                          {subtask.title}
                                        </p>
                                        {subtask.due_date && (
                                          <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                                            <Calendar size={10} />
                                            <span>{formatDate(subtask.due_date)}</span>
                                          </div>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => deleteSubtask(subtask.id)}
                                        className="rounded-full p-1 text-slate-300 hover:text-red-500"
                                        aria-label="Delete sub-task"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {!isEditing && (
                            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(todo.id);
                                  setEditingSide('left');
                                  setEditTask(todo.task);
                                  setEditDescription(todo.description || '');
                                  setEditDueDate(formatDateForInput(todo.due_date));
                                }}
                                className="rounded-full p-1 text-slate-400 hover:text-slate-700"
                                aria-label="Edit task"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteTodo(todo.id)}
                                className="rounded-full p-1 text-slate-400 hover:text-red-500"
                                aria-label="Delete task"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                  {daySubtasks.map((subtask) => {
                    const parentTodo = todos.find(
                      (todo) => todo.id === subtask.todo_id
                    );
                    return (
                    <article
                      key={subtask.id}
                      className="group flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-4 text-sm shadow-sm transition-colors hover:bg-white hover:shadow-md"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          toggleSubtaskComplete(subtask.id, subtask.is_completed)
                        }
                        className={`mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-white transition-all ${
                          subtask.is_completed
                            ? 'border-indigo-600 bg-indigo-600 shadow-sm'
                            : 'border-slate-300 bg-white text-transparent hover:border-indigo-500'
                        }`}
                      >
                        <Check size={14} className="text-white" />
                      </button>
                      <div className="flex-1">
                        {editingSubtaskId === subtask.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editSubtaskTitle}
                              onChange={(e) => setEditSubtaskTitle(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            />
                            <div className="flex flex-wrap items-center gap-3">
                              <InlineDatePicker
                                value={editSubtaskDueDate}
                                onChange={setEditSubtaskDueDate}
                                placeholder="dd/mm/yyyy"
                                inputClassName="rounded-xl border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                              />
                              <div className="ml-auto flex items-center gap-2 text-xs">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSubtaskId(null);
                                    setEditSubtaskTitle('');
                                    setEditSubtaskDueDate('');
                                  }}
                                  className="rounded-full px-3 py-1 font-medium text-slate-500 hover:text-slate-700"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => saveSubtaskEdit(subtask.id)}
                                  className="rounded-full bg-indigo-600 px-3 py-1 font-medium text-white shadow-sm hover:bg-indigo-700"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h3
                              className={`flex items-center gap-2 text-sm font-medium ${
                                subtask.is_completed
                                  ? 'text-slate-400 line-through'
                                  : 'text-slate-900'
                              }`}
                            >
                              <span>{subtask.title}</span>
                              {parentTodo && (
                                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600 truncate max-w-[140px]">
                                  {parentTodo.task}
                                </span>
                              )}
                            </h3>
                            {subtask.due_date && (
                              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                <Calendar size={14} />
                                <span>{formatDate(subtask.due_date)}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {editingSubtaskId !== subtask.id && (
                          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSubtaskId(subtask.id);
                                setEditSubtaskTitle(subtask.title);
                                setEditSubtaskDueDate(
                                  formatDateForInput(subtask.due_date)
                                );
                              }}
                              className="rounded-full p-1 text-slate-400 hover:text-slate-700"
                              aria-label="Edit sub-task"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteSubtask(subtask.id)}
                              className="rounded-full p-1 text-slate-400 hover:text-red-500"
                              aria-label="Delete sub-task"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  )})}
                </div>
              )}
            </div>
          </section>
          <aside className="relative z-0 rounded-3xl border border-slate-100 bg-white/80 p-5 pb-4 shadow-sm backdrop-blur-sm sm:p-6 sm:pb-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Overview
                </p>
              </div>
            </div>

            <div className="mb-4 inline-flex rounded-full bg-slate-100 p-1.5 text-sm font-medium text-slate-500">
              {[{
                id: 'active',
                label: 'All',
                count: allActiveTodos.length + allActiveSubtasks.length,
              }, {
                id: 'unscheduled',
                label: 'Unsheduled',
                count: unscheduledTodos.length + unscheduledSubtasks.length,
              }].map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setGlobalFilter(filter.id as 'active' | 'unscheduled')}
                  className={`flex items-center gap-2 rounded-full px-5 py-2 transition-colors ${
                    globalFilter === filter.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <span>{filter.label}</span>
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                      globalFilter === filter.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="max-h-[320px] space-y-1 overflow-auto pr-1 text-xs">
              {loading ? (
                <p className="py-6 text-center text-slate-400">Loading tasks...</p>
              ) : rightTodos.length === 0 ? (
                <p className="py-6 text-center text-slate-400">
                  {globalFilter === 'active'
                    ? 'No active tasks.'
                    : 'No tasks waiting to be scheduled.'}
                </p>
              ) : (
                rightTodos.map((todo) => {
                  const isEditing = editingId === todo.id && editingSide === 'right';
                  const overviewSubtasks = sortSubtasksByDate(
                    subtasks.filter((subtask) => {
                      if (subtask.todo_id !== todo.id) return false;
                      if (globalFilter === 'active') {
                        return !subtask.is_completed;
                      }
                      return !subtask.is_completed && !subtask.due_date;
                    })
                  );
                  const hasOverviewSubtasks = overviewSubtasks.length > 0;
                  const isOpen = openOverviewParents[todo.id] ?? hasOverviewSubtasks;
                  const isSimpleOverviewRow =
                    !todo.description && !todo.due_date && !hasOverviewSubtasks;

                  const overviewRowClasses = isSimpleOverviewRow
                    ? 'flex items-center justify-between gap-3'
                    : 'flex items-start justify-between gap-3';

                  const overviewLeftClasses = isSimpleOverviewRow
                    ? 'flex flex-1 items-center gap-3'
                    : 'flex flex-1 items-start gap-3';

                  return (
                    <article
                      key={todo.id}
                      className="group rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3 text-xs shadow-sm transition-colors hover:bg-white hover:shadow-md"
                    >
                      <div className={overviewRowClasses}>
                        <div className={overviewLeftClasses}>
                          <button
                            type="button"
                            onClick={() => toggleComplete(todo.id, todo.is_completed)}
                            className={`mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-white transition-all ${
                              todo.is_completed
                                ? 'border-indigo-600 bg-indigo-600 shadow-sm'
                                : 'border-slate-300 bg-white text-transparent hover:border-indigo-500'
                            }`}
                          >
                            <Check size={12} className="text-white" />
                          </button>
                          <div className="flex-1">
                            {isEditing ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={editTask}
                                  onChange={(e) => setEditTask(e.target.value)}
                                  className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                                <textarea
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                                  rows={2}
                                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                                <div className="flex flex-wrap items-center gap-3">
                                  <InlineDatePicker
                                    value={editDueDate}
                                    onChange={setEditDueDate}
                                    placeholder="dd/mm/yyyy"
                                    inputClassName="rounded-xl border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                  />
                                  <div className="ml-auto flex items-center gap-2 text-xs">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingId(null);
                                        setEditingSide(null);
                                        setEditTask('');
                                        setEditDescription('');
                                        setEditDueDate('');
                                      }}
                                      className="rounded-full px-3 py-1 font-medium text-slate-500 hover:text-slate-700"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => saveEdit(todo.id)}
                                      className="rounded-full bg-indigo-600 px-3 py-1 font-medium text-white shadow-sm hover:bg-indigo-700"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <>
                                <h3
                                  className={`text-[13px] font-medium ${
                                    todo.is_completed
                                      ? 'text-slate-400 line-through'
                                      : 'text-slate-900'
                                  }`}
                                >
                                  {todo.task}
                                </h3>
                                {todo.description && (
                                  <p className="mt-1 text-[11px] text-slate-500">
                                    {todo.description}
                                  </p>
                                )}
                                {todo.due_date && (
                                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                                    <Calendar size={12} />
                                    <span>{formatDate(todo.due_date)}</span>
                                  </div>
                                )}
                                {hasOverviewSubtasks && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenOverviewParents((prev) => ({
                                        ...prev,
                                        [todo.id]: !isOpen,
                                      }))
                                    }
                                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
                                  >
                                    <span>{isOpen ? 'Hide sub-tasks' : 'Show sub-tasks'}</span>
                                    <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                                      ˅
                                    </span>
                                  </button>
                                )}
                                {isOpen && hasOverviewSubtasks && (
                                  <div className="mt-2 space-y-1">
                                    {overviewSubtasks.map((subtask) => (
                                      <div
                                        key={subtask.id}
                                        className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-[11px]"
                                      >
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              toggleSubtaskComplete(
                                                subtask.id,
                                                subtask.is_completed
                                              )
                                            }
                                            className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border text-white transition-all ${
                                              subtask.is_completed
                                                ? 'border-indigo-600 bg-indigo-600'
                                                : 'border-slate-300 bg-white text-transparent hover:border-indigo-500'
                                            }`}
                                          >
                                            <Check size={10} className="text-white" />
                                          </button>
                                          <div>
                                            <p
                                              className={`text-[13px] font-medium ${
                                                subtask.is_completed
                                                  ? 'text-slate-400 line-through'
                                                  : 'text-slate-800'
                                              }`}
                                            >
                                              {subtask.title}
                                            </p>
                                            {subtask.due_date && (
                                              <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                                                <Calendar size={10} />
                                                <span>{formatDate(subtask.due_date)}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => deleteSubtask(subtask.id)}
                                          className="rounded-full p-1 text-slate-300 hover:text-red-500"
                                          aria-label="Delete sub-task"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        {!isEditing && (
                          <div className="ml-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(todo.id);
                                setEditingSide('right');
                                setEditTask(todo.task);
                                setEditDescription(todo.description || '');
                                setEditDueDate(formatDateForInput(todo.due_date));
                              }}
                              className="rounded-full p-1 text-slate-400 hover:text-slate-700"
                              aria-label="Edit task"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteTodo(todo.id)}
                              className="rounded-full p-1 text-slate-400 hover:text-red-500"
                              aria-label="Delete task"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </aside>
        </div>
        </div>
      </div>
    </div>
  );
}

export default App;
