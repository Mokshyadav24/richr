import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, TrendingUp, DollarSign, PieChart, Activity, Briefcase, 
  CreditCard, User, X, Send, RefreshCw, Zap, LogOut, Calendar, 
  Lock, Mail, ChevronRight, AlertCircle, FileText, Trash2, 
  Download, Filter, Target, Edit3, Lightbulb, Loader2, 
  Settings, BrainCircuit, Sparkles, MessageSquare, Bot, ArrowRight,
  Calculator, Moon, Sun, LayoutGrid, PieChart as PieIcon, UserCircle, Repeat, CheckCircle, Globe, Camera
} from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInAnonymously, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  collection, 
  onSnapshot, 
  addDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  serverTimestamp 
} from "firebase/firestore";

// --- Firebase Configuration ---
let firebaseConfig;
try {
  firebaseConfig = JSON.parse(__firebase_config);
} catch (e) {
  firebaseConfig = {
    apiKey: "AIzaSyC0xqx7bHkhUM6ZHZYXErtRPWJd_sCnIlY", 
    authDomain: "richr-d5cfc.firebaseapp.com",
    projectId: "richr-d5cfc",
    storageBucket: "richr-d5cfc.firebasestorage.app",
    messagingSenderId: "1031148718480",
    appId: "1:1031148718480:web:96072659913fa7b4b58b15",
    measurementId: "G-PLJ99FLJPD"
  };
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
const appId = 'richr-v45-logout-fix';

// --- Constants & Data ---
const formatDate = (date) => date.toISOString().split('T')[0];
const getMonthStr = (date) => date.toISOString().substring(0, 7);
const getYearStr = (date) => date.getFullYear().toString();

const FINANCIAL_QUOTES = [
  "Do not save what is left after spending, but spend what is left after saving. - Warren Buffett",
  "Beware of little expenses. A small leak will sink a great ship. - Benjamin Franklin",
  "The stock market is designed to transfer money from the Active to the Patient. - Warren Buffett",
  "It's not how much money you make, but how much money you keep. - Robert Kiyosaki"
];

const getDailyQuote = () => FINANCIAL_QUOTES[new Date().getDate() % FINANCIAL_QUOTES.length];

const DEFAULT_CATEGORIES = ['General', 'Groceries', 'Food', 'Travel', 'Bills', 'Shopping', 'Entertainment', 'Income'];

const guessBudgetCategory = (tag) => {
    const lower = tag.toLowerCase();
    if (lower === 'income') return 'Income';
    if (['groceries', 'bills', 'rent', 'education', 'health', 'fuel'].includes(lower)) return 'Need';
    if (['food', 'entertainment', 'shopping', 'travel', 'hobbies'].includes(lower)) return 'Want';
    if (['investment', 'stocks', 'sip', 'gold'].includes(lower)) return 'Investment';
    return 'Want'; 
};

// --- INTELLIGENCE ENGINE ---
const callGeminiFlash = async (apiKey, prompt) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (e) {
        console.error("Gemini API Error:", e);
        return null;
    }
};

const getFinancialContext = (transactions, userData) => {
    const totalIncome = userData.income || 0;
    const totalExpenses = transactions.filter(t => t.category === 'Expense').reduce((sum, t) => sum + t.amount, 0);
    const catBreakdown = transactions.reduce((acc, t) => {
        if(t.category === 'Expense') acc[t.tag] = (acc[t.tag] || 0) + t.amount;
        return acc;
    }, {});
    
    const recentTx = transactions.slice(0, 5).map(t => `${t.dateStr}: ${t.title} (${t.amount})`).join(", ");

    return `
      Profile: ${userData.name}, Age: ${userData.age}, Goal: ${userData.goal}
      Monthly Income: ₹${totalIncome}
      Total Expenses (All Time): ₹${totalExpenses}
      Savings Rate: ${totalIncome > 0 ? Math.round(((totalIncome - totalExpenses)/totalIncome)*100) : 0}%
      Category Breakdown: ${JSON.stringify(catBreakdown)}
      Recent Activity: ${recentTx}
    `;
};

// --- Components ---
const Card = ({ children, className = "", isDark }) => (
    <div className={`backdrop-blur-md rounded-2xl p-6 shadow-xl transition-colors ${isDark ? 'bg-slate-800/50 border border-slate-700' : 'bg-white/80 border border-gray-200'} ${className}`}>
        {children}
    </div>
);

const Button = ({ children, onClick, variant = "primary", className = "", icon: Icon, disabled, type="button", size="md", isLoading, isDark }) => {
  const sizeStyles = { sm: "px-3 py-1.5 text-xs", md: "px-6 py-3 text-sm", lg: "px-8 py-4 text-lg" };
  const baseStyle = `relative overflow-hidden flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${sizeStyles[size] || sizeStyles.md}`;
  
  const variants = {
    primary: "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20",
    secondary: isDark ? "bg-slate-700 hover:bg-slate-600 text-slate-200" : "bg-gray-100 hover:bg-gray-200 text-gray-700",
    white: "bg-white hover:bg-slate-100 text-slate-900 shadow-lg",
    danger: "bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/50",
    ghost: isDark ? "bg-transparent hover:bg-slate-700/50 text-slate-400 hover:text-white" : "bg-transparent hover:bg-gray-100 text-gray-500 hover:text-gray-900",
    chat: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 rounded-full p-3 fixed bottom-6 right-6 z-50"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled || isLoading} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {isLoading ? <Loader2 className="animate-spin" size={20} /> : Icon && <Icon size={size === 'sm' ? 16 : 20} />}
      <span className="relative z-10">{children}</span>
    </button>
  );
};

