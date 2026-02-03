
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calculator as CalcIcon, 
  History, 
  Trash2, 
  Plus, 
  Printer, 
  Square, 
  Hash, 
  X, 
  User, 
  ShoppingCart,
  Send,
  Lock,
  Sparkles,
  Layers,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Trash,
  Download,
  AlertCircle
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { GlassType, OrderItem, SavedOrder, ActiveInput } from './types';
import { INITIAL_GLASS_TYPES, ROUNDING_PRECISION, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, ORDER_PASSWORD } from './constants';
import Keypad from './components/Keypad';
// Import Receipt component for printing
import Receipt from './components/Receipt';

const Logo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={`${className} transition-transform duration-500 hover:rotate-12`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="15" y="15" width="33" height="33" rx="4" stroke="#4f46e5" strokeWidth="6" className="animate-pulse" />
    <rect x="52" y="15" width="33" height="33" rx="4" stroke="#06b6d4" strokeWidth="6" />
    <rect x="15" y="52" width="33" height="33" rx="4" stroke="#06b6d4" strokeWidth="6" />
    <rect x="52" y="52" width="33" height="33" rx="4" stroke="#4f46e5" strokeWidth="6" />
    <path d="M50 10V90" stroke="#4f46e5" strokeWidth="2" strokeDasharray="4 4" />
    <path d="M10 50H90" stroke="#4f46e5" strokeWidth="2" strokeDasharray="4 4" />
  </svg>
);

