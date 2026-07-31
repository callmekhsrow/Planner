import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, CheckSquare, Calendar as CalendarIcon, Film,
  StickyNote, Wallet, ShoppingCart, BarChart3, Plus, Trash2, Pencil,
  ChevronRight, ChevronLeft, TrendingUp, TrendingDown, X, Check,
  Sparkles
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

/* ============================= Jalali calendar utils ============================= */
const JALALI_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const WEEKDAYS = ['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنج‌شنبه','جمعه'];
const WEEKDAYS_SHORT = ['ش','ی','د','س','چ','پ','ج'];
const PERSIAN_DIGITS = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];

function toPersianDigits(input) {
  return String(input).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[d]);
}

function gregorianToJalali(gy, gm, gd) {
  const g_d_m = [0,31,59,90,120,151,181,212,243,273,304,334];
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = 355666 + (365 * gy) + (~~((gy2 + 3) / 4)) - (~~((gy2 + 99) / 100)) + (~~((gy2 + 399) / 400)) + gd + g_d_m[gm - 1];
  let jy = -1595 + (33 * (~~(days / 12053)));
  days %= 12053;
  jy += 4 * (~~(days / 1461));
  days %= 1461;
  if (days > 365) {
    jy += (~~((days - 1) / 365));
    days = (days - 1) % 365;
  }
  let jm, jd;
  if (days < 186) {
    jm = 1 + (~~(days / 31));
    jd = 1 + (days % 31);
  } else {
    jm = 7 + (~~((days - 186) / 30));
    jd = 1 + ((days - 186) % 30);
  }
  return [jy, jm, jd];
}

function isLeapJalali(jy) {
  const cycle = ((jy % 33) + 33) % 33;
  return [1,5,9,13,17,22,26,30].includes(cycle);
}

function jalaliMonthLength(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalali(jy) ? 30 : 29;
}

function jalaliNewYearGregorian(jy) {
  const gy = jy + 621;
  for (let d = 18; d <= 22; d++) {
    const dt = new Date(gy, 2, d);
    const [y, m, day] = gregorianToJalali(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
    if (y === jy && m === 1 && day === 1) return dt;
  }
  return new Date(gy, 2, 21);
}

function jalaliToGregorian(jy, jm, jd) {
  const newYear = jalaliNewYearGregorian(jy);
  const monthLengths = [31,31,31,31,31,31,30,30,30,30,30, isLeapJalali(jy) ? 30 : 29];
  let dayOfYear = jd - 1;
  for (let i = 0; i < jm - 1; i++) dayOfYear += monthLengths[i];
  const result = new Date(newYear.getFullYear(), newYear.getMonth(), newYear.getDate());
  result.setDate(result.getDate() + dayOfYear);
  return result;
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function todayISO() { return toISODate(new Date()); }

function formatJalali(iso, { withYear = true, withWeekday = false } = {}) {
  if (!iso) return '';
  const [gy, gm, gd] = iso.split('-').map(Number);
  const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);
  const parts = [];
  if (withWeekday) {
    const wd = (parseISO(iso).getDay() + 1) % 7;
    parts.push(WEEKDAYS[wd] + '،');
  }
  parts.push(`${toPersianDigits(jd)} ${JALALI_MONTHS[jm - 1]}`);
  if (withYear) parts.push(toPersianDigits(jy));
  return parts.join(' ');
}

/* ============================= constants ============================= */
const TASK_CATEGORIES = [
  { id: 'work', label: 'کار', color: '#FF6B6B' },
  { id: 'personal', label: 'شخصی', color: '#6C5CE7' },
  { id: 'study', label: 'درس', color: '#0984E3' },
  { id: 'home', label: 'خانه', color: '#E1A100' },
  { id: 'health', label: 'سلامتی', color: '#00B894' },
  { id: 'other', label: 'سایر', color: '#8395A7' },
];
const PRIORITIES = [
  { id: 'high', label: 'بالا', color: '#E74C3C' },
  { id: 'medium', label: 'متوسط', color: '#F39C12' },
  { id: 'low', label: 'پایین', color: '#27AE60' },
];
const NOTE_COLORS = ['#FFE3E3','#E7E0FF','#DFF7EE','#DFEEFF','#FFF3CF','#FFE0EE'];
const INCOME_CATS = ['حقوق','فروش','هدیه','سرمایه‌گذاری','سایر'];
const EXPENSE_CATS = ['خوراک','حمل‌ونقل','خرید','قبض','سرگرمی','سلامت','مسکن','سایر'];
const SHOP_CATS = ['خوراکی','خانه','بهداشتی','سایر'];

const TABS = [
  { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard, color: '#6C5CE7' },
  { id: 'tasks', label: 'کارها', icon: CheckSquare, color: '#FF6B6B' },
  { id: 'calendar', label: 'تقویم', icon: CalendarIcon, color: '#0984E3' },
  { id: 'watchlist', label: 'واچ‌لیست', icon: Film, color: '#A855F7' },
  { id: 'notes', label: 'یادداشت‌ها', icon: StickyNote, color: '#E1A100' },
  { id: 'finance', label: 'مالی', icon: Wallet, color: '#00CEC9' },
  { id: 'shopping', label: 'خرید', icon: ShoppingCart, color: '#FD79A8' },
  { id: 'stats', label: 'آمار', icon: BarChart3, color: '#F39C12' },
];

const uid = () => Math.random().toString(36).slice(2, 10);
const STORAGE_KEY = 'planner-data-v1';
const OMDB_KEY_STORAGE = 'planner-omdb-key-v1';
const defaultData = { tasks: [], watchlist: [], notes: [], finance: [], shopping: [] };

function greetingWord() {
  const h = new Date().getHours();
  if (h < 5) return 'شب بخیر';
  if (h < 12) return 'صبح بخیر';
  if (h < 17) return 'ظهر بخیر';
  if (h < 20) return 'عصر بخیر';
  return 'شب بخیر';
}

const QUOTES = [
  'هر روز یک قدم کوچک، یک سال یک تغییر بزرگ می‌سازد.',
  'کاری که امروز می‌توانی انجام دهی را به فردا نسپار.',
  'نظم، پل میان هدف و دستاورد است.',
  'شروع کن؛ بقیه‌اش را در مسیر یاد می‌گیری.',
  'برنامه‌ریزی، نصف انجام دادن کار است.',
];

/* ============================= tiny UI helpers ============================= */
function Chip({ color, children, style }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold"
      style={{ backgroundColor: color + '20', color, ...style }}
    >
      {children}
    </span>
  );
}