const QuoteBanner = ({ quote, onClose, isVisible, onShow, isDark }) => {
  if (!isVisible) return <button onClick={onShow} className={`fixed top-4 left-4 z-50 p-2 rounded-full shadow-lg ${isDark ? 'bg-slate-800/80 text-indigo-400 border border-indigo-500/30' : 'bg-white text-indigo-600 border border-indigo-100'}`}><Lightbulb size={20} /></button>;
  return (
    <div className={`w-full max-w-3xl mx-auto mb-6 rounded-2xl p-4 flex items-start gap-4 animate-fade-in relative z-20 shadow-lg backdrop-blur-md border ${isDark ? 'bg-gradient-to-r from-indigo-900/60 to-slate-900/80 border-indigo-500/30' : 'bg-gradient-to-r from-indigo-50 to-white/80 border-indigo-100'}`}>
        <div className={`p-2 rounded-lg mt-1 shrink-0 ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}><Lightbulb size={24} /></div>
        <div className="flex-1 text-left">
            <h3 className={`font-semibold mb-1 text-sm uppercase tracking-wider ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>Wisdom of the Day</h3>
            <p className={`text-sm italic font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>"{quote}"</p>
        </div>
        <button onClick={onClose} className={`p-1 absolute top-2 right-2 ${isDark ? 'text-slate-500 hover:text-white' : 'text-gray-400 hover:text-gray-800'}`}><X size={16}/></button>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const Calculators = ({ isDark }) => {
    const [mode, setMode] = useState('sip'); 
    const [values, setValues] = useState({ p: 5000, r: 12, n: 5 }); 
    const [result, setResult] = useState(null);

    const calculate = () => {
        const { p, r, n } = values;
        let res = {};
        if (mode === 'sip') {
            const i = r / 12 / 100;
            const months = n * 12;
            const invested = p * months;
            const fv = p * ( (Math.pow(1+i, months) - 1) / i ) * (1+i);
            res = { invested, total: Math.round(fv), gain: Math.round(fv - invested) };
        } else if (mode === 'loan') {
            const mr = r / 12 / 100;
            const months = n * 12;
            const emi = p * mr * Math.pow(1+mr, months) / (Math.pow(1+mr, months) - 1);
            const totalPay = emi * months;
            res = { emi: Math.round(emi), total: Math.round(totalPay), interest: Math.round(totalPay - p) };
        } else if (mode === 'swp') {
            const fv = p * Math.pow((1 + r/100), n);
            res = { total: Math.round(fv), note: "Future Value of Lump Sum" };
        }
        setResult(res);
    };

    return (
        <div className="space-y-6">
            <div className="flex bg-slate-700/20 p-1 rounded-xl">
                {['sip', 'loan', 'swp'].map(m => (
                    <button key={m} onClick={() => { setMode(m); setResult(null); }} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize ${mode === m ? 'bg-emerald-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>{m === 'loan' ? 'Loan / EMI' : m.toUpperCase()}</button>
                ))}
            </div>
            <div className="space-y-4">
                <div><label className="text-xs text-slate-500 block mb-1">{mode === 'sip' ? 'Monthly Investment (₹)' : mode === 'loan' ? 'Loan Amount (₹)' : 'Total Investment (₹)'}</label><input type="number" value={values.p} onChange={e => setValues({...values, p: Number(e.target.value)})} className={`w-full p-3 rounded-xl outline-none ${isDark ? 'bg-slate-800 text-white border border-slate-700' : 'bg-gray-50 text-gray-900 border border-gray-200'}`} /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs text-slate-500 block mb-1">Rate of Return (%)</label><input type="number" value={values.r} onChange={e => setValues({...values, r: Number(e.target.value)})} className={`w-full p-3 rounded-xl outline-none ${isDark ? 'bg-slate-800 text-white border border-slate-700' : 'bg-gray-50 text-gray-900 border border-gray-200'}`} /></div>
                    <div><label className="text-xs text-slate-500 block mb-1">Time Period (Years)</label><input type="number" value={values.n} onChange={e => setValues({...values, n: Number(e.target.value)})} className={`w-full p-3 rounded-xl outline-none ${isDark ? 'bg-slate-800 text-white border border-slate-700' : 'bg-gray-50 text-gray-900 border border-gray-200'}`} /></div>
                </div>
                <Button onClick={calculate} className="w-full">Calculate</Button>
            </div>
            {result && (
                <div className={`p-4 rounded-xl border animate-fade-in-up ${isDark ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
                    {mode === 'sip' && (<><div className="flex justify-between mb-2"><span className="text-slate-500">Invested</span><span className="font-bold">₹{result.invested.toLocaleString()}</span></div><div className="flex justify-between mb-2"><span className="text-slate-500">Est. Returns</span><span className="font-bold text-emerald-500">+₹{result.gain.toLocaleString()}</span></div><div className="flex justify-between pt-2 border-t border-slate-700/30"><span className="text-slate-400 font-medium">Total Value</span><span className="font-bold text-xl">₹{result.total.toLocaleString()}</span></div></>)}
                    {mode === 'loan' && (<><div className="flex justify-between mb-2"><span className="text-slate-500">Monthly EMI</span><span className="font-bold text-red-400">₹{result.emi.toLocaleString()}</span></div><div className="flex justify-between mb-2"><span className="text-slate-500">Total Interest</span><span className="font-bold text-red-400">₹{result.interest.toLocaleString()}</span></div><div className="flex justify-between pt-2 border-t border-slate-700/30"><span className="text-slate-400 font-medium">Total Payable</span><span className="font-bold text-xl">₹{result.total.toLocaleString()}</span></div></>)}
                    {mode === 'swp' && (<div className="text-center"><p className="text-xs text-slate-500">{result.note}</p><h3 className="text-2xl font-bold text-emerald-500 mt-1">₹{result.total.toLocaleString()}</h3></div>)}
                </div>
            )}
        </div>
    );
};

const SubscriptionsManager = ({ userId, isDark }) => {
    const [subs, setSubs] = useState([]);
    const [newSub, setNewSub] = useState({ title: '', amount: '', day: 1 });
    
    useEffect(() => {
        if(!userId) return;
        const unsub = onSnapshot(collection(db, 'artifacts', appId, 'users', userId, 'subscriptions'), (snap) => {
            const list = snap.docs.map(d => ({id: d.id, ...d.data()}));
            setSubs(list);
        });
        return () => unsub();
    }, [userId]);

    const addSub = async () => {
        if(!newSub.title || !newSub.amount) return;
        await addDoc(collection(db, 'artifacts', appId, 'users', userId, 'subscriptions'), {
            title: newSub.title,
            amount: parseFloat(newSub.amount),
            day: parseInt(newSub.day),
            createdAt: serverTimestamp(),
            tag: 'Bills' 
        });
        setNewSub({ title: '', amount: '', day: 1 });
    };

    const deleteSub = async (id) => {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', userId, 'subscriptions', id));
    };

    const totalSubs = subs.reduce((a, b) => a + (b.amount || 0), 0);

    return (
        <div className="space-y-6">
            <div className={`p-4 rounded-xl border flex justify-between items-center ${isDark ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'}`}>
                <div>
                    <h4 className={`text-sm font-medium ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>Total Monthly Subscriptions</h4>
                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>₹{totalSubs.toLocaleString()}</p>
                </div>
                <div className="p-2 bg-indigo-500 rounded-lg text-white"><Repeat size={24} /></div>
            </div>

            <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
                {subs.map(s => (
                    <div key={s.id} className={`flex justify-between items-center p-3 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>{s.day}</div>
                            <div>
                                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{s.title}</p>
                                <p className="text-[10px] text-slate-500">Auto-renews monthly</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-sm">₹{s.amount}</span>
                            <button onClick={() => deleteSub(s.id)} className="text-slate-500 hover:text-red-500"><Trash2 size={14}/></button>
                        </div>
                    </div>
                ))}
                {subs.length === 0 && <p className="text-center text-xs text-slate-500 py-4">No active subscriptions.</p>}
            </div>

            <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Add New</h4>
                <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="App Name (e.g. Netflix)" value={newSub.title} onChange={e => setNewSub({...newSub, title: e.target.value})} className={`p-2 rounded-lg text-sm outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-slate-900'}`} />
                    <input type="number" placeholder="Amount (₹)" value={newSub.amount} onChange={e => setNewSub({...newSub, amount: e.target.value})} className={`p-2 rounded-lg text-sm outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-slate-900'}`} />
                </div>
                <div className="flex items-center gap-3">
                    <label className="text-xs text-slate-500">Day of Month:</label>
                    <input type="number" min="1" max="31" value={newSub.day} onChange={e => setNewSub({...newSub, day: e.target.value})} className={`w-16 p-2 rounded-lg text-sm outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300 text-slate-900'}`} />
                    <Button onClick={addSub} size="sm" className="flex-1">Add Subscription</Button>
                </div>
            </div>
        </div>
    );
};

