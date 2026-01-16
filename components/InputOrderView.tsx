import React, { useState, useEffect, useRef } from 'react';
import { Order, OrderStatus, OrderType, CatalogProduct, MARKETPLACE_LIST } from '../types';
import { ListPlus, Send, Search, ChevronDown, Check, Calendar, Hash, CircleUser, ShoppingBag, Truck } from 'lucide-react';

interface InputOrderViewProps {
  catalog: CatalogProduct[];
  onAddOrder: (order: Partial<Order>) => void;
}

const EXPEDITIONS = ['J&T Express', 'SPX', 'JNE', 'ANTERAJA', 'SICEPAT', 'LAINNYA / INPUT MANUAL'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'];
const DRAFT_KEY = 'erfolgs_input_draft';

const InputOrderView: React.FC<InputOrderViewProps> = ({ catalog, onAddOrder }) => {
  // Initialize from draft if exists
  const [formData, setFormData] = useState(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        return JSON.parse(savedDraft);
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }
    return {
      orderId: '',
      resi: '',
      productId: '',
      productName: '',
      size: 'L',
      quantity: 1,
      orderDate: new Date().toISOString().split('T')[0],
      expedition: 'J&T Express',
      marketplace: '',
      type: OrderType.PRE_ORDER,
      backName: '',
      backNumber: ''
    };
  });

  const [customExpedition, setCustomExpedition] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [isJersey, setIsJersey] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-save draft whenever formData changes
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProductSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCatalog = catalog.filter(p => 
    p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.orderId || !formData.marketplace || !formData.productName) {
      alert("ID Pesanan, Produk, dan Marketplace wajib diisi!");
      return;
    }

    const finalExpedition = formData.expedition === 'LAINNYA / INPUT MANUAL' 
      ? (customExpedition || 'Lainnya') 
      : formData.expedition;
    
    onAddOrder({
      ...formData,
      expedition: finalExpedition,
      status: formData.type === OrderType.STOCK ? OrderStatus.PENDING_PACKING : OrderStatus.PENDING_SETTING
    });

    // Clear draft on successful submit
    localStorage.removeItem(DRAFT_KEY);
    
    setFormData({
      orderId: '',
      resi: '',
      productId: '',
      productName: '',
      size: 'L',
      quantity: 1,
      orderDate: new Date().toISOString().split('T')[0],
      expedition: 'J&T Express',
      marketplace: '',
      type: OrderType.PRE_ORDER,
      backName: '',
      backNumber: ''
    });
    setCustomExpedition('');
    alert("Pesanan berhasil ditambahkan ke antrian produksi!");
  };

  const handleSelectProduct = (product: CatalogProduct) => {
    setFormData(prev => ({ ...prev, productId: product.id, productName: product.name }));
    setIsJersey(product.category.toLowerCase().includes('jersey'));
    setShowProductSearch(false);
    setProductSearchTerm('');
  };

  const triggerDatePicker = (e: React.MouseEvent<HTMLDivElement>) => {
    const input = e.currentTarget.querySelector('input');
    if (input && 'showPicker' in HTMLInputElement.prototype) {
      try {
        input.showPicker();
      } catch (err) {
        input.focus();
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-10 md:p-12 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 md:pb-8 border-b border-slate-50">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 flex-shrink-0">
              <ShoppingBag className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">Input Pesanan</h3>
              <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Draf disimpan otomatis di memori</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-2">
            <label className="text-[10px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">ID Pesanan / Invoice</label>
            <input 
              type="text" 
              value={formData.orderId}
              onChange={(e) => setFormData(prev => ({ ...prev, orderId: e.target.value }))}
              required
              className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50/50 outline-none text-sm md:text-base font-bold transition-all focus:border-blue-200"
              placeholder="Contoh: ERF-9922"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Nomor Resi</label>
            <input 
              type="text" 
              value={formData.resi}
              onChange={(e) => setFormData(prev => ({ ...prev, resi: e.target.value }))}
              className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50/50 outline-none text-sm md:text-base font-bold transition-all focus:border-blue-200"
              placeholder="Masukkan resi (jika ada)"
            />
          </div>
        </div>

        <div className="space-y-2 relative" ref={dropdownRef}>
          <label className="text-[10px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Cari Produk Katalog</label>
          <div 
            onClick={() => setShowProductSearch(!showProductSearch)}
            className={`w-full px-5 py-3.5 bg-slate-50 border-2 ${formData.productName ? 'border-blue-200 bg-white' : 'border-transparent'} rounded-2xl cursor-pointer flex justify-between items-center text-sm md:text-base transition-all hover:bg-white`}
          >
            <span className={formData.productName ? 'text-slate-900 font-extrabold' : 'text-slate-400'}>
              {formData.productName || 'Pilih jersey/kaos dari katalog...'}
            </span>
            <ChevronDown size={20} className={formData.productName ? 'text-blue-500' : 'text-slate-300'} />
          </div>

          {showProductSearch && (
            <div className="absolute z-50 mt-3 w-full bg-white border border-slate-200 shadow-2xl rounded-[1.5rem] overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    autoFocus
                    type="text"
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    placeholder="Ketik nama produk..."
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>
              <div className="max-h-64 md:max-h-72 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {filteredCatalog.length > 0 ? filteredCatalog.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => handleSelectProduct(p)}
                    className="p-3 hover:bg-blue-50 rounded-xl cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <img src={p.image} className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover shadow-sm" alt="" />
                      <div>
                        <p className="text-sm font-black text-slate-900">{p.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{p.category}</p>
                      </div>
                    </div>
                    {formData.productId === p.id && <Check size={20} className="text-blue-500" />}
                  </div>
                )) : (
                  <div className="p-6 text-center text-xs text-slate-400 font-bold">Produk tidak ditemukan</div>
                )}
                <div 
                  onClick={() => {
                    setFormData(prev => ({ ...prev, productId: 'custom', productName: productSearchTerm || 'Produk Custom' }));
                    setIsJersey(true);
                    setShowProductSearch(false);
                  }}
                  className="p-3 md:p-4 border-2 border-dashed border-slate-200 text-center rounded-xl text-[9px] md:text-[10px] font-black text-slate-400 hover:border-blue-400 hover:text-blue-600 cursor-pointer"
                >
                  + Gunakan Nama: "{productSearchTerm || 'Produk Custom'}"
                </div>
              </div>
            </div>
          )}
        </div>

        {(isJersey || formData.backName || formData.backNumber) && (
          <div className="bg-blue-50/40 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-blue-100/50 space-y-4 md:space-y-5">
             <div className="flex items-center gap-3">
               <div className="w-1 h-5 md:w-1.5 md:h-6 bg-blue-500 rounded-full"></div>
               <h4 className="text-[10px] md:text-[11px] font-black text-blue-800 uppercase tracking-[0.2em]">Kustom Nama & Nomor</h4>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
               <div className="space-y-2">
                 <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Punggung</label>
                 <input 
                   type="text" 
                   value={formData.backName}
                   onChange={(e) => setFormData(prev => ({ ...prev, backName: e.target.value.toUpperCase() }))}
                   className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm md:text-base font-black tracking-widest placeholder:font-medium placeholder:text-slate-300"
                   placeholder="NAMA PLAYER"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor Punggung</label>
                 <input 
                   type="text" 
                   maxLength={4}
                   value={formData.backNumber}
                   onChange={(e) => setFormData(prev => ({ ...prev, backNumber: e.target.value }))}
                   className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none text-sm md:text-base font-black placeholder:font-medium placeholder:text-slate-300"
                   placeholder="0000"
                 />
               </div>
             </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <div className="space-y-2">
            <label className="text-[10px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Ukuran (Size)</label>
            <select 
              value={formData.size}
              onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
              className="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl text-[10px] md:text-xs font-black cursor-pointer appearance-none focus:bg-white focus:border-blue-200 uppercase tracking-widest"
            >
              {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Jumlah (Qty)</label>
            <input 
              type="number" 
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              className="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-black focus:bg-white focus:border-blue-200"
            />
          </div>
          <div className="col-span-2 space-y-2">
            <label className="text-[10px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Tanggal Pesanan</label>
            <div 
              className="relative group"
              onClick={triggerDatePicker}
            >
              <input 
                type="date" 
                value={formData.orderDate}
                onChange={(e) => setFormData(prev => ({ ...prev, orderDate: e.target.value }))}
                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl text-[10px] md:text-xs font-black focus:bg-white focus:border-blue-200 uppercase tracking-widest outline-none block"
              />
              <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none group-hover:scale-110 transition-transform" size={18} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-2">
            <label className="text-[10px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Marketplace</label>
            <select 
              value={formData.marketplace}
              onChange={(e) => setFormData(prev => ({ ...prev, marketplace: e.target.value }))}
              required
              className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl text-[10px] md:text-xs font-black appearance-none focus:bg-white focus:border-blue-200 cursor-pointer uppercase tracking-widest"
            >
              <option value="">-- Pilih Marketplace --</option>
              {MARKETPLACE_LIST.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Kurir Ekspedisi</label>
            <div className="space-y-3">
              <select 
                value={formData.expedition}
                onChange={(e) => setFormData(prev => ({ ...prev, expedition: e.target.value }))}
                required
                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl text-[10px] md:text-xs font-black appearance-none focus:bg-white focus:border-blue-200 cursor-pointer uppercase tracking-widest"
              >
                {EXPEDITIONS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              
              {formData.expedition === 'LAINNYA / INPUT MANUAL' && (
                <div className="relative animate-in slide-in-from-top-1 duration-300">
                  <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={16} />
                  <input 
                    type="text"
                    autoFocus
                    placeholder="Ketik Nama Ekspedisi Manual..."
                    value={customExpedition}
                    onChange={(e) => setCustomExpedition(e.target.value.toUpperCase())}
                    className="w-full pl-12 pr-5 py-3.5 bg-white border-2 border-blue-100 rounded-2xl outline-none text-xs font-black uppercase tracking-widest focus:border-blue-500 transition-all"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Metode Pemenuhan Pesanan</label>
          <div className="flex flex-col sm:flex-row bg-slate-100 p-2 rounded-2xl gap-2 h-auto sm:h-[72px]">
            <button 
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, type: OrderType.PRE_ORDER }))}
              className={`flex-1 py-3 sm:py-0 flex flex-col items-center justify-center rounded-xl transition-all ${formData.type === OrderType.PRE_ORDER ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'}`}
            >
              <span className="text-[10px] md:text-xs font-black uppercase tracking-wider">PRODUKSI BARU (PO)</span>
              <span className="text-[8px] md:text-[9px] font-bold opacity-70 uppercase">Antri Setting & Cetak</span>
            </button>
            <button 
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, type: OrderType.STOCK }))}
              className={`flex-1 py-3 sm:py-0 flex flex-col items-center justify-center rounded-xl transition-all ${formData.type === OrderType.STOCK ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'}`}
            >
              <span className="text-[10px] md:text-xs font-black uppercase tracking-wider">AMBIL DARI STOK</span>
              <span className="text-[8px] md:text-[9px] font-bold opacity-70 uppercase">Langsung Tahap Packing</span>
            </button>
          </div>
        </div>

        <button 
          type="submit"
          className="w-full py-4 md:py-5 bg-blue-600 text-white rounded-2xl font-black text-base md:text-lg uppercase tracking-[0.2em] shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-4 active:scale-95"
        >
          <Send size={24} />
          SIMPAN KE DATABASE
        </button>
      </form>
    </div>
  );
};

export default InputOrderView;