function IconButton({ onClick, children, title, danger }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center rounded-lg p-1.5 transition-colors hover:bg-black/5 active:scale-95"
      style={{ color: danger ? '#E74C3C' : '#8395A7' }}
    >
      {children}
    </button>
  );
}

function SectionCard({ children, style }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm" style={style}>
      {children}
    </div>
  );
}

function EmptyState({ icon: Icon, color, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-10 text-center" style={{ borderColor: color + '40' }}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: color + '15' }}>
        <Icon size={22} style={{ color }} />
      </div>
      <p className="font-bold text-slate-700">{title}</p>
      <p className="max-w-[220px] text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}

function AddButton({ open, setOpen, color, label }) {
  return (
    <button
      onClick={() => setOpen(!open)}
      className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-white shadow-sm transition-transform active:scale-95"
      style={{ backgroundColor: color }}
    >
      {open ? <X size={16} /> : <Plus size={16} />}
      {open ? 'انصراف' : label}
    </button>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400 ${props.className || ''}`}
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400"
    >
      {props.children}
    </select>
  );
}

/* ============================= Dashboard ============================= */
function DashboardTab({ data, toggleTaskDone, setActiveTab }) {
  const today = todayISO();
  const todayTasks = data.tasks.filter(t => t.dueDate === today);
  const doneToday = todayTasks.filter(t => t.done).length;
  const overdue = data.tasks.filter(t => t.dueDate && t.dueDate < today && !t.done);
  const balance = data.finance.reduce((s, f) => s + (f.type === 'income' ? f.amount : -f.amount), 0);
  const toWatchCount = data.watchlist.filter(w => w.status === 'planned').length;
  const quote = useMemo(() => QUOTES[new Date().getDate() % QUOTES.length], []);

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-2xl p-5 text-white shadow-sm"
        style={{ background: 'linear-gradient(135deg, #FF6B6B 0%, #A855F7 50%, #0984E3 100%)' }}
      >
        <p className="text-sm opacity-90">{greetingWord()} 👋</p>
        <p className="mt-1 text-xl font-black">{formatJalali(today, { withWeekday: true })}</p>
        <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-xs">
          <Sparkles size={14} />
          <span>{quote}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <SectionCard>
          <p className="text-[11px] text-slate-400">کارهای امروز</p>
          <p className="mt-1 text-xl font-black" style={{ color: '#FF6B6B' }}>
            {toPersianDigits(doneToday)}<span className="text-sm text-slate-300">/{toPersianDigits(todayTasks.length)}</span>
          </p>
        </SectionCard>
        <SectionCard>
          <p className="text-[11px] text-slate-400">موجودی مالی</p>
          <p className="mt-1 text-sm font-black" style={{ color: balance >= 0 ? '#00CEC9' : '#E74C3C' }}>
            {toPersianDigits(balance.toLocaleString())} ت
          </p>
        </SectionCard>
        <SectionCard>
          <p className="text-[11px] text-slate-400">واچ‌لیست</p>
          <p className="mt-1 flex items-center gap-1 text-xl font-black" style={{ color: '#A855F7' }}><Film size={16} /> {toPersianDigits(toWatchCount)}</p>
        </SectionCard>
      </div>

      {overdue.length > 0 && (
        <SectionCard style={{ borderInlineStart: '4px solid #E74C3C' }}>
          <p className="mb-2 text-sm font-bold text-red-500">{toPersianDigits(overdue.length)} کار عقب‌افتاده</p>
          <div className="flex flex-col gap-1.5">
            {overdue.slice(0, 3).map(t => (
              <p key={t.id} className="text-xs text-slate-600">• {t.title}</p>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-bold text-slate-700">کارهای امروز</p>
          <button onClick={() => setActiveTab('tasks')} className="text-xs font-bold" style={{ color: '#FF6B6B' }}>مشاهده همه</button>
        </div>
        {todayTasks.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">برای امروز کاری ثبت نشده</p>
        ) : (
          <div className="flex flex-col gap-2">
            {todayTasks.map(t => (
              <div key={t.id} className="flex items-center gap-2">
                <button
                  onClick={() => toggleTaskDone(t.id)}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                  style={{ borderColor: t.done ? '#00B894' : '#CBD5E1', backgroundColor: t.done ? '#00B894' : 'transparent' }}
                >
                  {t.done && <Check size={12} color="#fff" />}
                </button>
                <span className={`text-sm ${t.done ? 'text-slate-300 line-through' : 'text-slate-700'}`}>{t.title}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ============================= Tasks ============================= */
function RoutineSection({ routines, addItem, updateItem, deleteItem }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const today = todayISO();

  const submit = () => {
    if (!title.trim()) return;
    addItem('tasks', { title, type: 'routine', doneDate: null });
    setTitle('');
    setOpen(false);
  };

  const toggle = (r) => updateItem('tasks', r.id, { doneDate: r.doneDate === today ? null : today });
  const doneCount = routines.filter(r => r.doneDate === today).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-black text-slate-700">روتین روزانه</p>
          <p className="text-[11px] text-slate-400">{toPersianDigits(doneCount)}/{toPersianDigits(routines.length)} امروز انجام شد</p>
        </div>
        <AddButton open={open} setOpen={setOpen} color="#FF9F43" label="روتین جدید" />
      </div>

      {open && (
        <SectionCard style={{ borderInlineStart: '4px solid #FF9F43' }}>
          <div className="flex gap-1.5">
            <TextInput placeholder="مثلاً: نوشیدن آب، نماز، ورزش..." value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
            <button onClick={submit} className="shrink-0 rounded-xl px-3 text-white" style={{ backgroundColor: '#FF9F43' }}><Plus size={16} /></button>
          </div>
        </SectionCard>
      )}

      {routines.length === 0 ? (
        <EmptyState icon={Sparkles} color="#FF9F43" title="روتینی ثبت نشده" subtitle="کارهای تکرارشونده روزانه‌ات رو اینجا اضافه کن." />
      ) : (
        <div className="flex flex-col gap-2">
          {routines.map(r => {
            const done = r.doneDate === today;
            return (
              <SectionCard key={r.id} style={{ borderInlineStart: '4px solid #FF9F43' }}>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => toggle(r)}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                    style={{ borderColor: done ? '#FF9F43' : '#CBD5E1', backgroundColor: done ? '#FF9F43' : 'transparent' }}
                  >
                    {done && <Check size={12} color="#fff" />}
                  </button>
                  <span className={`flex-1 text-sm font-bold ${done ? 'text-slate-300 line-through' : 'text-slate-700'}`}>{r.title}</span>
                  <IconButton title="حذف" danger onClick={() => deleteItem('tasks', r.id)}><Trash2 size={15} /></IconButton>
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TodoSection({ todos, addItem, updateItem, deleteItem }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('active');
  const [form, setForm] = useState({ title: '', category: 'work', priority: 'medium', dueDate: '' });

  const submit = () => {
    if (!form.title.trim()) return;
    addItem('tasks', { ...form, type: 'todo', done: false });
    setForm({ title: '', category: 'work', priority: 'medium', dueDate: '' });
    setOpen(false);
  };

  const filtered = todos
    .filter(t => filter === 'all' ? true : filter === 'done' ? t.done : !t.done)
    .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-slate-700">لیست کارها</p>
        <AddButton open={open} setOpen={setOpen} color="#FF6B6B" label="کار جدید" />
      </div>

      <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1">
        {[['active','فعال'],['done','انجام‌شده'],['all','همه']].map(([id,label]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className="flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors"
            style={{ backgroundColor: filter === id ? '#FF6B6B' : 'transparent', color: filter === id ? '#fff' : '#64748B' }}
          >
            {label}
          </button>
        ))}
      </div>

      {open && (
        <SectionCard style={{ borderInlineStart: '4px solid #FF6B6B' }}>
          <div className="flex flex-col gap-2">
            <TextInput placeholder="عنوان کار..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {TASK_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </Select>
              <Select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map(p => <option key={p.id} value={p.id}>اولویت {p.label}</option>)}
              </Select>
            </div>
            <JalaliDateInput value={form.dueDate || todayISO()} onChange={iso => setForm({ ...form, dueDate: iso })} />
            <p className="text-xs text-slate-400">تاریخ سررسید: {formatJalali(form.dueDate || todayISO())}</p>
            <button onClick={submit} className="mt-1 rounded-xl py-2 text-sm font-bold text-white" style={{ backgroundColor: '#FF6B6B' }}>افزودن کار</button>
          </div>
        </SectionCard>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={CheckSquare} color="#FF6B6B" title="کاری اینجا نیست" subtitle="برای شروع، یک کار جدید اضافه کن." />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(t => {
            const cat = TASK_CATEGORIES.find(c => c.id === t.category) || TASK_CATEGORIES[5];
            const pr = PRIORITIES.find(p => p.id === t.priority) || PRIORITIES[1];
            const overdue = t.dueDate && t.dueDate < todayISO() && !t.done;
            return (
              <SectionCard key={t.id} style={{ borderInlineStart: `4px solid ${cat.color}` }}>
                <div className="flex items-start gap-2.5">
                  <button
                    onClick={() => updateItem('tasks', t.id, { done: !t.done })}
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                    style={{ borderColor: t.done ? '#00B894' : '#CBD5E1', backgroundColor: t.done ? '#00B894' : 'transparent' }}
                  >
                    {t.done && <Check size={12} color="#fff" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold ${t.done ? 'text-slate-300 line-through' : 'text-slate-700'}`}>{t.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Chip color={cat.color}>{cat.label}</Chip>
                      <Chip color={pr.color}>{pr.label}</Chip>
                      {t.dueDate && <Chip color={overdue ? '#E74C3C' : '#8395A7'}>{formatJalali(t.dueDate, { withYear: false })}</Chip>}
                    </div>
                  </div>
                  <IconButton title="حذف" danger onClick={() => deleteItem('tasks', t.id)}><Trash2 size={16} /></IconButton>
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TasksTab({ tasks, addItem, updateItem, deleteItem }) {
  const routines = tasks.filter(t => t.type === 'routine');
  const todos = tasks.filter(t => t.type !== 'routine');

  return (
    <div className="flex flex-col gap-6">
      <RoutineSection routines={routines} addItem={addItem} updateItem={updateItem} deleteItem={deleteItem} />
      <div className="h-px w-full bg-slate-100" />
      <TodoSection todos={todos} addItem={addItem} updateItem={updateItem} deleteItem={deleteItem} />
    </div>
  );
}

/* ============================= Calendar ============================= */
function CalendarTab({ tasks }) {
  const today = new Date();
  const [gy, gm, gd] = gregorianToJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const [cursor, setCursor] = useState({ jy: gy, jm: gm });
  const [selected, setSelected] = useState(toISODate(today));

  const monthLen = jalaliMonthLength(cursor.jy, cursor.jm);
  const firstDay = jalaliToGregorian(cursor.jy, cursor.jm, 1);
  const leadEmpty = (firstDay.getDay() + 1) % 7;

  const cells = [];
  for (let i = 0; i < leadEmpty; i++) cells.push(null);
  for (let d = 1; d <= monthLen; d++) {
    const g = jalaliToGregorian(cursor.jy, cursor.jm, d);
    cells.push({ jd: d, iso: toISODate(g) });
  }

  const tasksByDay = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!t.dueDate) return;
      (map[t.dueDate] = map[t.dueDate] || []).push(t);
    });
    return map;
  }, [tasks]);

  const move = (delta) => {
    let { jy, jm } = cursor;
    jm += delta;
    if (jm > 12) { jm = 1; jy += 1; }
    if (jm < 1) { jm = 12; jy -= 1; }
    setCursor({ jy, jm });
  };

  const selectedTasks = tasksByDay[selected] || [];

  return (
    <div className="flex flex-col gap-3">
      <SectionCard>
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => move(-1)} className="rounded-lg p-1.5 hover:bg-slate-100"><ChevronRight size={18} /></button>
          <p className="text-sm font-black text-slate-700">{JALALI_MONTHS[cursor.jm - 1]} {toPersianDigits(cursor.jy)}</p>
          <button onClick={() => move(1)} className="rounded-lg p-1.5 hover:bg-slate-100"><ChevronLeft size={18} /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS_SHORT.map(w => <p key={w} className="py-1 text-[10px] font-bold text-slate-400">{w}</p>)}
          {cells.map((c, i) => {
            if (!c) return <div key={i} />;
            const isToday = c.iso === toISODate(today);
            const isSelected = c.iso === selected;
            const hasTasks = (tasksByDay[c.iso] || []).length > 0;
            return (
              <button
                key={c.iso}
                onClick={() => setSelected(c.iso)}
                className="relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs font-bold"
                style={{
                  backgroundColor: isSelected ? '#0984E3' : isToday ? '#0984E320' : 'transparent',
                  color: isSelected ? '#fff' : isToday ? '#0984E3' : '#334155',
                }}
              >
                {toPersianDigits(c.jd)}
                {hasTasks && <span className="absolute bottom-1 h-1 w-1 rounded-full" style={{ backgroundColor: isSelected ? '#fff' : '#0984E3' }} />}
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard style={{ borderInlineStart: '4px solid #0984E3' }}>
        <p className="mb-2 text-sm font-bold text-slate-700">{formatJalali(selected, { withWeekday: true })}</p>
        {selectedTasks.length === 0 ? (
          <p className="py-3 text-center text-xs text-slate-400">کاری برای این روز ثبت نشده</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {selectedTasks.map(t => {
              const cat = TASK_CATEGORIES.find(c => c.id === t.category) || TASK_CATEGORIES[5];
              return (
                <div key={t.id} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className={t.done ? 'text-slate-300 line-through' : 'text-slate-600'}>{t.title}</span>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('bad status ' + res.status);
  return await res.json();
}

/* ============================= Watchlist ============================= */
function ApiKeyForm({ onSave }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex gap-1.5">
      <TextInput placeholder="کلید API را اینجا بچسبان..." value={val} onChange={e => setVal(e.target.value)} />
      <button
        onClick={() => val.trim() && onSave(val.trim())}
        className="shrink-0 rounded-xl px-3 text-white"
        style={{ backgroundColor: '#A855F7' }}
      >
        ذخیره
      </button>
    </div>
  );
}

function WatchlistTab({ watchlist, addItem, updateItem, deleteItem, apiKey, setApiKey }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [netError, setNetError] = useState('');
  const [sub, setSub] = useState('planned');

  useEffect(() => {
    if (!apiKey || query.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    setNetError('');
    const t = setTimeout(async () => {
      try {
        const json = await fetchJson(`https://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(query)}`);
        if (json.Response === 'False') {
          if ((json.Error || '').toLowerCase().includes('invalid api key')) {
            setKeyError('کلید فعال نیست. ایمیلت رو چک کن — OMDb یه لینک تایید می‌فرسته که تا روش کلیک نکنی کلید کار نمی‌کنه.');
          } else {
            setKeyError('');
          }
          setResults([]);
        } else {
          setKeyError('');
          setResults(json.Search || []);
        }
      } catch (e) {
        setNetError(`اتصال به سرویس برقرار نشد (${e.message || 'خطای نامشخص'}). یه بار دیگه امتحان کن.`);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [query, apiKey]);

  const addMovie = async (m) => {
    if (watchlist.some(w => w.sourceId === m.imdbID)) { setQuery(''); setResults([]); return; }
    let detail = {};
    try {
      detail = await fetchJson(`https://www.omdbapi.com/?apikey=${apiKey}&i=${m.imdbID}&plot=full`);
    } catch (e) { /* fall back to search-result fields only */ }
    addItem('watchlist', {
      sourceId: m.imdbID,
      title: detail.Title || m.Title,
      year: (detail.Year || m.Year || '').slice(0, 4),
      mediaType: m.Type === 'series' ? 'series' : 'movie',
      poster: detail.Poster && detail.Poster !== 'N/A' ? detail.Poster : (m.Poster !== 'N/A' ? m.Poster : null),
      overview: detail.Plot && detail.Plot !== 'N/A' ? detail.Plot : '',
      genre: detail.Genre && detail.Genre !== 'N/A' ? detail.Genre.split(',')[0].trim() : '',
      rating: detail.imdbRating && detail.imdbRating !== 'N/A' ? parseFloat(detail.imdbRating) : 0,
      status: 'planned',
    });
    setQuery('');
    setResults([]);
  };

  if (!apiKey) {
    return (
      <SectionCard style={{ borderInlineStart: '4px solid #A855F7' }}>
        <p className="mb-1 text-sm font-bold text-slate-700">اتصال به اطلاعات IMDb</p>
        <p className="mb-3 text-xs leading-6 text-slate-400">
          این بخش از OMDb استفاده می‌کنه که دقیقاً همون اطلاعات IMDb (پوستر، امتیاز، خلاصه داستان) رو می‌ده. فقط کافیه ایمیلت رو توی سایت زیر بدی، یه کلید رایگان فوری براش میاد و همینجا واردش کن — نه رمز عبوری لازمه نه ساخت پروفایل.
        </p>
        <ApiKeyForm onSave={setApiKey} />
        <a href="https://www.omdbapi.com/apikey.aspx" target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold" style={{ color: '#A855F7' }}>
          دریافت کلید رایگان با ایمیل ↗
        </a>
      </SectionCard>
    );
  }

  const planned = watchlist.filter(w => w.status === 'planned');
  const watched = watchlist.filter(w => w.status === 'watched');
  const list = sub === 'planned' ? planned : watched;

  return (
    <div className="flex flex-col gap-3">
      <SectionCard style={{ borderInlineStart: '4px solid #A855F7' }}>
        <TextInput placeholder="اسم فیلم رو بنویس..." value={query} onChange={e => setQuery(e.target.value)} />
        {searching && <p className="mt-2 text-xs text-slate-400">در حال جست‌وجو...</p>}
        {netError && <p className="mt-2 text-xs text-red-500">{netError}</p>}
        {keyError && (
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-red-500">{keyError}</p>
            <button onClick={() => setApiKey('')} className="text-xs font-bold" style={{ color: '#A855F7' }}>تغییر کلید</button>
          </div>
        )}
        {!searching && !keyError && !netError && query.trim().length >= 2 && results.length === 0 && (
          <p className="mt-2 text-xs text-slate-400">فیلمی پیدا نشد. اسم انگلیسی فیلم رو هم امتحان کن.</p>
        )}
        {results.length > 0 && (
          <div className="mt-2 flex max-h-72 flex-col gap-1.5 overflow-y-auto">
            {results.map(m => (
              <button key={m.imdbID} onClick={() => addMovie(m)} className="flex items-center gap-2 rounded-xl p-1.5 text-right hover:bg-slate-50">
                {m.Poster && m.Poster !== 'N/A' ? (
                  <img src={m.Poster} className="h-14 w-10 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    <Film size={16} color="#CBD5E1" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-700">{m.Title}</p>
                  <p className="text-[10px] text-slate-400">{m.Year || 'نامشخص'} · {m.Type === 'series' ? 'سریال' : 'فیلم'}</p>
                </div>
                <Plus size={15} color="#A855F7" />
              </button>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setSub('planned')}
          className="flex-1 rounded-lg py-1.5 text-xs font-bold"
          style={{ backgroundColor: sub === 'planned' ? '#A855F7' : 'transparent', color: sub === 'planned' ? '#fff' : '#64748B' }}
        >
          برای دیدن ({toPersianDigits(planned.length)})
        </button>
        <button
          onClick={() => setSub('watched')}
          className="flex-1 rounded-lg py-1.5 text-xs font-bold"
          style={{ backgroundColor: sub === 'watched' ? '#A855F7' : 'transparent', color: sub === 'watched' ? '#fff' : '#64748B' }}
        >
          دیده‌شده ({toPersianDigits(watched.length)})
        </button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={Film}
          color="#A855F7"
          title={sub === 'planned' ? 'واچ‌لیستت خالیه' : 'هنوز فیلمی رو ندیده‌ای'}
          subtitle="اسم فیلم مورد نظرت رو بالا جست‌وجو کن و اضافه‌اش کن."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {list.map(m => (
            <div key={m.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="relative">
                {m.poster ? (
                  <img src={m.poster} className="h-44 w-full object-cover" />
                ) : (
                  <div className="flex h-44 w-full items-center justify-center bg-slate-100">
                    <Film size={24} color="#CBD5E1" />
                  </div>
                )}
                <button onClick={() => deleteItem('watchlist', m.id)} className="absolute left-1.5 top-1.5 rounded-full bg-black/50 p-1.5">
                  <Trash2 size={13} color="#fff" />
                </button>
              </div>
              <div className="p-2.5">
                <p className="line-clamp-1 text-xs font-bold text-slate-700">{m.title}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">{m.year ? toPersianDigits(m.year) : '—'}{m.mediaType === 'series' ? ' · سریال' : ''}</span>
                  {m.rating > 0 && <Chip color="#F39C12">★ {toPersianDigits(m.rating.toFixed(1))}</Chip>}
                </div>
                {m.genre && <p className="mt-1 text-[10px] font-bold text-purple-400">{m.genre}</p>}
                {m.overview && <p className="mt-1 line-clamp-3 text-[10px] leading-5 text-slate-400">{m.overview}</p>}
                <button
                  onClick={() => updateItem('watchlist', m.id, { status: m.status === 'planned' ? 'watched' : 'planned' })}
                  className="mt-2 w-full rounded-lg py-1.5 text-[11px] font-bold text-white"
                  style={{ backgroundColor: m.status === 'planned' ? '#00B894' : '#8395A7' }}
                >
                  {m.status === 'planned' ? 'دیدمش' : 'برگردون به لیست'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================= Notes ============================= */
function NotesTab({ notes, addItem, updateItem, deleteItem }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', color: NOTE_COLORS[0] });
  const [editingId, setEditingId] = useState(null);

  const submit = () => {
    if (!form.title.trim() && !form.content.trim()) return;
    addItem('notes', form);
    setForm({ title: '', content: '', color: NOTE_COLORS[0] });
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <AddButton open={open} setOpen={setOpen} color="#E1A100" label="یادداشت جدید" />
      </div>

      {open && (
        <SectionCard style={{ borderInlineStart: '4px solid #E1A100' }}>
          <div className="flex flex-col gap-2">
            <TextInput placeholder="عنوان..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <textarea
              placeholder="متن یادداشت..."
              value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
            <div className="flex gap-2">
              {NOTE_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className="h-7 w-7 rounded-full border border-black/5"
                  style={{ backgroundColor: c, outline: form.color === c ? '2px solid #E1A100' : 'none', outlineOffset: 2 }}
                />
              ))}
            </div>
            <button onClick={submit} className="mt-1 rounded-xl py-2 text-sm font-bold text-white" style={{ backgroundColor: '#E1A100' }}>افزودن یادداشت</button>
          </div>
        </SectionCard>
      )}

      {notes.length === 0 ? (
        <EmptyState icon={StickyNote} color="#E1A100" title="یادداشتی نداری" subtitle="ایده‌ها و فکرهای سریعت رو اینجا بنویس." />
      ) : (
        <div className="columns-2 gap-3 [column-fill:_balance]">
          {notes.map(n => (
            <div key={n.id} className="mb-3 break-inside-avoid rounded-2xl p-3 shadow-sm" style={{ backgroundColor: n.color }}>
              {editingId === n.id ? (
                <div className="flex flex-col gap-1.5">
                  <TextInput value={n.title} onChange={e => updateItem('notes', n.id, { title: e.target.value })} className="!bg-white/70" />
                  <textarea
                    value={n.content}
                    onChange={e => updateItem('notes', n.id, { content: e.target.value })}
                    rows={3}
                    className="w-full rounded-xl bg-white/70 px-3 py-2 text-xs outline-none"
                  />
                  <button onClick={() => setEditingId(null)} className="self-end rounded-lg bg-black/10 px-2 py-1 text-[11px] font-bold">تمام</button>
                </div>
              ) : (
                <>
                  <div className="mb-1 flex items-start justify-between gap-1">
                    <p className="text-sm font-bold text-slate-700">{n.title}</p>
                    <div className="flex shrink-0 gap-0.5">
                      <IconButton title="ویرایش" onClick={() => setEditingId(n.id)}><Pencil size={13} /></IconButton>
                      <IconButton title="حذف" danger onClick={() => deleteItem('notes', n.id)}><Trash2 size={13} /></IconButton>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-xs text-slate-600">{n.content}</p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function JalaliDateInput({ value, onChange }) {
  const iso = value || todayISO();
  const [gy, gm, gd] = iso.split('-').map(Number);
  const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);
  const dayCount = jalaliMonthLength(jy, jm);
  const nowJy = gregorianToJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate())[0];
  const years = [];
  for (let y = nowJy - 3; y <= nowJy + 5; y++) years.push(y);

  const setDate = (newJy, newJm, newJd) => {
    const len = jalaliMonthLength(newJy, newJm);
    const clampedD = Math.min(newJd, len);
    onChange(toISODate(jalaliToGregorian(newJy, newJm, clampedD)));
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      <Select value={jd} onChange={e => setDate(jy, jm, Number(e.target.value))}>
        {Array.from({ length: dayCount }, (_, i) => i + 1).map(d => (
          <option key={d} value={d}>{toPersianDigits(d)}</option>
        ))}
      </Select>
      <Select value={jm} onChange={e => setDate(jy, Number(e.target.value), jd)}>
        {JALALI_MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>{m}</option>
        ))}
      </Select>
      <Select value={jy} onChange={e => setDate(Number(e.target.value), jm, jd)}>
        {years.map(y => (
          <option key={y} value={y}>{toPersianDigits(y)}</option>
        ))}
      </Select>
    </div>
  );
}

/* ============================= Finance ============================= */
function FinanceTab({ finance, addItem, deleteItem }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: 'expense', amount: '', category: EXPENSE_CATS[0], desc: '', date: todayISO() });

  const submit = () => {
    if (!form.amount || Number(form.amount) <= 0) return;
    addItem('finance', { ...form, amount: Number(form.amount) });
    setForm({ type: 'expense', amount: '', category: EXPENSE_CATS[0], desc: '', date: todayISO() });
    setOpen(false);
  };

  const income = finance.filter(f => f.type === 'income').reduce((s, f) => s + f.amount, 0);
  const expense = finance.filter(f => f.type === 'expense').reduce((s, f) => s + f.amount, 0);
  const balance = income - expense;
  const sorted = [...finance].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <SectionCard>
          <p className="flex items-center gap-1 text-[11px] text-slate-400"><TrendingUp size={12} color="#00B894" /> درآمد</p>
          <p className="mt-1 text-sm font-black text-emerald-500">{toPersianDigits(income.toLocaleString())}</p>
        </SectionCard>
        <SectionCard>
          <p className="flex items-center gap-1 text-[11px] text-slate-400"><TrendingDown size={12} color="#E74C3C" /> هزینه</p>
          <p className="mt-1 text-sm font-black text-red-500">{toPersianDigits(expense.toLocaleString())}</p>
        </SectionCard>
        <SectionCard>
          <p className="text-[11px] text-slate-400">مانده</p>
          <p className="mt-1 text-sm font-black" style={{ color: balance >= 0 ? '#00CEC9' : '#E74C3C' }}>{toPersianDigits(balance.toLocaleString())}</p>
        </SectionCard>
      </div>

      <div className="flex justify-end">
        <AddButton open={open} setOpen={setOpen} color="#00CEC9" label="تراکنش جدید" />
      </div>

      {open && (
        <SectionCard style={{ borderInlineStart: '4px solid #00CEC9' }}>
          <div className="flex flex-col gap-2">
            <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1">
              {[['income','درآمد'],['expense','هزینه']].map(([id,label]) => (
                <button
                  key={id}
                  onClick={() => setForm({ ...form, type: id, category: id === 'income' ? INCOME_CATS[0] : EXPENSE_CATS[0] })}
                  className="flex-1 rounded-lg py-1.5 text-xs font-bold"
                  style={{ backgroundColor: form.type === id ? (id === 'income' ? '#00B894' : '#E74C3C') : 'transparent', color: form.type === id ? '#fff' : '#64748B' }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {(form.type === 'income' ? INCOME_CATS : EXPENSE_CATS).map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
              <TextInput type="number" placeholder="مبلغ (تومان)" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <JalaliDateInput value={form.date} onChange={iso => setForm({ ...form, date: iso })} />
            <TextInput placeholder="توضیح (اختیاری)" value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} />
            <button onClick={submit} className="mt-1 rounded-xl py-2 text-sm font-bold text-white" style={{ backgroundColor: '#00CEC9' }}>ثبت تراکنش</button>
          </div>
        </SectionCard>
      )}

      {sorted.length === 0 ? (
        <EmptyState icon={Wallet} color="#00CEC9" title="تراکنشی ثبت نشده" subtitle="درآمد و هزینه‌هات رو اینجا پیگیری کن." />
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map(f => (
            <SectionCard key={f.id} style={{ borderInlineStart: `4px solid ${f.type === 'income' ? '#00B894' : '#E74C3C'}` }}>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-700">{f.category}{f.desc ? ` · ${f.desc}` : ''}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{formatJalali(f.date, { withYear: false })}</p>
                </div>
                <p className="shrink-0 text-sm font-black" style={{ color: f.type === 'income' ? '#00B894' : '#E74C3C' }}>
                  {f.type === 'income' ? '+' : '-'}{toPersianDigits(f.amount.toLocaleString())}
                </p>
                <IconButton title="حذف" danger onClick={() => deleteItem('finance', f.id)}><Trash2 size={15} /></IconButton>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================= Shopping ============================= */
function ShoppingTab({ shopping, addItem, updateItem, deleteItem, setData }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ text: '', category: SHOP_CATS[0] });

  const submit = () => {
    if (!form.text.trim()) return;
    addItem('shopping', { ...form, done: false });
    setForm({ text: '', category: SHOP_CATS[0] });
    setOpen(false);
  };

  const clearDone = () => setData(prev => ({ ...prev, shopping: prev.shopping.filter(s => !s.done) }));
  const grouped = SHOP_CATS.map(cat => ({ cat, items: shopping.filter(s => s.category === cat) })).filter(g => g.items.length);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button onClick={clearDone} className="text-xs font-bold text-slate-400">پاک‌کردن موارد خریداری‌شده</button>
        <AddButton open={open} setOpen={setOpen} color="#FD79A8" label="مورد جدید" />
      </div>

      {open && (
        <SectionCard style={{ borderInlineStart: '4px solid #FD79A8' }}>
          <div className="flex flex-col gap-2">
            <TextInput placeholder="مثلاً: شیر" value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} onKeyDown={e => e.key === 'Enter' && submit()} />
            <Select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {SHOP_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <button onClick={submit} className="mt-1 rounded-xl py-2 text-sm font-bold text-white" style={{ backgroundColor: '#FD79A8' }}>افزودن به لیست</button>
          </div>
        </SectionCard>
      )}

      {shopping.length === 0 ? (
        <EmptyState icon={ShoppingCart} color="#FD79A8" title="لیست خرید خالیه" subtitle="چیزهایی که باید بخری رو اینجا اضافه کن." />
      ) : (
        <div className="flex flex-col gap-3">
          {grouped.map(g => (
            <SectionCard key={g.cat}>
              <p className="mb-2 text-xs font-bold text-slate-400">{g.cat}</p>
              <div className="flex flex-col gap-1.5">
                {g.items.map(s => (
                  <div key={s.id} className="flex items-center gap-2">
                    <button
                      onClick={() => updateItem('shopping', s.id, { done: !s.done })}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                      style={{ borderColor: s.done ? '#FD79A8' : '#CBD5E1', backgroundColor: s.done ? '#FD79A8' : 'transparent' }}
                    >
                      {s.done && <Check size={12} color="#fff" />}
                    </button>
                    <span className={`flex-1 text-sm ${s.done ? 'text-slate-300 line-through' : 'text-slate-700'}`}>{s.text}</span>
                    <IconButton title="حذف" danger onClick={() => deleteItem('shopping', s.id)}><Trash2 size={14} /></IconButton>
                  </div>
                ))}
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================= Stats ============================= */
function StatsTab({ data }) {
  const last7 = useMemo(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = toISODate(d);
      const dayTasks = data.tasks.filter(t => t.dueDate === iso);
      arr.push({
        name: WEEKDAYS_SHORT[(d.getDay() + 1) % 7],
        کل: dayTasks.length,
        انجامشده: dayTasks.filter(t => t.done).length,
      });
    }
    return arr;
  }, [data.tasks]);

  const expenseByCat = useMemo(() => {
    const map = {};
    data.finance.filter(f => f.type === 'expense').forEach(f => { map[f.category] = (map[f.category] || 0) + f.amount; });
    return Object.entries(map).map(([name, مبلغ]) => ({ name, مبلغ })).sort((a, b) => b.مبلغ - a.مبلغ).slice(0, 6);
  }, [data.finance]);

  const todosOnly = data.tasks.filter(t => t.type !== 'routine');
  const totalTasks = todosOnly.length;
  const doneTasks = todosOnly.filter(t => t.done).length;
  const completionRate = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <SectionCard>
          <p className="text-xs text-slate-400">نرخ تکمیل کارها</p>
          <p className="mt-1 text-2xl font-black" style={{ color: '#F39C12' }}>{toPersianDigits(completionRate)}٪</p>
        </SectionCard>
        <SectionCard>
          <p className="text-xs text-slate-400">مجموع کارها</p>
          <p className="mt-1 text-2xl font-black text-slate-700">{toPersianDigits(totalTasks)}</p>
        </SectionCard>
      </div>

      <SectionCard>
        <p className="mb-3 text-sm font-bold text-slate-700">کارهای ۷ روز اخیر</p>
        <div style={{ width: '100%', height: 180 }}>
          <ResponsiveContainer>
            <BarChart data={last7}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={20} />
              <Tooltip />
              <Bar dataKey="کل" fill="#FFD3D3" radius={[6,6,0,0]} />
              <Bar dataKey="انجامشده" fill="#FF6B6B" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {expenseByCat.length > 0 && (
        <SectionCard>
          <p className="mb-3 text-sm font-bold text-slate-700">هزینه‌ها بر اساس دسته</p>
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer>
              <BarChart data={expenseByCat}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip />
                <Bar dataKey="مبلغ" fill="#00CEC9" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

/* ============================= App shell ============================= */
export default function PersianPlanner() {
  const [data, setData] = useState(defaultData);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiKey, setApiKeyState] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData({ ...defaultData, ...JSON.parse(raw) });
    } catch (e) { /* first run, no data yet */ }
    try {
      const key = localStorage.getItem(OMDB_KEY_STORAGE);
      if (key) setApiKeyState(key);
    } catch (e) { /* no key saved yet */ }
    setLoaded(true);
  }, []);

  const setApiKey = (key) => {
    setApiKeyState(key);
    try { localStorage.setItem(OMDB_KEY_STORAGE, key); } catch (e) {}
  };

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
    }, 400);
    return () => clearTimeout(t);
  }, [data, loaded]);

  const addItem = (key, item) => setData(prev => ({ ...prev, [key]: [...prev[key], { id: uid(), createdAt: new Date().toISOString(), ...item }] }));
  const updateItem = (key, id, patch) => setData(prev => ({ ...prev, [key]: prev[key].map(it => it.id === id ? { ...it, ...patch } : it) }));
  const deleteItem = (key, id) => setData(prev => ({ ...prev, [key]: prev[key].filter(it => it.id !== id) }));
  const toggleTaskDone = (id) => updateItem('tasks', id, {});
  const toggleTaskDoneFix = (id) => setData(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) }));

  const currentTab = TABS.find(t => t.id === activeTab);

  return (
    <div dir="rtl" style={{ fontFamily: "'Vazirmatn', Tahoma, sans-serif" }} className="min-h-screen bg-[#FAF9F6] pb-24">
      <div className="mx-auto max-w-md px-4 pt-5">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-black text-slate-800">پلنر من</h1>
          <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: currentTab.color + '18' }}>
            <currentTab.icon size={18} style={{ color: currentTab.color }} />
          </div>
        </div>

        {!loaded ? (
          <div className="flex items-center justify-center py-20 text-sm text-slate-300">در حال بارگذاری...</div>
        ) : (
          <>
            {activeTab === 'dashboard' && <DashboardTab data={data} toggleTaskDone={toggleTaskDoneFix} setActiveTab={setActiveTab} />}
            {activeTab === 'tasks' && <TasksTab tasks={data.tasks} addItem={addItem} updateItem={updateItem} deleteItem={deleteItem} />}
            {activeTab === 'calendar' && <CalendarTab tasks={data.tasks} />}
            {activeTab === 'watchlist' && <WatchlistTab watchlist={data.watchlist} addItem={addItem} updateItem={updateItem} deleteItem={deleteItem} apiKey={apiKey} setApiKey={setApiKey} />}
            {activeTab === 'notes' && <NotesTab notes={data.notes} addItem={addItem} updateItem={updateItem} deleteItem={deleteItem} />}
            {activeTab === 'finance' && <FinanceTab finance={data.finance} addItem={addItem} deleteItem={deleteItem} />}
            {activeTab === 'shopping' && <ShoppingTab shopping={data.shopping} addItem={addItem} updateItem={updateItem} deleteItem={deleteItem} setData={setData} />}
            {activeTab === 'stats' && <StatsTab data={data} />}
          </>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-md gap-1.5 overflow-x-auto px-3 py-2 [&::-webkit-scrollbar]:hidden">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className="flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-bold transition-all"
                style={{ backgroundColor: active ? t.color : 'transparent', color: active ? '#fff' : t.color }}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