const ProfileModal = ({ userData, isDark, onClose, onSaveSettings, onLogout, geminiKey, setGeminiKey, setIsDarkMode, userId, onUpdateProfile, initialTab }) => {
    const [activeTab, setActiveTab] = useState(initialTab || 'calculators');
    const [editData, setEditData] = useState(userData);

    const handleProfileUpdate = () => {
        onUpdateProfile(editData);
        alert("Profile Updated!");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
             <div className={`w-full max-w-2xl h-[600px] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up ${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-gray-200'}`}>
                <div className={`p-6 border-b flex justify-between items-start ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg overflow-hidden border-2 border-white/10">
                            {userData.profilePic ? (
                                <img src={userData.profilePic} alt="Profile" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                            ) : (
                                userData.name ? userData.name[0].toUpperCase() : 'U'
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{userData.name}</h2>
                                {userData.username && <span className="text-xs text-slate-500">@{userData.username}</span>}
                            </div>
                            <p className="text-sm text-slate-500">{userData.email || "Richr User"}</p>
                            <div className="flex gap-2 mt-2">
                                <span className="text-[10px] px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">{userData.goal || "Saver"}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-500"><X size={20}/></button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    <div className={`w-48 p-4 border-r space-y-2 ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
                        <button onClick={() => setActiveTab('calculators')} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'calculators' ? 'bg-emerald-500/10 text-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}><Calculator size={16}/> Tools</button>
                        <button onClick={() => setActiveTab('subscriptions')} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'subscriptions' ? 'bg-emerald-500/10 text-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}><Repeat size={16}/> Subscriptions</button>
                        <button onClick={() => setActiveTab('profile')} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'profile' ? 'bg-emerald-500/10 text-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}><UserCircle size={16}/> Edit Profile</button>
                        <button onClick={() => setActiveTab('settings')} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-emerald-500/10 text-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}><Settings size={16}/> Settings</button>
                        <div className="pt-4 mt-4 border-t border-slate-800/50">
                            <button onClick={onLogout} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 flex items-center gap-2"><LogOut size={16}/> Logout</button>
                        </div>
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                        {activeTab === 'calculators' && (
                            <div><h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Financial Calculators</h3><Calculators isDark={isDark} /></div>
                        )}
                        {activeTab === 'subscriptions' && (
                             <div><h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Subscription Manager</h3><SubscriptionsManager userId={userId} isDark={isDark} /></div>
                        )}
                        {activeTab === 'profile' && (
                             <div className="space-y-4">
                                <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Edit Financial Profile</h3>
                                <div><label className="text-xs text-slate-500">Username</label><input type="text" value={editData.username || ''} onChange={e => setEditData({...editData, username: e.target.value.toLowerCase().replace(/\s+/g, '')})} className={`w-full p-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300'}`} /></div>
                                <div><label className="text-xs text-slate-500">Profile Pic URL</label><input type="text" value={editData.profilePic || ''} onChange={e => setEditData({...editData, profilePic: e.target.value})} className={`w-full p-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300'}`} /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs text-slate-500">Monthly Income</label><input type="number" value={editData.income} onChange={e => setEditData({...editData, income: parseFloat(e.target.value)})} className={`w-full p-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300'}`} /></div>
                                    <div><label className="text-xs text-slate-500">Fixed Expenses</label><input type="number" value={editData.expenses} onChange={e => setEditData({...editData, expenses: parseFloat(e.target.value)})} className={`w-full p-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300'}`} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs text-slate-500">Total Debt</label><input type="number" value={editData.debt} onChange={e => setEditData({...editData, debt: parseFloat(e.target.value)})} className={`w-full p-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300'}`} /></div>
                                    <div><label className="text-xs text-slate-500">Total Assets</label><input type="number" value={editData.assets} onChange={e => setEditData({...editData, assets: parseFloat(e.target.value)})} className={`w-full p-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300'}`} /></div>
                                </div>
                                <div><label className="text-xs text-slate-500">Goal</label><input type="text" value={editData.goal} onChange={e => setEditData({...editData, goal: e.target.value})} className={`w-full p-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300'}`} /></div>
                                <Button onClick={handleProfileUpdate} className="w-full">Update Profile</Button>
                             </div>
                        )}
                        {activeTab === 'settings' && (
                            <div className="space-y-6">
                                <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>App Settings</h3>
                                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-700/50">
                                    <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Appearance</span>
                                    <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-slate-700 text-yellow-400' : 'bg-gray-200 text-slate-600'}`}>{isDark ? <Sun size={20} /> : <Moon size={20} />}</button>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 block mb-2">Gemini API Key</label>
                                    <input type="password" value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} className={`w-full p-3 rounded-xl outline-none ${isDark ? 'bg-slate-800 text-white border-slate-700' : 'bg-gray-50 border-gray-200'}`} placeholder="AIza..." />
                                    <Button onClick={onSaveSettings} className="mt-4 w-full">Save Key</Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
             </div>
        </div>
    );
};

const ChatBot = ({ userData, transactions, geminiKey, isDark, onClose }) => {
    const [messages, setMessages] = useState([{ role: 'ai', text: `Hi ${userData.name || 'there'}! I'm Richr. Ask me about your spending trends, budget advice, or specific transaction details.` }]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const scrollRef = useRef(null);
    useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);
    const handleSend = async (e) => {
        e.preventDefault(); if (!input.trim()) return;
        const userMsg = { role: 'user', text: input }; setMessages(prev => [...prev, userMsg]); setInput(''); setIsThinking(true);
        const context = getFinancialContext(transactions, userData);
        let replyText = "I'm having trouble analyzing right now.";
        if (geminiKey) {
            const prompt = `Role: Expert Financial Advisor Chatbot. Context: ${context}. User Question: "${userMsg.text}". Task: Analyze user data deeply. Answer the question. Provide actionable advice. Keep it under 4 sentences.`;
            const aiResponse = await callGeminiFlash(geminiKey, prompt);
            if (aiResponse) replyText = aiResponse;
        } else { replyText = "Please enable Gemini API for insights."; }
        setMessages(prev => [...prev, { role: 'ai', text: replyText }]); setIsThinking(false);
    };
    return (
        <div className={`fixed bottom-24 right-6 w-80 md:w-96 h-[500px] rounded-2xl shadow-2xl flex flex-col z-50 border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
            <div className={`p-4 border-b flex justify-between items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-indigo-600 border-indigo-700'}`}><div className="flex items-center gap-2"><Bot size={20} className="text-white" /><span className="font-bold text-white">Richr Chat</span></div><button onClick={onClose} className="text-white/70 hover:text-white"><X size={18}/></button></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>{messages.map((m, i) => (<div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user' ? (isDark ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-indigo-600 text-white rounded-br-none') : (isDark ? 'bg-slate-800 text-slate-200 rounded-bl-none' : 'bg-gray-100 text-gray-800 rounded-bl-none')}`}>{m.text}</div></div>))}{isThinking && <div className="flex justify-start"><div className={`p-3 rounded-2xl rounded-bl-none ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div></div>}</div>
            <form onSubmit={handleSend} className={`p-3 border-t flex gap-2 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'}`}><input className={`flex-1 px-4 py-2 rounded-full text-sm outline-none border ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-emerald-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500'}`} placeholder="Ask insights..." value={input} onChange={(e) => setInput(e.target.value)} /><button type="submit" className={`p-2 rounded-full ${isDark ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}><Send size={18} /></button></form>
        </div>
    );
};

const ConsistencyHeatmap = ({ transactions, isDark, onDateClick, selectedDate }) => {
  const monthsData = useMemo(() => {
    const today = new Date();
    const result = [];
    for (let i = 3; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthName = d.toLocaleString('default', { month: 'short' });
        const year = d.getFullYear();
        const daysInMonth = [];
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        for(let j=0; j<monthStart.getDay(); j++) daysInMonth.push(null);
        for(let j=1; j<=monthEnd.getDate(); j++) {
            const current = new Date(d.getFullYear(), d.getMonth(), j);
            if (current <= today || i > 0) daysInMonth.push(formatDate(current));
        }
        result.push({ name: `${monthName} '${year.toString().slice(-2)}`, days: daysInMonth });
    }
    return result;
  }, []);
  const dataMap = useMemo(() => { const map = {}; transactions.forEach(tx => { if (tx.category === 'Expense') map[tx.dateStr] = (map[tx.dateStr] || 0) + tx.amount; }); return map; }, [transactions]);
  const getColor = (dateStr) => { if (!dateStr) return "invisible"; const amount = dataMap[dateStr] || 0; if (amount === 0) return isDark ? "bg-slate-800" : "bg-gray-200"; if (amount < 500) return "bg-emerald-900"; if (amount < 2000) return "bg-emerald-600"; return "bg-emerald-400"; };
  return (
    <div className={`mt-4 p-4 rounded-xl border w-full overflow-x-auto custom-scrollbar ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
       <div className="flex gap-6 min-w-max">{monthsData.map((m, idx) => (<div key={idx} className="flex flex-col gap-2"><span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>{m.name}</span><div className="grid grid-cols-7 gap-1">{m.days.map((d, i) => (<div key={i} title={d ? `${d}: ₹${dataMap[d]||0}` : ''} onClick={() => d && onDateClick(d)} className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[1px] ${getColor(d)} transition-all hover:scale-125 cursor-pointer ${selectedDate === d ? 'ring-2 ring-white z-10' : ''}`}/>))}</div></div>))}</div>
       <div className={`flex gap-2 items-center text-[10px] mt-3 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}><span>Less</span><div className={`w-2 h-2 ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`}></div><div className="w-2 h-2 bg-emerald-900"></div><div className="w-2 h-2 bg-emerald-600"></div><div className="w-2 h-2 bg-emerald-400"></div><span>More</span></div>
    </div>
  );
};

const BudgetPieChart = ({ transactions, isDark }) => {
    const currentMonthStr = getMonthStr(new Date());
    const data = useMemo(() => {
        const buckets = { Need: 0, Want: 0, Investment: 0 };
        transactions.filter(t => t.monthStr === currentMonthStr && t.category === 'Expense').forEach(t => {
            const type = t.typeClass || guessBudgetCategory(t.tag);
            if (buckets[type] !== undefined) buckets[type] += t.amount; else buckets['Want'] += t.amount;
        });
        return buckets;
    }, [transactions, currentMonthStr]);
    const total = Object.values(data).reduce((a,b) => a+b, 0) || 1;
    const needEnd = (data.Need / total) * 100; const wantEnd = needEnd + (data.Want / total) * 100;
    return (
        <div className={`mt-4 p-6 rounded-xl border w-full flex items-center justify-around ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
            <div className="relative w-32 h-32 rounded-full shadow-lg" style={{ background: `conic-gradient(#10b981 0% ${needEnd}%, #f59e0b ${needEnd}% ${wantEnd}%, #3b82f6 ${wantEnd}% 100%)` }}><div className={`absolute inset-4 rounded-full flex items-center justify-center flex-col ${isDark ? 'bg-slate-900' : 'bg-white'}`}><span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total</span><span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>₹{total.toLocaleString()}</span></div></div>
            <div className="flex flex-col gap-3 text-sm"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></div><span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Needs: ₹{data.Need.toLocaleString()}</span></div><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></div><span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Wants: ₹{data.Want.toLocaleString()}</span></div><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div><span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Invest: ₹{data.Investment.toLocaleString()}</span></div></div>
        </div>
    );
};

