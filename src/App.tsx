import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Trash2, Check, Calendar } from 'lucide-react';

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
}

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchTodos();
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
      setTodos(data || []);
    } catch (error) {
      console.error('Error fetching todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      const { data, error } = await supabase
        .from('todos')
        .insert([{
          task: input.trim(),
          due_date: dueDate ? new Date(dueDate).toISOString() : null
        }])
        .select();

      if (error) throw error;
      if (data) {
        setTodos([...data, ...todos]);
        setInput('');
        setDueDate('');
      }
    } catch (error) {
      console.error('Error adding todo:', error);
    }
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
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

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getDayNumber = (index: number, daysInMonth: number, firstDay: number) => {
    return index - firstDay + 1;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    const dayNum = getDayNumber(i, daysInMonth, firstDay);
    return dayNum > 0 && dayNum <= daysInMonth ? dayNum : null;
  });

  const todosWithDates = todos.filter(todo => todo.due_date);
  const todosForSelectedDate = todosWithDates.filter(todo =>
    isSameDay(todo.due_date, currentDate)
  );
  const todosWithoutDates = todos.filter(todo => !todo.due_date);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-orange-400 to-amber-400 px-8 py-6">
                <h1 className="text-2xl font-bold text-gray-800">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                  {isToday(currentDate) && ' (Today)'}
                </h1>
              </div>

              <div className="p-8">
                {loading ? (
                  <div className="text-center py-12 text-gray-500">Loading tasks...</div>
                ) : todos.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg">No tasks yet</p>
                  </div>
                ) : todosForSelectedDate.length === 0 && todosWithoutDates.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg">No tasks for this day</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todosForSelectedDate.map((todo) => (
                      <div
                        key={todo.id}
                        className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                          todo.is_completed
                            ? 'bg-gray-100 opacity-60'
                            : 'bg-orange-50 hover:bg-orange-100'
                        }`}
                      >
                        <button
                          onClick={() => toggleComplete(todo.id, todo.is_completed)}
                          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            todo.is_completed
                              ? 'bg-green-500 border-green-500'
                              : 'border-orange-300 hover:border-green-500'
                          }`}
                        >
                          {todo.is_completed && <Check size={16} className="text-white" />}
                        </button>
                        <span
                          className={`flex-1 ${
                            todo.is_completed
                              ? 'line-through text-gray-400'
                              : 'text-gray-800 font-medium'
                          }`}
                        >
                          {todo.task}
                        </span>
                        {todo.due_date && (
                          <div className="flex items-center gap-2 px-3 py-1 bg-orange-200 rounded-full text-xs text-gray-700">
                            <Calendar size={14} />
                            {formatDate(todo.due_date)}
                          </div>
                        )}
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    {todosWithoutDates.length > 0 && (
                      <>
                        <div className="text-sm font-semibold text-gray-500 mt-6 mb-3">Unscheduled</div>
                        {todosWithoutDates.map((todo) => (
                          <div
                            key={todo.id}
                            className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                              todo.is_completed
                                ? 'bg-gray-100 opacity-60'
                                : 'bg-gray-50 hover:bg-gray-100'
                            }`}
                          >
                            <button
                              onClick={() => toggleComplete(todo.id, todo.is_completed)}
                              className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                todo.is_completed
                                  ? 'bg-green-500 border-green-500'
                                  : 'border-gray-300 hover:border-green-500'
                              }`}
                            >
                              {todo.is_completed && <Check size={16} className="text-white" />}
                            </button>
                            <span
                              className={`flex-1 ${
                                todo.is_completed
                                  ? 'line-through text-gray-400'
                                  : 'text-gray-800'
                              }`}
                            >
                              {todo.task}
                            </span>
                            <button
                              onClick={() => deleteTodo(todo.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}

                <form onSubmit={addTodo} className="mt-8 pt-8 border-t border-gray-200">
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Add a new task..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    />
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-700"
                    />
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-500 hover:to-amber-500 text-white font-semibold py-3 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-md"
                    >
                      <Plus size={20} />
                      Add new task
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-lg overflow-hidden sticky top-8">
              <div className="bg-gradient-to-r from-orange-400 to-amber-400 px-6 py-4">
                <h2 className="text-lg font-bold text-gray-800">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-semibold text-gray-600">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (day) {
                          setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
                        }
                      }}
                      className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                        day === null
                          ? 'text-gray-200'
                          : day === currentDate.getDate()
                          ? 'bg-orange-400 text-white shadow-md'
                          : 'text-gray-700 hover:bg-orange-100'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>

                <div className="mt-6 flex gap-2">
                  <button
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                    className="flex-1 px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="flex-1 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors font-medium"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                    className="flex-1 px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
