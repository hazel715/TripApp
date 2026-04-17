import { 
  DEFAULT_CNY_RATE, 
  DEFAULT_USD_RATE, 
  MEMBERS, 
  CATEGORIES, 
  EVENT_ICONS,
  defaultItinerary,
  defaultEssentials
} from './constants';
import React, { useState, useEffect } from 'react';
import { 
  auth, 
  db, 
  APP_ID, 
  signInAnonymously, 
  onAuthStateChanged, 
  doc, 
  setDoc, 
  onSnapshot 
} from './api/firebase';
import { 
  Plane, MapPin, Train, Bus, Hotel, Utensils, Info, Calendar, 
  AlertCircle, Camera, Coffee, Lightbulb, Map, Pin, X, Edit, 
  Users, Briefcase, Backpack, CheckSquare, Plus, Trash2, Edit3,
  ChevronDown, ChevronUp, Cloud, CloudOff, BookOpen, 
  Wallet, Receipt, Calculator, ChevronsDown, ChevronsUp, Clock, Zap, List, AlignLeft
} from 'lucide-react';

const ChengduTripApp = () => {
  const [activeTab, setActiveTab] = useState('itinerary');
  const [itineraryView, setItineraryView] = useState('grouped'); 
  const [expandedDays, setExpandedDays] = useState([1]);
  const [showChecklist, setShowChecklist] = useState(false);
  const [isEditingChecklist, setIsEditingChecklist] = useState(false);
  const [showTips, setShowTips] = useState(true);

  const [expandedEventIds, setExpandedEventIds] = useState([]); 
  const [editModal, setEditModal] = useState({ isOpen: false, dayIdx: -1, eventIdx: -1, type: 'camera', time: '', desc: '', note: '', isNew: false });
  const [essentialModal, setEssentialModal] = useState({ isOpen: false, catIdx: -1, text: '' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  
  const [expenseModal, setExpenseModal] = useState({
    isOpen: false, id: null, payer: 'MJ', category: '식음료', date: '', title: '', 
    amount: '', currency: 'CNY', exchangeRate: DEFAULT_CNY_RATE, customRate: false, note: '', included: [...MEMBERS]
  });
  const [quickMemoModal, setQuickMemoModal] = useState({ isOpen: false, text: '' });
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [expenseGroupBy, setExpenseGroupBy] = useState('date');

  const [user, setUser] = useState(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(true);
  const [dbError, setDbError] = useState('');
  const [essentials, setEssentials] = useState(defaultEssentials);
  const [itinerary, setItinerary] = useState(defaultItinerary);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    if (!auth) { setIsCloudSyncing(false); return; }
    const initAuth = async () => {
      try { await signInAnonymously(auth); } catch (error) { setIsCloudSyncing(false); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'trip_data', 'main');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.itinerary) setItinerary(data.itinerary);
        if (data.essentials) setEssentials(data.essentials);
        if (data.expenses) setExpenses(data.expenses);
        setDbError(''); 
      } else {
        setDoc(docRef, { itinerary: defaultItinerary, essentials: defaultEssentials, expenses: [] });
      }
      setIsCloudSyncing(false);
    }, (error) => {
      setDbError("연결 실패: 데이터베이스 권한을 확인하세요.");
      setIsCloudSyncing(false);
    });
    return () => unsubscribe();
  }, [user]);

  const syncToCloud = async (updateData) => {
    if (updateData.itinerary) setItinerary(updateData.itinerary);
    if (updateData.essentials) setEssentials(updateData.essentials);
    if (updateData.expenses) setExpenses(updateData.expenses);
    if (!user || !db) return;
    try {
      setIsCloudSyncing(true);
      const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'trip_data', 'main');
      await setDoc(docRef, updateData, { merge: true });
      setDbError('');
    } catch (error) { setDbError("저장 권한 없음"); } finally { setIsCloudSyncing(false); }
  };

  const getEventDateObj = (dateText, timeStr) => {
    const match = dateText.match(/(\d+)월\s*(\d+)일/);
    if (!match) return new Date(2099, 0, 1);
    const month = parseInt(match[1]) - 1;
    const day = parseInt(match[2]);
    const timeMatch = (timeStr || "00:00").match(/(\d+):(\d+)/);
    const hour = timeMatch ? parseInt(timeMatch[1]) : 0;
    const min = timeMatch ? parseInt(timeMatch[2]) : 0;
    // 실제 운영 시 2026년도로 고정되어 있습니다.
    return new Date(2026, month, day, hour, min);
  };

  // 일자별 정렬
  const sortedItinerary = (() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return [...itinerary].sort((a, b) => {
      const dateA = getEventDateObj(a.date, "00:00");
      const dateB = getEventDateObj(b.date, "00:00");
      const isPastA = dateA < today;
      const isPastB = dateB < today;
      if (isPastA && !isPastB) return 1;
      if (!isPastA && isPastB) return -1;
      return a.day - b.day;
    });
  })();

  // 타임라인 정렬
  const timelineEvents = (() => {
    const flat = [];
    itinerary.forEach((day, dIdx) => {
      day.events.forEach((evt, eIdx) => {
        flat.push({ ...evt, dIdx, eIdx, dateText: day.date, dateObj: getEventDateObj(day.date, evt.time) });
      });
    });
    const now = new Date();
    const future = flat.filter(e => e.dateObj >= now).sort((a, b) => a.dateObj - b.dateObj);
    const past = flat.filter(e => e.dateObj < now).sort((a, b) => b.dateObj - a.dateObj);
    return { future, past };
  })();

  const toggleDay = (day) => setExpandedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  const toggleAllDays = () => {
    if (expandedDays.length === itinerary.length) { setExpandedDays([]); setExpandedEventIds([]); }
    else {
      setExpandedDays(itinerary.map(d => d.day)); 
      const allIds = []; itinerary.forEach((day, dIdx) => { day.events.forEach((_, eIdx) => { allIds.push(`${dIdx}-${eIdx}`); }); });
      setExpandedEventIds(allIds); 
    }
  };
  const toggleEventDetails = (dayIdx, eventIdx) => {
    const id = `${dayIdx}-${eventIdx}`;
    setExpandedEventIds(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  };
  const handleEditEvent = (originalDayIdx, eventIdx) => {
    const currentEvent = itinerary[originalDayIdx].events[eventIdx];
    setEditModal({ isOpen: true, dayIdx: originalDayIdx, eventIdx, type: currentEvent.type || 'info', time: currentEvent.time || '', desc: currentEvent.desc || '', note: currentEvent.note || '', isNew: false });
  };
  const handleAddEvent = (originalDayIdx) => setEditModal({ isOpen: true, dayIdx: originalDayIdx, eventIdx: -1, type: 'camera', time: '12:00', desc: '', note: '', isNew: true });
  
  const saveEvent = () => {
    if (!editModal.desc || !editModal.desc.trim()) return;
    const newData = [...itinerary];
    const eventData = { time: editModal.time || '', type: editModal.type || 'info', desc: editModal.desc || '', note: editModal.note || '' };
    if (editModal.isNew) { newData[editModal.dayIdx].events.push(eventData); newData[editModal.dayIdx].events.sort((a, b) => (a.time || '24:00').localeCompare(b.time || '24:00')); }
    else { newData[editModal.dayIdx].events[editModal.eventIdx] = { ...newData[editModal.dayIdx].events[editModal.eventIdx], ...eventData }; }
    syncToCloud({ itinerary: newData }); setEditModal({ ...editModal, isOpen: false });
  };

  const handleDeleteEvent = (originalDayIdx, eventIdx) => {
    setConfirmModal({ isOpen: true, message: '삭제하시겠습니까?', onConfirm: () => {
      const newData = [...itinerary]; newData[originalDayIdx].events.splice(eventIdx, 1);
      syncToCloud({ itinerary: newData }); setConfirmModal({ ...confirmModal, isOpen: false });
    }});
  };

  const handleAddEssential = (catIdx) => setEssentialModal({ isOpen: true, catIdx, text: '' });
  
  const saveEssential = () => {
    if (essentialModal.text.trim() !== '') {
      const newData = [...essentials];
      newData[essentialModal.catIdx].items.push(essentialModal.text.trim());
      syncToCloud({ essentials: newData });
    }
    setEssentialModal({ isOpen: false, catIdx: -1, text: '' });
  };

  const handleRemoveEssential = (catIdx, itemIdx) => {
    setConfirmModal({
      isOpen: true, message: '이 준비물 항목을 삭제하시겠습니까?',
      onConfirm: () => {
        const newData = essentials.map((cat, i) => i === catIdx ? { ...cat, items: cat.items.filter((_, j) => j !== itemIdx) } : cat);
        syncToCloud({ essentials: newData });
        setConfirmModal({ isOpen: false, message: '', onConfirm: null });
      }
    });
  };
  // =====================================================================

  const handleOpenExpenseModal = (expense = null) => {
    if (expense && expense.id) { 
      setExpenseModal({ 
        isOpen: true, id: expense.id, payer: expense.payer || 'MJ', category: expense.category || '식음료', date: expense.date || '', title: expense.title || '',
        amount: expense.amount || '', currency: expense.currency || 'CNY',
        exchangeRate: expense.exchangeRate || (expense.currency === 'USD' ? DEFAULT_USD_RATE : DEFAULT_CNY_RATE),
        customRate: expense.customRate || false, note: expense.note || '', included: expense.included || [...MEMBERS]
      }); 
    } 
    else {
      const now = new Date(); const formattedDate = `${now.getMonth() + 1}월 ${now.getDate()}일`;
      setExpenseModal({ isOpen: true, id: null, payer: 'MJ', category: '식음료', date: formattedDate, title: '', amount: '', currency: 'CNY', exchangeRate: DEFAULT_CNY_RATE, customRate: false, note: '', included: [...MEMBERS] });
    }
  };

  const saveQuickMemo = () => {
    const text = quickMemoModal.text.trim(); if (!text) return;
    let payer = 'MJ'; if (/mj|민정|전민정/i.test(text)) payer = 'MJ'; else if (/jy|진영|허진영/i.test(text)) payer = 'JY'; else if (/hj|혜진|박혜진/i.test(text)) payer = 'HJ';
    let currency = 'CNY'; let rate = DEFAULT_CNY_RATE;
    if (/(달러|\$|usd)/i.test(text)) { currency = 'USD'; rate = DEFAULT_USD_RATE; }
    else if (/(원|만원|krw)/i.test(text)) { currency = 'KRW'; rate = 1; }
    const amountMatch = text.match(/\d+/); let amount = amountMatch ? parseInt(amountMatch[0]) : 0;
    if (/만원/.test(text) && amount < 1000) amount *= 10000;
    let title = text.replace(/mj|jy|hj|민정|진영|혜진|전민정|허진영|박혜진|달러|\$|usd|원|만원|krw|\d+/gi, '').trim() || "빠른 메모 지출";
    const now = new Date(); const formattedDate = `${now.getMonth() + 1}월 ${now.getDate()}일`;
    const newExpense = { id: Date.now().toString(), payer, category: '기타', date: formattedDate, title, amount, currency, exchangeRate: rate, customRate: false, note: `빠른 메모 (${now.toLocaleTimeString()})`, included: [...MEMBERS] };
    syncToCloud({ expenses: [...expenses, newExpense] }); setQuickMemoModal({ isOpen: false, text: '' });
  };
  const toggleIncludedPerson = (person) => {
    setExpenseModal(prev => {
      const newIncluded = prev.included?.includes(person) ? prev.included.filter(p => p !== person) : [...(prev.included || []), person];
      return { ...prev, included: newIncluded };
    });
  };

  const saveExpense = () => {
    if (!expenseModal.title || !expenseModal.amount) return;
    const newExpense = {
      id: expenseModal.id || Date.now().toString(),
      payer: expenseModal.payer,
      category: expenseModal.category,
      date: expenseModal.date || '일자 미지정',
      title: expenseModal.title,
      amount: parseFloat(expenseModal.amount),
      currency: expenseModal.currency,
      exchangeRate: parseFloat(expenseModal.exchangeRate) || (expenseModal.currency === 'USD' ? DEFAULT_USD_RATE : DEFAULT_CNY_RATE),
      customRate: expenseModal.customRate,
      note: expenseModal.note,
      included: expenseModal.included || [...MEMBERS]
    };
    let newData = expenseModal.id ? expenses.map(e => e.id === expenseModal.id ? newExpense : e) : [...expenses, newExpense];
    newData.sort((a, b) => {
      if (a.date === '일자 미지정') return 1;
      if (b.date === '일자 미지정') return -1;
      return a.date.localeCompare(b.date);
    });
    syncToCloud({ expenses: newData });
    setExpenseModal({ isOpen: false, id: null, payer: 'MJ', category: '식음료', date: '', title: '', amount: '', currency: 'CNY', exchangeRate: DEFAULT_CNY_RATE, customRate: false, note: '', included: [...MEMBERS] });
  };

  const handleDeleteExpense = (id) => {
    setConfirmModal({
      isOpen: true, message: '이 지출 내역을 삭제하시겠습니까?',
      onConfirm: () => {
        const newData = expenses.filter(e => e.id !== id);
        syncToCloud({ expenses: newData });
        setConfirmModal({ isOpen: false, message: '', onConfirm: null });
      }
    });
  };
  
  const getConvertedAmount = (exp) => {
    if (exp.currency === 'KRW') return exp.amount;
    const rate = exp.exchangeRate || (exp.currency === 'USD' ? DEFAULT_USD_RATE : DEFAULT_CNY_RATE);
    return Math.round(exp.amount * rate);
  };

  const groupedExpenses = expenses.reduce((acc, curr) => {
    const key = curr[expenseGroupBy] || '기타';
    if (!acc[key]) acc[key] = []; acc[key].push(curr); return acc;
  }, {});
  
  const groupedKeys = Object.keys(groupedExpenses).sort((a, b) => expenseGroupBy === 'date' ? (a === '일자 미지정' ? 1 : b === '일자 미지정' ? -1 : a.localeCompare(b)) : a.localeCompare(b));
  const totalGrandAmount = expenses.reduce((sum, exp) => sum + getConvertedAmount(exp), 0);

  const calculateSettlement = () => {
    const paid = { MJ: 0, JY: 0, HJ: 0 }; const spent = { MJ: 0, JY: 0, HJ: 0 }; const balances = { MJ: 0, JY: 0, HJ: 0 }; 
    expenses.forEach(exp => {
      const amt = getConvertedAmount(exp); paid[exp.payer] += amt; balances[exp.payer] += amt;
      const splitAmt = amt / (exp.included?.length || 1); exp.included?.forEach(person => { spent[person] += splitAmt; balances[person] -= splitAmt; });
    });
    let debtors = Object.keys(balances).filter(p => balances[p] <= -1).map(p => ({ p, amt: -balances[p] }));
    let creditors = Object.keys(balances).filter(p => balances[p] >= 1).map(p => ({ p, amt: balances[p] }));
    let transfers = []; debtors.sort((a, b) => b.amt - a.amt); creditors.sort((a, b) => b.amt - a.amt);
    let i = 0, j = 0; while (i < debtors.length && j < creditors.length) {
      let d = debtors[i], c = creditors[j]; let amount = Math.min(d.amt, c.amt);
      transfers.push({ from: d.p, to: c.p, amount: Math.round(amount) }); d.amt -= amount; c.amt -= amount;
      if (d.amt < 1) i++; if (c.amt < 1) j++;
    }
    return { paid, spent, balances, transfers };
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'flight': return <Plane size={18} className="text-blue-500" />;
      case 'train': return <Train size={18} className="text-emerald-600" />;
      case 'bus': return <Bus size={18} className="text-emerald-500" />;
      case 'hotel': return <Hotel size={18} className="text-indigo-500" />;
      case 'camera': return <Camera size={18} className="text-orange-500" />;
      case 'food': return <Utensils size={18} className="text-red-500" />;
      case 'coffee': return <Coffee size={18} className="text-amber-700" />;
      case 'info': return <Info size={18} className="text-gray-500" />;
      default: return <Clock size={18} className="text-gray-500" />;
    }
  };

  const renderEvent = (event, dayIdx, eventIdx, isTimeline = false) => {
    const isPast = isTimeline && event.dateObj < new Date();
    // 🌟 Key 중복 오류 방지용 고유 키 생성
    const uniqueKey = `${dayIdx}-${eventIdx}`;
    
    return (
      <div key={uniqueKey} className={`flex relative group ${isPast ? 'opacity-40 grayscale blur-[0.5px]' : ''}`}>
        {!isTimeline && eventIdx !== itinerary[dayIdx].events.length - 1 && <div className="absolute top-8 bottom-[-24px] left-[23px] w-0.5 bg-gray-200"></div>}
        {isTimeline && <div className="absolute top-8 bottom-[-24px] left-[23px] w-0.5 bg-emerald-100/50"></div>}
        
        {event.isSlot ? (
          <div className="w-full border-2 border-dashed border-emerald-300 bg-emerald-50/50 rounded-xl p-4 text-center mt-2">
            <span className="text-emerald-700 font-bold mb-1 text-sm">{isTimeline ? `${event.dateText} | ` : ''}{event.time} | {event.desc}</span>
            <div className="flex gap-2 w-full mt-3"><button onClick={() => handleEditEvent(dayIdx, eventIdx)} className="flex-1 bg-emerald-600 text-white text-sm font-bold py-2 rounded-lg flex items-center justify-center transition-colors"><Edit size={16} className="mr-1" /> 편집</button><button onClick={() => handleDeleteEvent(dayIdx, eventIdx)} className="bg-red-50 text-red-500 font-bold py-2 px-3 rounded-lg"><Trash2 size={16} /></button></div>
          </div>
        ) : (
          <>
            <div className="w-12 text-xs font-bold text-gray-500 pt-1 shrink-0">
              {isTimeline ? <div className="text-[10px] text-emerald-700 font-black mb-0.5">{event.dateText.split(' ')[1]}</div> : null}
              {event.time}
            </div>
            <div className="mx-2 bg-white w-8 h-8 rounded-full shadow-sm flex items-center justify-center border border-gray-100 z-10 shrink-0">{getEventIcon(event.type)}</div>
            <div className="pt-1 pb-2 pl-2 w-full cursor-pointer hover:bg-emerald-50/30 rounded-lg transition-colors" onClick={() => toggleEventDetails(dayIdx, eventIdx)}>
              <div className="text-sm font-bold text-gray-800 flex items-start justify-between flex-wrap gap-2">
                <span className="mt-1 flex-1 min-w-[120px] flex items-center">{event.desc} {expandedEventIds.includes(uniqueKey) ? <ChevronUp size={16} className="ml-1 text-emerald-500 shrink-0" /> : <ChevronDown size={16} className="ml-1 text-gray-400 shrink-0" />}</span>
                <div className="flex gap-1 shrink-0 items-center">
                  {event.map && <a href={event.map} target="_blank" rel="noreferrer" className="bg-gray-100 px-2 py-1.5 rounded text-[11px] font-bold" onClick={(e) => e.stopPropagation()}><MapPin size={12} /> 맵</a>}
                  <button onClick={(e) => { e.stopPropagation(); handleEditEvent(dayIdx, eventIdx); }} className="bg-gray-100 px-2 py-1.5 rounded text-[11px] font-bold"><Edit size={12} /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteEvent(dayIdx, eventIdx); }} className="bg-red-50 text-red-400 px-2 py-1.5 rounded text-[11px] font-bold"><Trash2 size={12} /></button>
                </div>
              </div>
              {expandedEventIds.includes(uniqueKey) && ( <div className="mt-3 p-3 bg-white border border-emerald-100 rounded-lg shadow-sm text-sm text-gray-700 whitespace-pre-wrap">{event.note || <span className="text-gray-400 text-xs italic">비고 없음</span>}</div> )}
              {showTips && event.memo && !expandedEventIds.includes(uniqueKey) && ( <div className="mt-3 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded shadow-sm text-xs text-yellow-900 leading-relaxed whitespace-pre-line"><strong>{event.memo.title}</strong><br/>{event.memo.content}</div> )}
              {showTips && event.tip && ( <div className="mt-2 bg-blue-50 border-l-4 border-blue-400 p-2.5 rounded shadow-sm flex items-start text-xs text-blue-800 leading-relaxed"><Lightbulb size={14} className="text-blue-600 mr-2 mt-0.5 shrink-0" />{event.tip}</div> )}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen shadow-lg font-sans text-gray-800 relative pb-24">
      {/* Header */}
      <header className="p-6 rounded-b-3xl shadow-md relative" style={{ backgroundColor: '#acd8a9', color: '#064e3b' }}>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-1">중케이숀(청두)</h1>
            <div className="flex items-center text-xs opacity-90 mb-3 text-emerald-800 bg-emerald-100/40 inline-block px-2 py-0.5 rounded-full">
              {isCloudSyncing ? <CloudOff size={12} className="mr-1 animate-pulse" /> : <Cloud size={12} className="mr-1" />} 실시간 동기화 됨
            </div>
            <div className="flex items-center text-sm opacity-90 mb-1"><Calendar size={16} className="mr-2" /><span>2026.04.17 - 04.21</span></div>
            <div className="flex items-center text-sm opacity-90"><Users size={16} className="mr-2" /><span>MJ, JY, HJ</span></div>
          </div>
          <div className="flex gap-2 shrink-0 mt-1">
            <a href="https://www.notion.so/moeng/31f8df0b230c80f88c7ad47124b8eec8" target="_blank" rel="noreferrer" className="bg-[#064e3b] text-white p-3 rounded-full shadow-sm flex items-center justify-center transition-colors"><BookOpen size={20} /></a>
            <button onClick={() => setShowChecklist(true)} className="bg-[#064e3b] text-white p-3 rounded-full shadow-sm flex items-center justify-center transition-colors"><Backpack size={20} /></button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-white border-b sticky top-0 z-10 shadow-sm text-sm font-bold">
        {['summary', 'itinerary', 'account'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-4 text-center transition-colors ${activeTab === tab ? 'text-emerald-700 border-b-2 border-emerald-700' : 'text-gray-400 hover:text-emerald-600'}`}>
            {tab === 'summary' ? '요약' : tab === 'itinerary' ? '일정' : '가계부'}
          </button>
        ))}
      </div>

      <main className="p-4">
        {activeTab === 'summary' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center"><AlertCircle size={20} className="mr-2 text-emerald-600" />포인트</h2>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded mr-3 text-xs font-bold mt-0.5 shrink-0">자연</span>구채구와 황룡 자연 힐링</li>
                <li className="flex items-start"><span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded mr-3 text-xs font-bold mt-0.5 shrink-0">식사</span>사천요리와 길거리 음식 탐방</li>
              </ul>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Hotel size={20} className="mr-2 text-indigo-500" />숙소 정보</h2>
              <div className="space-y-4 text-sm text-gray-600">
                <div><strong>1일차:</strong> 청두 레이먼트 호텔</div>
                <div><strong>2일차:</strong> Holiday INN EXP Jiuzhaigou</div>
                <div><strong>3일차:</strong> 신위안 호텔 (청두 시내)</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'itinerary' && (
          <div className="space-y-4 pb-4 animate-fadeIn">
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100 mb-4">
              <button 
                onClick={() => setItineraryView('grouped')} 
                className={`flex-1 flex items-center justify-center py-2 rounded-lg text-xs font-bold transition-colors ${itineraryView === 'grouped' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List size={14} className="mr-1.5" /> 일자별 보기
              </button>
              <button 
                onClick={() => setItineraryView('timeline')} 
                className={`flex-1 flex items-center justify-center py-2 rounded-lg text-xs font-bold transition-colors ${itineraryView === 'timeline' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <AlignLeft size={14} className="mr-1.5" /> 타임라인 (Now)
              </button>
            </div>

            <div className="flex justify-between items-center mb-2">
              <label className="flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg cursor-pointer">
                <input type="checkbox" checked={showTips} onChange={(e) => setShowTips(e.target.checked)} className="mr-1.5 accent-emerald-600 w-3.5 h-3.5" /> 팁 표시
              </label>
              {itineraryView === 'grouped' && (
                <button onClick={toggleAllDays} className="flex items-center text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full">
                  {expandedDays.length === itinerary.length ? <ChevronsUp size={14} className="mr-1"/> : <ChevronsDown size={14} className="mr-1"/>} 전체
                </button>
              )}
            </div>

            {itineraryView === 'grouped' ? (
              sortedItinerary.map((day) => {
                const originalDayIdx = itinerary.findIndex(d => d.day === day.day);
                return (
                  <div key={day.day} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-3">
                    <button onClick={() => toggleDay(day.day)} className="w-full text-left p-4 flex justify-between items-center transition-colors hover:bg-gray-50">
                      <div><span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full mb-1 inline-block">Day {day.day}</span><h3 className="font-bold text-gray-800 mt-1">{day.date}</h3><p className="text-sm text-gray-500">{day.title}</p></div>
                      <div className={`transform transition-transform ${expandedDays.includes(day.day) ? 'rotate-180' : ''}`}><ChevronDown size={20} className="text-gray-400" /></div>
                    </button>
                    {expandedDays.includes(day.day) && (
                      <div className="p-4 pt-0 border-t border-gray-50 bg-gray-50/50">
                        <div className="mt-4 space-y-6">
                          {day.events.map((event, eventIdx) => renderEvent(event, originalDayIdx, eventIdx))}
                        </div>
                        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-center"><button onClick={() => handleAddEvent(originalDayIdx)} className="text-emerald-600 font-bold flex items-center gap-1.5 bg-emerald-50 px-4 py-2 rounded-full w-full justify-center transition-colors hover:bg-emerald-100"><Plus size={14} /> 일정 추가</button></div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="space-y-6">
                {timelineEvents.future.length > 0 && (
                  <div className="space-y-6">
                    <div className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-1 rounded inline-block">남은 일정</div>
                    {timelineEvents.future.map((event) => renderEvent(event, event.dIdx, event.eIdx, true))}
                  </div>
                )}
                {timelineEvents.past.length > 0 && (
                  <div className="space-y-6 pt-4 border-t-2 border-dashed border-gray-200">
                    <div className="text-[10px] font-black text-gray-400 bg-gray-200 px-2 py-1 rounded inline-block">지난 일정</div>
                    {timelineEvents.past.map((event) => renderEvent(event, event.dIdx, event.eIdx, true))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'account' && (
          <div className="space-y-4 animate-fadeIn pb-20">
            <div className="flex justify-end mb-2">
              <select value={expenseGroupBy} onChange={(e) => setExpenseGroupBy(e.target.value)} className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full border-none outline-none">
                <option value="date">일자별 집계</option><option value="payer">개인별 집계</option><option value="category">카테고리별 집계</option>
              </select>
            </div>
            {expenses.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl text-center border border-gray-100 shadow-sm flex flex-col items-center"><Receipt size={40} className="text-gray-300 mb-3" /><p className="text-gray-500 font-bold">지출 내역이 없습니다.</p></div>
            ) : (
              groupedKeys.map(groupKey => {
                const groupTotal = groupedExpenses[groupKey].reduce((sum, exp) => sum + getConvertedAmount(exp), 0);
                return (
                  <div key={groupKey} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
                    <div className="bg-gray-50/80 p-3 border-b flex justify-between items-center"><span className="font-bold text-sm text-gray-700">{groupKey}</span><span className="font-bold text-sm text-emerald-700">합계: {groupTotal.toLocaleString()}원</span></div>
                    {groupedExpenses[groupKey].map(exp => (
                      <div key={exp.id} className="p-3 border-b last:border-0 hover:bg-emerald-50/30 cursor-pointer" onClick={() => handleOpenExpenseModal(exp)}>
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-white bg-emerald-600 px-1.5 py-0.5 rounded">{exp.category}</span><span className="font-bold text-gray-800 text-sm">{exp.title}</span></div>
                          <span className="font-bold text-gray-800">{getConvertedAmount(exp).toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>결제: {exp.payer} ({exp.included?.join(', ') || '전원'})</span>
                          <span>{exp.currency === 'CNY' ? `¥${exp.amount.toLocaleString()}` : exp.currency === 'USD' ? `$${exp.amount.toLocaleString()}` : `₩${exp.amount.toLocaleString()}`}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })
            )}

            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t p-4 flex justify-between items-center z-20 shadow-lg">
              <div><p className="text-xs font-bold text-gray-500">총 지출액</p><p className="text-xl font-black text-emerald-700">{totalGrandAmount.toLocaleString()}원</p></div>
              <button onClick={() => setShowSettleModal(true)} className="bg-emerald-600 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 shadow-md hover:bg-emerald-700 transition-colors"><Calculator size={18} /> 정산하기</button>
            </div>
          </div>
        )}
      </main>

      {/* FABs */}
      {activeTab === 'account' && (
        <div className="fixed bottom-24 right-4 flex flex-col gap-3 z-30">
          <button onClick={() => setQuickMemoModal({ isOpen: true, text: '' })} className="bg-orange-500 text-white p-4 rounded-full shadow-xl hover:scale-105 transition-transform flex flex-col items-center">
            <Zap size={24} />
          </button>
          <button onClick={() => handleOpenExpenseModal()} className="bg-emerald-600 text-white p-4 rounded-full shadow-xl hover:scale-105 transition-transform flex flex-col items-center">
            <Plus size={24} />
          </button>
        </div>
      )}

      {/* Quick Memo Modal */}
      {quickMemoModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-5">
            <div className="flex items-center gap-2 mb-4 text-orange-600 font-bold"><Zap size={20} /> ⚡ 퀵메모 (결제자/금액/제목)</div>
            <textarea autoFocus value={quickMemoModal.text} onChange={e => setQuickMemoModal({...quickMemoModal, text: e.target.value})} className="w-full border-2 border-orange-100 rounded-xl p-3 text-sm h-28 focus:border-orange-500 outline-none resize-none mb-4" placeholder="예: mj 훠궈 300 / 혜진 $10 택시 / jy 3만원 간식" />
            <div className="flex gap-2"><button onClick={() => setQuickMemoModal({ isOpen: false, text: '' })} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-500">취소</button><button onClick={saveQuickMemo} className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-bold">즉시 저장</button></div>
          </div>
        </div>
      )}

      {/* Expense Input Modal */}
      {expenseModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-emerald-700 text-white flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold flex items-center"><Receipt size={18} className="mr-2" /> 지출 상세</h3>
              <button onClick={() => setExpenseModal({ ...expenseModal, isOpen: false })}><X size={20} /></button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="flex gap-3">
                <div className="flex-1"><label className="block text-xs font-bold text-gray-600 mb-1">결제자</label><select value={expenseModal.payer} onChange={e => setExpenseModal({...expenseModal, payer: e.target.value})} className="w-full border rounded-lg p-2 text-sm bg-white">{MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                <div className="flex-1"><label className="block text-xs font-bold text-gray-600 mb-1">카테고리</label><select value={expenseModal.category} onChange={e => setExpenseModal({...expenseModal, category: e.target.value})} className="w-full border rounded-lg p-2 text-sm bg-white">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              </div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1">일자</label><input type="text" value={expenseModal.date} onChange={e => setExpenseModal({...expenseModal, date: e.target.value})} className="w-full border rounded-lg p-2 text-sm" placeholder="공백 시 '일자 미지정' 저장" /></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1">제목</label><input type="text" value={expenseModal.title} onChange={e => setExpenseModal({...expenseModal, title: e.target.value})} className="w-full border rounded-lg p-2 text-sm" placeholder="내용 입력" /></div>
              <div className="flex gap-3">
                <div className="flex-1"><label className="block text-xs font-bold text-gray-600 mb-1">금액</label><input type="number" value={expenseModal.amount} onChange={e => setExpenseModal({...expenseModal, amount: e.target.value})} className="w-full border rounded-lg p-2 text-sm" /></div>
                <div className="w-24"><label className="block text-xs font-bold text-gray-600 mb-1">통화</label>
                  <select value={expenseModal.currency} onChange={e => setExpenseModal({...expenseModal, currency: e.target.value, exchangeRate: e.target.value === 'USD' ? DEFAULT_USD_RATE : e.target.value === 'CNY' ? DEFAULT_CNY_RATE : 1})} className="w-full border rounded-lg p-2 text-sm bg-white">
                    <option value="CNY">위안(¥)</option><option value="USD">달러($)</option><option value="KRW">원화(₩)</option>
                  </select>
                </div>
              </div>
              {expenseModal.currency !== 'KRW' && (
                <div className="bg-gray-50 p-3 rounded-xl border">
                  <label className="text-xs font-bold text-gray-600 flex items-center mb-1"><input type="checkbox" checked={expenseModal.customRate} onChange={e => setExpenseModal({...expenseModal, customRate: e.target.checked})} className="mr-1.5" /> 환율 직접 입력</label>
                  {expenseModal.customRate ? <input type="number" value={expenseModal.exchangeRate} onChange={e => setExpenseModal({...expenseModal, exchangeRate: e.target.value})} className="w-full border rounded-lg p-2 text-sm" /> : <p className="text-sm font-bold text-gray-500 p-1">{expenseModal.currency === 'USD' ? DEFAULT_USD_RATE.toLocaleString() : DEFAULT_CNY_RATE.toLocaleString()}원</p>}
                  <div className="mt-1 text-right font-bold text-emerald-700 text-xs">환산: {getConvertedAmount(expenseModal).toLocaleString()}원</div>
                </div>
              )}
              <div><label className="block text-xs font-bold text-gray-600 mb-1">포함 인원 (N빵)</label>
                <div className="flex gap-2">{MEMBERS.map(m => (<label key={m} className={`flex-1 border rounded-lg p-2 text-center text-sm font-bold cursor-pointer ${expenseModal.included?.includes(m) ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-gray-50 text-gray-400'}`}><input type="checkbox" className="hidden" checked={expenseModal.included?.includes(m)} onChange={() => toggleIncludedPerson(m)} />{m}</label>))}</div>
              </div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1">비고</label><input type="text" value={expenseModal.note} onChange={e => setExpenseModal({...expenseModal, note: e.target.value})} className="w-full border rounded-lg p-2 text-sm" /></div>
            </div>
            <div className="p-4 bg-gray-50 border-t flex gap-2 shrink-0">{expenseModal.id && (<button onClick={() => { handleDeleteExpense(expenseModal.id); setExpenseModal({...expenseModal, isOpen: false}); }} className="bg-red-50 text-red-500 p-2 rounded-lg hover:bg-red-100 transition-colors"><Trash2 size={20} /></button>)}<button onClick={saveExpense} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors">저장하기</button></div>
          </div>
        </div>
      )}

      {/* Settlement Result Modal */}
      {showSettleModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-emerald-700 text-white flex justify-between items-center shrink-0"><h3 className="text-lg font-bold flex items-center"><Calculator size={18} className="mr-2" /> 최종 정산 결과</h3><button onClick={() => setShowSettleModal(false)}><X size={20} /></button></div>
            <div className="p-5 overflow-y-auto bg-gray-50">
              {(() => {
                const { paid, spent, balances, transfers } = calculateSettlement();
                return (
                  <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden"><table className="w-full text-xs text-center"><thead className="bg-gray-100 font-bold text-gray-600 border-b"><tr><th className="py-2">이름</th><th className="py-2">결제액</th><th className="py-2">실지출</th><th className="py-2">정산액</th></tr></thead><tbody className="divide-y text-gray-700">{MEMBERS.map(m => (<tr key={m}><td className="py-2 font-bold bg-gray-50">{m}</td><td className="py-2 text-emerald-600">{Math.round(paid[m]).toLocaleString()}</td><td className="py-2 text-red-500">{Math.round(spent[m]).toLocaleString()}</td><td className={`py-2 font-bold ${balances[m] > 0 ? 'text-blue-600' : balances[m] < 0 ? 'text-red-600' : 'text-gray-500'}`}>{balances[m] > 0 ? `+${Math.round(balances[m]).toLocaleString()}` : Math.round(balances[m]).toLocaleString()}</td></tr>))}</tbody></table></div>
                    <div><h4 className="font-bold text-sm text-gray-800 mb-3 border-b pb-1">💸 송금 가이드</h4>{transfers.length === 0 ? <p className="text-center text-gray-500 py-4 font-bold">🎉 완벽하게 정산되었습니다!</p> : transfers.map((t, idx) => (<div key={idx} className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center justify-between mb-2"><div><span className="font-bold text-red-600 bg-white px-2 py-1 rounded-full text-xs border border-red-100">{t.from}</span><span className="mx-2 text-gray-400">➔</span><span className="font-bold text-blue-600 bg-white px-2 py-1 rounded-full text-xs border border-blue-100">{t.to}</span></div><span className="font-black text-blue-800">{t.amount.toLocaleString()} 원</span></div>))}</div>
                  </div>
                );
              })()}
            </div>
            <div className="p-4 bg-white border-t shrink-0"><button onClick={() => setShowSettleModal(false)} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors">확인 완료</button></div>
          </div>
        </div>
      )}
      
      {/* 🎒 Essential Input Modal (방금 추가한 무적 팝업창!) */}
      {essentialModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl p-5">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <Plus size={18} className="mr-2 text-emerald-600" /> 준비물 추가
            </h3>
            <input 
              type="text" 
              autoFocus
              value={essentialModal.text} 
              onChange={(e) => setEssentialModal({...essentialModal, text: e.target.value})} 
              className="w-full border-2 border-emerald-100 rounded-xl p-3 text-sm focus:border-emerald-500 outline-none mb-5" 
              placeholder="추가할 물품 입력" 
              onKeyPress={(e) => e.key === 'Enter' && saveEssential()}
            />
            <div className="flex gap-2">
              <button onClick={() => setEssentialModal({ isOpen: false, catIdx: -1, text: '' })} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-gray-500">취소</button>
              <button onClick={saveEssential} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold">추가하기</button>
            </div>
          </div>
        </div>
      )}

      {/* Essentials Modal */}
      {showChecklist && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto shadow-2xl relative">
            <div className="sticky top-0 bg-emerald-700 text-white p-4 flex justify-between items-center z-10"><h2 className="text-lg font-bold flex items-center"><Backpack size={20} className="mr-2" /> 필수 준비물</h2><div className="flex gap-2"><button onClick={() => setIsEditingChecklist(!isEditingChecklist)} className={`p-1.5 rounded-full transition-colors ${isEditingChecklist ? 'bg-emerald-500 shadow-inner' : 'bg-emerald-800/50'}`}><Edit3 size={18} /></button><button onClick={() => setShowChecklist(false)} className="bg-emerald-800/50 p-1.5 rounded-full"><X size={18} /></button></div></div>
            <div className="p-5 space-y-5">{essentials.map((group, catIdx) => (<div key={catIdx}><h3 className="text-sm font-bold text-emerald-800 border-b border-emerald-100 pb-1 mb-2">{group.category}</h3><ul className="space-y-2">{group.items.map((item, itemIdx) => (<li key={itemIdx} className="flex items-start justify-between group/item"><div className="flex items-start pr-2"><CheckSquare size={16} className="text-gray-300 mr-2 shrink-0 mt-0.5" /><span className="text-sm text-gray-700">{item}</span></div>{isEditingChecklist && <button onClick={() => handleRemoveEssential(catIdx, itemIdx)} className="text-red-400 p-1 bg-red-50 rounded"><Trash2 size={14} /></button>}</li>))}</ul>{isEditingChecklist && <button onClick={() => handleAddEssential(catIdx)} className="mt-2 text-[11px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded font-bold flex items-center transition-colors hover:bg-emerald-100"><Plus size={12} className="mr-1" /> 항목 추가</button>}</div>))}</div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {editModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-5"><h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Edit size={18} className="mr-2 text-emerald-600" />일정 편집</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">{EVENT_ICONS.map((icon) => (<button key={icon.type} onClick={() => setEditModal({...editModal, type: icon.type})} className={`flex flex-col items-center p-2 rounded-lg border ${editModal.type === icon.type ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white'}`}>{getEventIcon(icon.type)}<span className="text-[10px] mt-1">{icon.label}</span></button>))}</div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1">시간</label><input type="text" value={editModal.time} onChange={(e) => setEditModal({...editModal, time: e.target.value})} className="w-full border rounded-lg p-2 text-sm outline-none" placeholder="예: 14:00" /></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1">내용</label><input type="text" value={editModal.desc} onChange={(e) => setEditModal({...editModal, desc: e.target.value})} className="w-full border rounded-lg p-2 text-sm outline-none" /></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1">비고</label><textarea value={editModal.note} onChange={(e) => setEditModal({...editModal, note: e.target.value})} className="w-full border rounded-lg p-2 text-sm h-20 outline-none resize-none" /></div>
            </div>
            <div className="flex gap-2 mt-5"><button onClick={() => setEditModal({ ...editModal, isOpen: false })} className="flex-1 bg-gray-100 py-2 rounded-lg font-bold">취소</button><button onClick={saveEvent} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold">저장</button></div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl p-5 text-center"><AlertCircle size={32} className="text-red-500 mx-auto mb-3" /><h3 className="text-sm font-bold text-gray-800 mb-5">{confirmModal.message}</h3><div className="flex gap-2"><button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="flex-1 bg-gray-100 py-2 rounded-lg font-bold">취소</button><button onClick={confirmModal.onConfirm} className="flex-1 bg-red-500 text-white py-2 rounded-lg font-bold transition-colors hover:bg-red-600">삭제</button></div></div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .animate-fadeIn { animation: fadeIn 0.15s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
      `}} />
    </div>
  );
};

export default ChengduTripApp;