// --- Main App ---

export default function RichrApp() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('loading'); 
  const [authMode, setAuthMode] = useState('login');
  
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Auth Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Data
  const [userData, setUserData] = useState({ name: '', age: '', income: 0, expenses: 0, goal: '', currentSavings: 0, debt: 0, assets: 0, username: '', profilePic: '' });
  const [transactions, setTransactions] = useState([]);
  
  // UI State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState('profile');
  const [geminiKey, setGeminiKey] = useState('AIzaSyC0xqx7bHkhUM6ZHZYXErtRPWJd_sCnIlY');
  
  // Dashboard Utils
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedDate, setSelectedDate] = useState(null); 
  const [dashboardViewMode, setDashboardViewMode] = useState('heatmap');
  
  // Quote State
  const [showQuote, setShowQuote] = useState(true);
  const dailyQuote = useMemo(() => getDailyQuote(), []);
  
  // Forms & Modals
  const [manualFormData, setManualFormData] = useState({ name: '', age: '', income: '', expenses: '', goal: '', currentSavings: '', debt: '', assets: '' });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTransType, setNewTransType] = useState('expense');
  const [txDate, setTxDate] = useState(formatDate(new Date())); 
  const [isRecurring, setIsRecurring] = useState(false);
  const [newTransClass, setNewTransClass] = useState('Want'); 

  // --- URL HISTORY UPDATE ---
  useEffect(() => {
    if (userData.username) {
        window.history.pushState({}, '', `/${userData.username}`);
    }
  }, [userData.username]);

  // --- Auth Listener ---
  useEffect(() => {
    let unsubProfile;
    let unsubTrans;

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        if (view === 'auth') setView('loading'); 
        
        // Listen to Profile
        unsubProfile = onSnapshot(doc(db, 'artifacts', appId, 'users', u.uid, 'profile', 'main'), (snap) => {
          if (snap.exists()) {
            setUserData(snap.data());
            if(snap.data().geminiKey) setGeminiKey(snap.data().geminiKey);
            setView('dashboard');
            checkAndProcessSubscriptions(u.uid);
          } else {
            setView('setup');
          }
        });

        // Listen to Transactions
        unsubTrans = onSnapshot(collection(db, 'artifacts', appId, 'users', u.uid, 'transactions'), (snap) => {
          const txs = snap.docs.map(d => ({id: d.id, ...d.data()}));
          txs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
          setTransactions(txs);
        });
      } else {
        setUser(null);
        setView('auth');
        setUserData({});
        setTransactions([]);
        if(unsubProfile) unsubProfile();
        if(unsubTrans) unsubTrans();
      }
    });

    return () => {
        unsubscribe();
        if(unsubProfile) unsubProfile();
        if(unsubTrans) unsubTrans();
    };
  }, []);

  const checkAndProcessSubscriptions = async (uid) => {
      const subsRef = collection(db, 'artifacts', appId, 'users', uid, 'subscriptions');
      try {
          const snap = await getDocs(subsRef);
          const today = new Date();
          const currentMonthStr = getMonthStr(today);
          const currentDay = today.getDate();
          snap.forEach(async (docSnap) => {
              const sub = docSnap.data();
              if (sub.lastProcessedMonth !== currentMonthStr && currentDay >= sub.day) {
                  const subDate = new Date(today.getFullYear(), today.getMonth(), sub.day);
                  await addDoc(collection(db, 'artifacts', appId, 'users', uid, 'transactions'), { title: sub.title, amount: parseFloat(sub.amount), category: 'Expense', tag: sub.tag, typeClass: sub.typeClass || 'Need', dateStr: formatDate(subDate), monthStr: currentMonthStr, yearStr: getYearStr(today), isAuto: true, createdAt: serverTimestamp() });
                  await updateDoc(doc(db, 'artifacts', appId, 'users', uid, 'subscriptions', docSnap.id), { lastProcessedMonth: currentMonthStr });
              }
          });
      } catch (e) { console.error(e); }
  };

  // --- Handlers ---
  const handleAuthSubmit = async (e) => { e.preventDefault(); setErrorMsg(''); setIsSubmitting(true); try { if (authMode === 'login') await signInWithEmailAndPassword(auth, email, password); else await createUserWithEmailAndPassword(auth, email, password); } catch (err) { setErrorMsg(err.message); setIsSubmitting(false); } };
  const handleGoogleAuth = async () => { setErrorMsg(''); setIsSubmitting(true); try { await signInWithPopup(auth, googleProvider); } catch (err) { setErrorMsg("Google Sign-In Error."); console.error(err); setIsSubmitting(false); } };
  const handleGuestLogin = async () => { setErrorMsg(''); setIsSubmitting(true); try { await signInAnonymously(auth); } catch (err) { console.error(err); setErrorMsg("Guest Auth failed."); setIsSubmitting(false); } };
  
  const handleLogout = async () => {
    try {
        setUser(null);
        setView('auth');
        setUserData({});
        setTransactions([]);
        setIsProfileOpen(false);
        await signOut(auth);
    } catch (error) {
        console.error("Logout error", error);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!manualFormData.name || !manualFormData.income) return;
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main'), {
        name: manualFormData.name, 
        age: manualFormData.age, 
        income: parseFloat(manualFormData.income), 
        expenses: parseFloat(manualFormData.expenses), 
        goal: manualFormData.goal,
        currentSavings: parseFloat(manualFormData.currentSavings) || 0,
        debt: parseFloat(manualFormData.debt) || 0,
        assets: parseFloat(manualFormData.assets) || 0,
        geminiKey: geminiKey,
        username: manualFormData.name.toLowerCase().replace(/\s+/g, '')
    });
  };
  
  const handleUpdateProfile = async (newData) => { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main'), newData, { merge: true }); };
  const saveSettings = async () => { await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'main'), { geminiKey: geminiKey }); };
  const addTransaction = async (title, amount, type, category, dateValue, recurring, typeClass) => { const d = new Date(dateValue); await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'), { title, amount: parseFloat(amount), category: type === 'expense' ? 'Expense' : 'Income', tag: category || 'General', typeClass, createdAt: serverTimestamp(), dateStr: dateValue, monthStr: getMonthStr(d), yearStr: getYearStr(d) }); if (recurring && type === 'expense') { await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'subscriptions'), { title, amount: parseFloat(amount), tag: category || 'General', typeClass, day: d.getDate(), lastProcessedMonth: getMonthStr(d), createdAt: serverTimestamp() }); alert(`Subscription set!`); } setIsAddModalOpen(false); setTxDate(formatDate(new Date())); setIsRecurring(false); };
  const deleteTransaction = async (id) => { if(!window.confirm("Delete?")) return; await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'transactions', id)); };
  const exportData = () => { const headers = ["Date", "Type", "Title", "Amount", "Tag", "Class"]; const rows = transactions.map(t => [t.dateStr, t.category, t.title, t.amount, t.tag, t.typeClass]); const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n"); const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `richr.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); };

  const stats = useMemo(() => {
    const today = formatDate(new Date()); const month = getMonthStr(new Date());
    const calc = (filterFn) => transactions.filter(tx => tx.category === 'Expense' && filterFn(tx)).reduce((acc, curr) => acc + curr.amount, 0);
    return { daily: calc(tx => tx.dateStr === today), monthly: calc(tx => tx.monthStr === month) };
  }, [transactions]);
  const budgetHealth = useMemo(() => userData.income ? Math.min((stats.monthly / userData.income) * 100, 100) : 0, [stats.monthly, userData.income]);

  // --- FILTERING LOGIC ---
  const filteredTransactions = useMemo(() => {
      let filtered = transactions.filter(t => categoryFilter === 'All' || t.tag === categoryFilter || (categoryFilter === 'Income' && t.category === 'Income'));
      if (selectedDate) {
          filtered = filtered.filter(t => t.dateStr === selectedDate);
      }
      return filtered;
  }, [transactions, categoryFilter, selectedDate]);

  const groupedTransactions = useMemo(() => {
      const groups = {};
      filteredTransactions.forEach(tx => {
          if (!groups[tx.dateStr]) groups[tx.dateStr] = { date: tx.dateStr, total: 0, items: [] };
          groups[tx.dateStr].items.push(tx);
          if(tx.category === 'Expense') groups[tx.dateStr].total += tx.amount;
      });
      return Object.values(groups).sort((a,b) => new Date(b.date) - new Date(a.date));
  }, [filteredTransactions]);
  
  const daySummary = useMemo(() => {
      if (!selectedDate) return null;
      const income = filteredTransactions.filter(t => t.category === 'Income').reduce((a,b)=>a+b.amount,0);
      const expense = filteredTransactions.filter(t => t.category === 'Expense').reduce((a,b)=>a+b.amount,0);
      return { income, expense };
  }, [filteredTransactions, selectedDate]);

  // --- VIEWS ---
  if (view === 'loading') return <div className={`min-h-screen flex flex-col gap-4 items-center justify-center ${isDarkMode ? 'bg-slate-950 text-emerald-500' : 'bg-gray-50 text-emerald-600'}`}><Loader2 className="w-10 h-10 animate-spin" /><p className="text-sm">Initializing...</p></div>;

  if (view === 'auth') return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden ${isDarkMode ? 'bg-slate-950' : 'bg-gray-50'}`}>
       <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]"></div>
       {/* QUOTE NOW INTERACTIVE */}
       <QuoteBanner quote={getDailyQuote()} isVisible={showQuote} onClose={() => setShowQuote(false)} onShow={() => setShowQuote(true)} isDark={isDarkMode} />
      <Card className="w-full max-w-md z-10 animate-fade-in-up mt-4" isDark={isDarkMode}>
        <Activity className="w-12 h-12 text-emerald-500 mx-auto mb-6" />
        <h2 className={`text-2xl font-bold text-center mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{authMode === 'login' ? 'Welcome Back' : 'Join Richr'}</h2>
        {errorMsg && <div className="bg-red-500/10 text-red-400 p-3 rounded-xl mb-4 text-sm flex gap-2"><AlertCircle size={16} />{errorMsg}</div>}
        <div className="space-y-4">
            <Button variant="white" className="w-full" onClick={handleGoogleAuth} isLoading={isSubmitting}><Globe size={18} /> Continue with Google</Button>
            <div className="relative my-4"><div className="absolute inset-0 flex items-center"><div className={`w-full border-t ${isDarkMode ? 'border-slate-800' : 'border-gray-200'}`}></div></div><div className="relative flex justify-center text-xs uppercase"><span className={`px-2 ${isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-white text-gray-500'}`}>Or use email</span></div></div>
            <form onSubmit={handleAuthSubmit} className="space-y-4">
            <input type="email" placeholder="Email" className={`w-full p-3 rounded-xl focus:border-emerald-500 focus:outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-slate-900'}`} value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" className={`w-full p-3 rounded-xl focus:border-emerald-500 focus:outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-slate-900'}`} value={password} onChange={e => setPassword(e.target.value)} required />
            <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>{authMode === 'login' ? 'Login' : 'Create Account'}</Button>
            </form>
        </div>
        <div className="flex justify-center mt-4"><button type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setErrorMsg(''); }} className="text-slate-400 text-sm hover:text-emerald-400">{authMode === 'login' ? "New here? Create Account" : "Have an account? Login"}</button></div>
        <Button variant="secondary" className="w-full mt-6" onClick={handleGuestLogin} isLoading={isSubmitting} isDark={isDarkMode}>{isSubmitting ? "Creating Guest Session..." : "Continue as Guest"}</Button>
      </Card>
      
      {/* Bulb Trigger for Auth Page */}
      {!showQuote && (
         <div className="fixed top-4 left-4 z-50">
             <button onClick={() => setShowQuote(true)} className={`p-2 rounded-full transition-colors shadow-lg ${isDarkMode ? 'bg-slate-800 text-indigo-400' : 'bg-white text-indigo-600'}`}><Lightbulb size={20} /></button>
         </div>
      )}
    </div>
  );

  if (view === 'setup') return (
    <div className={`min-h-screen flex items-center justify-center p-6 ${isDarkMode ? 'bg-slate-950' : 'bg-gray-50'}`}>
      <Card className="w-full max-w-lg" isDark={isDarkMode}>
        <div className="flex justify-between items-center mb-6">
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Complete Profile</h2>
            <button onClick={handleLogout} className="text-red-400 hover:text-red-300 flex items-center gap-1 text-sm"><LogOut size={16}/> Logout</button>
        </div>
        <p className="text-sm text-slate-500 mb-6">To help Richr give you the best insights.</p>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div><label className="block text-xs text-slate-400 mb-1">Full Name</label><input type="text" required className={`w-full p-3 rounded-xl focus:border-emerald-500 focus:outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-slate-900'}`} value={manualFormData.name} onChange={e => setManualFormData({...manualFormData, name: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-slate-400 mb-1">Age</label><input type="number" required className={`w-full p-3 rounded-xl focus:border-emerald-500 focus:outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-slate-900'}`} value={manualFormData.age} onChange={e => setManualFormData({...manualFormData, age: e.target.value})} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Monthly Income (₹)</label><input type="number" required className={`w-full p-3 rounded-xl focus:border-emerald-500 focus:outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-slate-900'}`} value={manualFormData.income} onChange={e => setManualFormData({...manualFormData, income: e.target.value})} /></div>
            </div>
            <div><label className="block text-xs text-slate-400 mb-1">Est. Fixed Monthly Expenses</label><input type="number" className={`w-full p-3 rounded-xl focus:border-emerald-500 focus:outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-slate-900'}`} value={manualFormData.expenses} onChange={e => setManualFormData({...manualFormData, expenses: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs text-slate-400 mb-1">Total Debt</label><input type="number" className={`w-full p-3 rounded-xl focus:border-emerald-500 focus:outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-slate-900'}`} value={manualFormData.debt} onChange={e => setManualFormData({...manualFormData, debt: e.target.value})} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Total Assets</label><input type="number" className={`w-full p-3 rounded-xl focus:border-emerald-500 focus:outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-slate-900'}`} value={manualFormData.assets} onChange={e => setManualFormData({...manualFormData, assets: e.target.value})} /></div>
            </div>
            <div><label className="block text-xs text-slate-400 mb-1">Primary Financial Goal</label><input type="text" placeholder="e.g. Buy a Car, Early Retirement" className={`w-full p-3 rounded-xl focus:border-emerald-500 focus:outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-slate-900'}`} value={manualFormData.goal} onChange={e => setManualFormData({...manualFormData, goal: e.target.value})} /></div>
            <Button type="submit" className="w-full mt-4">Save & Start Dashboard</Button>
        </form>
      </Card>
    </div>
  );

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-200' : 'bg-gray-50 text-slate-800'}`}>
      <nav className={`p-4 border-b flex justify-between items-center sticky top-0 backdrop-blur-md z-30 ${isDarkMode ? 'bg-slate-950/90 border-slate-800' : 'bg-white/90 border-gray-200'}`}>
        <div className="flex-1 flex justify-start items-center gap-2">
            {!showQuote && (
                <button onClick={() => setShowQuote(true)} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'text-indigo-400 hover:bg-slate-800' : 'text-indigo-600 hover:bg-gray-100'}`}>
                    <Lightbulb size={20} />
                </button>
            )}
        </div>
        <div className="flex-none flex items-center gap-2">
            <Activity className="text-emerald-500" />
            <span className={`font-bold text-xl ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Richr</span>
        </div>
        <div className="flex-1 flex justify-end items-center gap-4">
            <button onClick={() => { setProfileInitialTab('profile'); setIsProfileOpen(true); }} className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold shadow-md hover:scale-105 transition-transform overflow-hidden">
                {userData.profilePic ? <img src={userData.profilePic} alt="Profile" className="w-full h-full object-cover" /> : (userData.name ? userData.name[0].toUpperCase() : 'U')}
            </button>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto p-6">
        <QuoteBanner quote={getDailyQuote()} isVisible={showQuote} onClose={() => setShowQuote(false)} onShow={() => setShowQuote(true)} isDark={isDarkMode} />
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="col-span-1 bg-gradient-to-br from-emerald-900/40 to-slate-800" isDark={isDarkMode}>
                <p className={`text-xs mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Monthly Budget</p>
                <div className="flex justify-between items-end mb-2"><h3 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>₹{stats.monthly.toLocaleString()}</h3><span className="text-xs text-slate-400">/ ₹{userData.income?.toLocaleString()}</span></div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}><div className={`h-full rounded-full transition-all duration-1000 ${budgetHealth > 90 ? 'bg-red-500' : budgetHealth > 75 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${budgetHealth}%` }}></div></div>
            </Card>
            <Card className="col-span-1 md:col-span-3 flex flex-col justify-between" isDark={isDarkMode}>
                <div className="flex items-center justify-between w-full mb-2">
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}><Target className="text-emerald-400" size={18} /> Overview</h3>
                    <div className="flex bg-slate-800 rounded-lg p-1">
                        <button onClick={() => setDashboardViewMode('heatmap')} className={`px-3 py-1 rounded-md text-xs transition-all ${dashboardViewMode === 'heatmap' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}><LayoutGrid size={14} /></button>
                        <button onClick={() => setDashboardViewMode('pie')} className={`px-3 py-1 rounded-md text-xs transition-all ${dashboardViewMode === 'pie' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}><PieIcon size={14} /></button>
                    </div>
                </div>
                <div className="w-full">
                    {dashboardViewMode === 'heatmap' ? (
                        <ConsistencyHeatmap 
                            transactions={transactions} 
                            isDark={isDarkMode} 
                            onDateClick={setSelectedDate} 
                            selectedDate={selectedDate} 
                        />
                    ) : (
                        <BudgetPieChart transactions={transactions} isDark={isDarkMode} />
                    )}
                </div>
            </Card>
        </div>

        {/* Day Summary Banner */}
        {selectedDate && daySummary && (
            <div className={`mb-6 p-4 rounded-xl border flex justify-between items-center animate-fade-in ${isDarkMode ? 'bg-slate-900/80 border-slate-700' : 'bg-white border-gray-200'}`}>
                <div>
                    <h4 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Summary for {new Date(selectedDate).toDateString()}</h4>
                    <div className="flex gap-4 text-xs mt-1">
                        <span className="text-emerald-500">Income: +₹{daySummary.income}</span>
                        <span className="text-red-500">Expense: -₹{daySummary.expense}</span>
                    </div>
                </div>
                <button onClick={() => setSelectedDate(null)} className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors">Clear Filter</button>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <Card className="h-full min-h-[500px]" isDark={isDarkMode}>
                    <div className="flex justify-between items-center mb-6"><h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Transactions</h3>
                        <div className="flex items-center gap-2"><Filter size={14} className="text-slate-500" /><select className={`border text-xs p-1 rounded-md focus:outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-slate-800'}`} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                            <option value="All">All Categories</option>
                            {DEFAULT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select></div>
                    </div>
                    {/* Transaction List */}
                    <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                        {groupedTransactions.map(group => (
                            <div key={group.date}>
                                <div className={`sticky top-0 z-10 py-1 px-3 mb-2 text-xs font-bold uppercase tracking-wider flex justify-between rounded ${isDarkMode ? 'bg-slate-800/80 text-slate-400 backdrop-blur-md' : 'bg-gray-100 text-gray-500'}`}>
                                    <span>{new Date(group.date).toDateString()}</span>
                                    <span>Total: ₹{group.total.toLocaleString()}</span>
                                </div>
                                <div className="space-y-3">
                                    {group.items.map((tx) => (
                                        <div key={tx.id} className={`group flex justify-between items-center p-4 rounded-xl transition-all border ${isDarkMode ? 'border-transparent hover:bg-slate-800/80 hover:border-slate-700' : 'border-transparent hover:bg-gray-50 hover:border-gray-200'}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-xl ${tx.category === 'Expense' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>{tx.category === 'Expense' ? <CreditCard size={18} /> : <DollarSign size={18} />}</div>
                                                <div>
                                                    <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{tx.title}</p>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <span>{tx.tag}</span>
                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] border ${isDarkMode ? 'border-slate-700' : 'border-gray-300'}`}>{tx.typeClass || guessBudgetCategory(tx.tag)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4"><span className={`font-bold text-lg ${tx.category === 'Expense' ? (isDarkMode ? 'text-white' : 'text-slate-900') : 'text-emerald-500'}`}>{tx.category === 'Expense' ? '-' : '+'}₹{tx.amount.toLocaleString()}</span><button onClick={() => deleteTransaction(tx.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition-all"><Trash2 size={16} /></button></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
            <div className="lg:col-span-1">
                <Card className="sticky top-24 border-emerald-500/20 shadow-emerald-900/5" isDark={isDarkMode}><h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Quick Actions</h3><div className="space-y-3"><Button onClick={() => { setIsAddModalOpen(true); setNewTransType('expense'); }} variant="danger" icon={Plus} className="w-full justify-between group">Add Expense</Button><Button onClick={() => { setIsAddModalOpen(true); setNewTransType('income'); }} variant="primary" icon={Plus} className="w-full justify-between group">Add Income</Button></div></Card>
            </div>
        </div>
      </main>

      <Button variant="chat" onClick={() => setIsChatOpen(true)} icon={MessageSquare}>Chat with Richr</Button>
      {isChatOpen && <ChatBot userData={userData} transactions={transactions} geminiKey={geminiKey} isDark={isDarkMode} onClose={() => setIsChatOpen(false)} />}
      
      {isProfileOpen && <ProfileModal userData={userData} userId={user.uid} isDark={isDarkMode} onClose={() => setIsProfileOpen(false)} onSaveSettings={saveSettings} onLogout={handleLogout} geminiKey={geminiKey} setGeminiKey={setGeminiKey} setIsDarkMode={setIsDarkMode} onUpdateProfile={handleUpdateProfile} initialTab={profileInitialTab} />}

      {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <Card className="w-full max-w-md animate-fade-in-up" isDark={isDarkMode}>
                  <div className="flex justify-between items-center mb-6"><h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Add {newTransType === 'expense' ? 'Expense' : 'Income'}</h3><button onClick={() => setIsAddModalOpen(false)} className="text-slate-500 hover:text-emerald-500"><X /></button></div>
                  <div className="space-y-4">
                      <div><label className="text-xs text-slate-400 ml-1 mb-1 block">Description</label><input type="text" placeholder="e.g. Lunch" className={`w-full p-3 rounded-xl focus:border-emerald-500 focus:outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-slate-900'}`} id="tx_title" autoFocus /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs text-slate-400 ml-1 mb-1 block">Amount (₹)</label><input type="number" placeholder="0.00" className={`w-full p-3 rounded-xl focus:border-emerald-500 focus:outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-slate-900'}`} id="tx_amount" /></div>
                        <div><label className="text-xs text-slate-400 ml-1 mb-1 block">Category</label><select id="tx_tag" className={`w-full p-3 rounded-xl focus:border-emerald-500 focus:outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-slate-900'}`} onChange={(e) => setNewTransClass(guessBudgetCategory(e.target.value))}>
                            {DEFAULT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select></div>
                      </div>
                      
                      {newTransType === 'expense' && (
                          <div>
                              <label className="text-xs text-slate-400 ml-1 mb-1 block">Type</label>
                              <div className="flex gap-2">
                                  {['Need', 'Want', 'Investment'].map(type => (
                                      <button 
                                        key={type} 
                                        onClick={() => setNewTransClass(type)}
                                        className={`flex-1 py-2 text-xs rounded-lg border transition-all ${newTransClass === type ? 'bg-emerald-500 text-white border-emerald-500' : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-gray-100 border-gray-200 text-gray-600'}`}
                                      >
                                          {type}
                                      </button>
                                  ))}
                              </div>
                          </div>
                      )}

                      <div><label className="text-xs text-slate-400 ml-1 mb-1 block">Date</label><input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} className={`w-full p-3 rounded-xl focus:border-emerald-500 focus:outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-slate-900'}`} /></div>
                      {newTransType === 'expense' && (<div className={`flex items-center gap-2 p-3 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-200'}`}><input type="checkbox" id="recurring" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="w-4 h-4 accent-emerald-500" /><label htmlFor="recurring" className={`text-sm flex items-center gap-2 cursor-pointer select-none ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}><Repeat size={14} className="text-emerald-400" /> Repeat Monthly</label></div>)}
                      <Button className="w-full mt-2" onClick={() => { const t = document.getElementById('tx_title').value; const a = document.getElementById('tx_amount').value; const tag = document.getElementById('tx_tag').value; if (t && a) addTransaction(t, a, newTransType, tag, txDate, isRecurring, newTransClass); }}>Save Transaction</Button>
                  </div>
              </Card>
          </div>
      )}
    </div>
  );
}