const App: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  const [catalog] = useState<GlassType[]>(INITIAL_GLASS_TYPES);
  const [currentGlass, setCurrentGlass] = useState<GlassType>(INITIAL_GLASS_TYPES[0]);
  const [height, setHeight] = useState<string>('0');
  const [width, setWidth] = useState<string>('0');
  const [quantity, setQuantity] = useState<string>('0');
  const [activeInput, setActiveInput] = useState<ActiveInput>('width');
  
  const [customerName, setCustomerName] = useState<string>('');
  const [currentItems, setCurrentItems] = useState<OrderItem[]>([]);
  const [archive, setArchive] = useState<SavedOrder[]>([]);
  const [view, setView] = useState<'calc' | 'archive'>('calc');
  const [addedAnimation, setAddedAnimation] = useState(false);
  const [printOrder, setPrintOrder] = useState<SavedOrder | null>(null);

  // Mandatory waste percent fixed at 3%
  const wastePercent = 3;

  useEffect(() => {
    const saved = localStorage.getItem('glass_calc_archive');
    if (saved) {
      try { setArchive(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  const handleKeyPress = useCallback((key: string) => {
    const setter = activeInput === 'height' ? setHeight : activeInput === 'width' ? setWidth : setQuantity;
    setter(prev => {
      if (key === '.' && prev.includes('.')) return prev;
      if (prev === '0' && key !== '.') return key;
      if (prev === '0' && key === '.') return '0.';
      return prev + key;
    });
  }, [activeInput]);

  const handleDelete = useCallback(() => {
    const setter = activeInput === 'height' ? setHeight : activeInput === 'width' ? setWidth : setQuantity;
    setter(prev => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
  }, [activeInput]);

  const addItem = useCallback(() => {
    const h = parseFloat(height);
    const w = parseFloat(width);
    const q = parseInt(quantity);
    if (!h || !w || !q) return;

    const area = (h * w / 10000) * q;
    const roundedArea = parseFloat(area.toFixed(ROUNDING_PRECISION));
    const newItem: OrderItem = {
      id: Math.random().toString(36).substr(2, 9),
      glassType: currentGlass,
      height: h,
      width: w,
      quantity: q,
      areaM2: roundedArea,
      totalPrice: roundedArea * currentGlass.pricePerM2
    };
    setCurrentItems(prev => [...prev, newItem]);
    setHeight('0'); setWidth('0'); setQuantity('0'); setActiveInput('width');
    
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 600);
  }, [height, width, quantity, currentGlass]);

  const handleNextInput = useCallback(() => {
    if (activeInput === 'width') {
      setActiveInput('height');
    } else if (activeInput === 'height') {
      setActiveInput('quantity');
    } else if (activeInput === 'quantity') {
      if (parseFloat(height) > 0 && parseFloat(width) > 0 && parseInt(quantity) > 0) {
        addItem();
      } else {
        setActiveInput('width');
      }
    }
  }, [activeInput, height, width, quantity, addItem]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (view !== 'calc') return;

      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === '.' || e.key === ',') {
        handleKeyPress('.');
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleNextInput();
      } else if (e.key === 'Escape') {
        const setter = activeInput === 'height' ? setHeight : activeInput === 'width' ? setWidth : setQuantity;
        setter('0');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress, handleDelete, handleNextInput, activeInput, view]);

  const handleAuthSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pinInput === ORDER_PASSWORD) {
      setShowAuthModal(false);
      setPinInput('');
      executeSaveOrder();
    } else {
      alert("Parol noto'g'ri!");
    }
  };

  const printInvoice = (order: SavedOrder) => {
    setPrintOrder(order);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const generateReceiptHTML = (order: SavedOrder) => {
    const date = new Date(order.timestamp).toLocaleString('uz-UZ');
    const grouped = order.items.reduce((acc, item) => {
      const key = item.glassType.name;
      if (!acc[key]) acc[key] = { items: [], area: 0, price: 0 };
      acc[key].items.push(item);
      acc[key].area += item.areaM2;
      acc[key].price += item.totalPrice;
      return acc;
    }, {} as Record<string, { items: OrderItem[], area: number, price: number }>);

    const baseArea = order.items.reduce((a, b) => a + b.areaM2, 0);
    const baseAmount = order.items.reduce((a, b) => a + b.totalPrice, 0);

    return `
      <div style="padding: 40px; font-family: 'JetBrains Mono', monospace; width: 800px; background: white; color: black; line-height: 1.2; box-sizing: border-box; border: 8px solid #000;">
        
        <div style="border-top: 6px solid #000; border-bottom: 6px solid #000; padding: 15px 0; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 24px; font-weight: 900; text-transform: uppercase;">MIJOZ: ${order.customerName || '—'}</div>
          <div style="font-size: 16px; font-weight: 800; text-align: right;">SANA: ${date}</div>
        </div>

        <div style="display: flex; font-weight: 900; font-size: 16px; border-bottom: 3px solid #000; padding-bottom: 5px; margin-bottom: 10px; background: #eee;">
          <span style="width: 30%;">O'LCHAM (ta)</span>
          <span style="width: 30%; border-left: 3px solid #000; border-right: 3px solid #000; text-align: center;">IZOH</span>
          <span style="width: 15%; border-right: 3px solid #000; text-align: center;">YUZA</span>
          <span style="width: 25%; text-align: right;">NARX</span>
        </div>

        ${Object.entries(grouped).map(([name, data]) => `
          <div style="margin-bottom: 20px;">
            <div style="font-weight: 900; font-size: 20px; margin-bottom: 10px; border-bottom: 4px solid #000; padding: 8px 10px; color: #000; background: #ddd; width: 100%; box-sizing: border-box;">${name}</div>
            <div style="width: 100%;">
              ${data.items.map(it => `
                <div style="display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #000;">
                  <span style="font-weight: 900; font-size: 18px; width: 30%;">${it.width} × ${it.height} = ${it.quantity}</span>
                  <span style="width: 30%; border-left: 2px solid #000; border-right: 2px solid #000; height: 30px;"></span>
                  <span style="font-weight: 900; font-size: 16px; width: 15%; color: #000; text-align: center; border-right: 2px solid #000;">${it.areaM2.toFixed(3)} m²</span>
                  <span style="font-weight: 900; font-size: 20px; width: 25%; text-align: right;">${Math.round(it.totalPrice).toLocaleString()}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}

        <div style="background: #f1f5f9; padding: 25px; border-radius: 15px; margin-top: 30px; border: 6px solid #000;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
             <span style="font-size: 18px; font-weight: 900; color: #000;">Sof yuza:</span>
             <span style="font-size: 18px; font-weight: 900;">${baseArea.toFixed(3)} m²</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; color: #dc2626;">
             <span style="font-size: 18px; font-weight: 900;">Atxot (+${order.wastePercent}%):</span>
             <span style="font-size: 18px; font-weight: 900;">+${(baseArea * order.wastePercent / 100).toFixed(3)} m²</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: baseline; border-top: 4px solid #000; margin-top: 15px; padding-top: 15px;">
            <span style="font-size: 20px; font-weight: 900; color: #000; text-transform: uppercase;">JAMI TO'LOV:</span>
            <span style="font-size: 64px; font-weight: 900; color: #4f46e5; letter-spacing: -3px;">${Math.round(order.totalAmount).toLocaleString()} <small style="font-size: 24px; color: #000;">SO'M</small></span>
          </div>
        </div>
        
        
      </div>
    `;
  };

  const downloadOrderImage = async (order: SavedOrder) => {
    setIsSending(true);
    const target = document.getElementById('capture-target');
    if (!target) return;
    target.innerHTML = generateReceiptHTML(order);
    try {
      const canvas = await html2canvas(target, { 
        scale: 1, 
        useCORS: true,
        backgroundColor: '#ffffff',
        width: 800,
      });
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `JJ_OK_${order.customerName || 'buyurtma'}_${order.id.slice(-4)}.png`;
      link.click();
    } catch (e) {
      alert("Rasm yuklashda xatolik!");
    } finally {
      setIsSending(false);
      target.innerHTML = '';
    }
  };

  const sendToTelegram = async (order: SavedOrder) => {
    setIsSending(true);
    const target = document.getElementById('capture-target');
    if (!target) return;
    target.innerHTML = generateReceiptHTML(order);

    try {
      const canvas = await html2canvas(target, { 
        scale: 1, 
        useCORS: true, 
        width: 800,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const imgBlob = await (await fetch(imgData)).blob();
      const pdf = new jsPDF('p', 'mm', 'a5');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const pdfBlob = pdf.output('blob');

      const caption = `📋 *YANGI BUYURTMA #${order.id.slice(-4).toUpperCase()}*\n👤 Mijoz: *${order.customerName || 'Noma\'lum'}*\n📊 Yuza (Atxotli): *${order.totalArea.toFixed(3)} m²*\n💰 Summa: *${Math.round(order.totalAmount).toLocaleString()} so'm*`;

      const photoForm = new FormData();
      photoForm.append('chat_id', TELEGRAM_CHAT_ID);
      photoForm.append('photo', imgBlob, `order.png`);
      photoForm.append('caption', caption);
      photoForm.append('parse_mode', 'Markdown');
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: 'POST', body: photoForm });

      const docForm = new FormData();
      docForm.append('chat_id', TELEGRAM_CHAT_ID);
      docForm.append('document', pdfBlob, `chek.pdf`);
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, { method: 'POST', body: docForm });
    } catch (e) {
      alert("Telegram xatosi!");
    } finally {
      setIsSending(false);
      target.innerHTML = '';
    }
  };

  const executeSaveOrder = async () => {
    if (!customerName.trim()) {
      alert("Iltimos, mijoz ismini yozing!");
      return;
    }
    const baseArea = currentItems.reduce((a, b) => a + b.areaM2, 0);
    const baseAmount = currentItems.reduce((a, b) => a + b.totalPrice, 0);
    
    const newOrder: SavedOrder = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      items: [...currentItems],
      totalAmount: baseAmount * (1 + wastePercent / 100),
      totalArea: baseArea * (1 + wastePercent / 100),
      wastePercent,
      customerName
    };
    await sendToTelegram(newOrder);
    setArchive(prev => [newOrder, ...prev]);
    localStorage.setItem('glass_calc_archive', JSON.stringify([newOrder, ...archive]));
    setCurrentItems([]);
    setCustomerName('');
  };

  const baseAmount = currentItems.reduce((acc, item) => acc + item.totalPrice, 0);
  const baseArea = currentItems.reduce((acc, item) => acc + item.areaM2, 0);
  const totalAmount = baseAmount * (1 + wastePercent / 100);
  const totalArea = baseArea * (1 + wastePercent / 100);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-mono text-slate-900 overflow-x-hidden">
      <nav className="no-print bg-slate-900 text-white w-full md:w-24 flex flex-row md:flex-col items-center py-3 md:py-10 px-4 md:px-0 sticky top-0 z-50 border-b md:border-b-0 md:border-r border-slate-800 shadow-2xl">
        <div className="flex-shrink-0 mb-0 md:mb-12">
          <Logo className="w-10 h-10 md:w-12 md:h-12" />
        </div>
        <div className="flex flex-row md:flex-col gap-4 md:gap-8 ml-auto md:ml-0">
          <button 
            onClick={() => setView('calc')}
            className={`p-3 rounded-2xl transition-all duration-300 flex flex-col items-center gap-1 ${view === 'calc' ? 'bg-indigo-600 shadow-lg shadow-indigo-500/40' : 'text-slate-500 hover:text-cyan-400'}`}
          >
            <CalcIcon className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Term</span>
          </button>
          <button 
            onClick={() => setView('archive')}
            className={`p-3 rounded-2xl transition-all duration-300 flex flex-col items-center gap-1 ${view === 'archive' ? 'bg-indigo-600 shadow-lg shadow-indigo-500/40' : 'text-slate-500 hover:text-cyan-400'}`}
          >
            <History className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Arxiv</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto pb-32 md:pb-8">
        {view === 'calc' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black tracking-tighter text-indigo-950 uppercase leading-none">Javlonbek-Jonibek O/K</h1>
                <p className="text-xs font-bold text-cyan-600 uppercase tracking-widest mt-1">Oyna Kesish Xizmati</p>
              </div>
              <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-indigo-50 text-indigo-600 transition-transform ${addedAnimation ? 'scale-125' : ''}`}>
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Savat:</div>
                  <div className="text-sm font-black text-slate-800">{Math.round(totalAmount).toLocaleString()} s.</div>
                </div>
              </div>
            </header>

            <section className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-4 text-xs font-black text-slate-400 uppercase tracking-widest">
                <Sparkles className="w-4 h-4 text-cyan-400" /> Shisha turi
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x">
                {catalog.map(g => (
                  <button 
                    key={g.id} 
                    onClick={() => setCurrentGlass(g)}
                    className={`flex-shrink-0 snap-start p-4 rounded-2xl border-2 transition-all duration-300 group ${currentGlass.id === g.id ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-50 bg-slate-50 hover:border-slate-200'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl mb-2 mx-auto ${g.colorClass} border border-white shadow-sm transition-transform group-hover:scale-110`} />
                    <div className="text-[10px] font-black uppercase text-center whitespace-nowrap">{g.name}</div>
                  </button>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white p-4 md:p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                  <div className="grid grid-cols-3 gap-2 md:gap-4 mb-8">
                    {[
                      { key: 'width', label: 'Eni', value: width, icon: Square },
                      { key: 'height', label: 'Bo\'yi', value: height, icon: Square, rot: true },
                      { key: 'quantity', label: 'Soni', value: quantity, icon: Hash }
                    ].map(f => (
                      <button 
                        key={f.key}
                        onClick={() => setActiveInput(f.key as ActiveInput)}
                        className={`p-3 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border-4 transition-all duration-300 relative overflow-hidden ${activeInput === f.key ? 'border-indigo-600 bg-white shadow-xl scale-[1.02]' : 'border-slate-50 bg-slate-50 hover:bg-white'}`}
                      >
                        <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2 text-slate-400">
                          <f.icon className={`w-3 h-3 md:w-4 md:h-4 ${f.rot ? 'rotate-90' : ''}`} />
                          <span className="text-[8px] md:text-[10px] font-black uppercase tracking-tighter whitespace-nowrap">{f.label}</span>
                        </div>
                        <div className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter">{f.value}</div>
                        {activeInput === f.key && <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-indigo-600 animate-pulse" />}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Keypad 
                      onKeyPress={handleKeyPress} 
                      onClear={() => (activeInput === 'height' ? setHeight('0') : activeInput === 'width' ? setWidth('0') : setQuantity('0'))} 
                      onDelete={handleDelete}
                      onNext={handleNextInput}
                    />
                    <div className="flex flex-col gap-4">
                      <div className="bg-slate-900 p-6 md:p-8 rounded-3xl text-white border-b-4 border-indigo-700 shadow-2xl flex-1 flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-600/20 blur-3xl rounded-full" />
                        <div className="text-[10px] font-bold text-cyan-400 uppercase mb-2">Joriy hisob:</div>
                        <div className="text-4xl font-black tracking-tighter mb-4">
                          {Math.round((parseFloat(height) * parseFloat(width) / 10000) * parseInt(quantity) * currentGlass.pricePerM2).toLocaleString()} <span className="text-sm opacity-40">s.</span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase">{currentGlass.name}</div>
                      </div>
                      <button 
                        onClick={addItem}
                        className={`w-full py-6 md:py-8 bg-indigo-600 text-white rounded-3xl font-black text-xl md:text-2xl shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 border-b-8 border-indigo-800 ${addedAnimation ? 'animate-bounce' : ''}`}
                      >
                        {addedAnimation ? <CheckCircle2 className="w-8 h-8" /> : <Plus className="w-8 h-8" />}
                        QO'SHISH
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <aside className="lg:col-span-5">
                <div className="bg-white rounded-[2.5rem] shadow-lg border border-slate-100 flex flex-col h-full sticky top-24 max-h-[calc(100vh-140px)] overflow-hidden">
                  <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-black text-slate-900 uppercase text-sm flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-indigo-600" /> Savat ({currentItems.length})
                    </h3>
                    {currentItems.length > 0 && (
                      <button onClick={() => { setCurrentItems([]); }} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash className="w-4 h-4" /></button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {currentItems.length === 0 ? (
                      <div className="py-20 text-center opacity-10 flex flex-col items-center gap-4">
                        <Layers className="w-16 h-16" />
                        <p className="text-xs font-black uppercase tracking-widest">Savatingiz bo'sh</p>
                      </div>
                    ) : (
                      currentItems.map((it) => (
                        <div key={it.id} className="bg-slate-50 p-4 rounded-2xl border border-transparent hover:border-indigo-100 hover:bg-white transition-all group flex justify-between items-center animate-in slide-in-from-right-4 duration-300">
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-black text-indigo-500 uppercase">{it.glassType.name}</p>
                            <p className="text-lg font-black text-slate-800 leading-none">{it.width} × {it.height} = {it.quantity}</p>
                            <p className="text-[9px] font-bold text-slate-400">{it.areaM2.toFixed(3)} m²</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-black text-slate-900 text-sm">{Math.round(it.totalPrice).toLocaleString()} s.</p>
                            </div>
                            <button onClick={() => setCurrentItems(p => p.filter(i => i.id !== it.id))} className="text-slate-300 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-6 bg-red-50 border-t border-red-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Majburiy Atxot</span>
                      </div>
                      <span className="bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full">{wastePercent}%</span>
                    </div>
                  </div>

                  <div className="p-6 md:p-8 bg-white border-t-2 border-slate-200 space-y-4">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center px-2 opacity-50">
                        <span className="text-[10px] font-black text-slate-900 uppercase">Sof Summa:</span>
                        <span className="text-sm font-black">{Math.round(baseAmount).toLocaleString()} s.</span>
                      </div>
                      <div className="flex justify-between items-center px-2">
                        <span className="text-xl font-black text-slate-900 uppercase">JAMI:</span>
                        <div className="text-right">
                          <div className="text-3xl font-black text-indigo-600 tabular-nums leading-none">{Math.round(totalAmount).toLocaleString()} s.</div>
                          <div className="text-[9px] font-bold text-slate-400 mt-1">{totalArea.toFixed(3)} m² (jami)</div>
                        </div>
                      </div>
                    </div>
                    <div className="relative group">
                      <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${customerName ? 'text-indigo-600' : 'text-red-400 animate-pulse'}`} />
                      <input 
                        type="text" 
                        placeholder="Mijoz ismi (MAJBURIY)..." 
                        value={customerName} 
                        onChange={e => setCustomerName(e.target.value)}
                        className={`w-full pl-12 pr-6 py-4 rounded-2xl border-2 outline-none text-sm font-black uppercase transition-all ${customerName ? 'bg-slate-50 border-transparent focus:border-indigo-600' : 'bg-red-50 border-red-200 focus:border-red-500'}`}
                      />
                    </div>
                    <button 
                      onClick={() => {
                        if (!customerName.trim()) {
                          alert("Mijoz ismini kiritishingiz shart!");
                          return;
                        }
                        setShowAuthModal(true);
                      }}
                      disabled={currentItems.length === 0 || !customerName.trim() || isSending}
                      className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-3 border-b-4 border-indigo-800"
                    >
                      <Send className="w-5 h-5" /> TAYYORLASH
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex justify-between items-center bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-lg"><History className="w-8 h-8" /></div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase text-indigo-950 leading-none">Buyurtmalar Tarixi</h2>
              </div>
            </header>
            
            <div className="grid grid-cols-1 gap-6 pb-20">
              {archive.length === 0 ? (
                <div className="py-40 text-center opacity-10 flex flex-col items-center gap-6">
                  <History className="w-32 h-32" />
                  <p className="text-xl font-black uppercase">Tarix hali bo'sh</p>
                </div>
              ) : (
                archive.map(o => (
                  <div key={o.id} className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-sm border border-slate-100 hover:shadow-xl transition-all group animate-in slide-in-from-bottom-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[10px] font-black text-indigo-400 uppercase">№{o.id.slice(-4).toUpperCase()}</p>
                          <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[8px] font-black rounded-full uppercase">Atxot +{o.wastePercent}%</span>
                        </div>
                        <h3 className="text-2xl md:text-4xl font-black text-slate-800 uppercase tracking-tighter">{o.customerName || '—'}</h3>
                        <p className="text-xs font-bold text-slate-300 mt-1">{new Date(o.timestamp).toLocaleString('uz-UZ')}</p>
                      </div>
                      <div className="flex gap-2 w-full md:w-auto">
                        <button onClick={() => downloadOrderImage(o)} className="flex-1 md:flex-none p-5 bg-cyan-50 text-cyan-600 rounded-2xl hover:bg-cyan-600 hover:text-white transition-all shadow-sm active:scale-95 flex flex-col items-center gap-1 w-full">
                          <Download className="w-5 h-5" />
                          <span className="text-[8px] font-black uppercase">Rasm yuklash</span>
                        </button>
                        
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t-2 border-slate-100 pt-8">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Jami Yuza (Atxotli)</p>
                        <p className="text-xl font-black text-slate-800">{o.totalArea.toFixed(3)} m²</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Jami Summa</p>
                        <p className="text-2xl md:text-4xl font-black text-indigo-600">{Math.round(o.totalAmount).toLocaleString()} <span className="text-sm opacity-40">s.</span></p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {showAuthModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl w-full max-w-md text-center space-y-8 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-white shadow-2xl relative group">
              <Lock className="w-10 h-10 transition-transform group-hover:scale-110" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">XAVFSIZLIK</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">PIN kodni kiriting</p>
            </div>
            <form onSubmit={handleAuthSubmit} className="space-y-6">
              <input 
                type="password" 
                autoFocus
                value={pinInput} 
                onChange={e => setPinInput(e.target.value)} 
                className="w-full px-6 py-6 rounded-3xl bg-slate-50 border-4 border-transparent focus:border-indigo-600 outline-none text-center text-4xl font-black tracking-[0.5em] transition-all"
                placeholder="****"
              />
              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => setShowAuthModal(false)} className="py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase transition-colors">YOPISH</button>
                <button type="submit" className="py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">TASDIQLASH</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isSending && (
        <div className="fixed inset-0 z-[200] bg-indigo-900/95 backdrop-blur-xl flex flex-col items-center justify-center text-white p-10 text-center space-y-8 animate-in fade-in">
          <div className="relative">
             <div className="w-24 h-24 border-8 border-white/20 border-t-cyan-400 rounded-full animate-spin"></div>
             <div className="absolute inset-0 flex items-center justify-center">
                <Send className="w-8 h-8 text-cyan-400 animate-pulse" />
             </div>
          </div>
          <div className="space-y-2">
            <p className="text-4xl font-black uppercase tracking-tighter">Iltimos, kuting...</p>
            <p className="text-cyan-400/60 font-bold uppercase tracking-widest text-xs">Fayllar tayyorlanmoqda</p>
          </div>
        </div>
      )}

      <div id="capture-target"></div>
      <div className="hidden print:block">
        <Receipt order={printOrder} />
      </div>
    </div>
  );
};

export default App;
