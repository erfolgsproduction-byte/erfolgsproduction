import React, { useState } from 'react';
import { Order, STATUS_LABELS, OrderStatus, ROLE_LABELS, OrderType, CatalogProduct, MARKETPLACE_LIST, UserRole } from '../types';
import { Search, History as HistoryIcon, X, User as UserIcon, Check, ImageIcon, Trash2, Edit3, Calendar, FileSpreadsheet, Printer, Hash, Info, Tag, UserPlus, ChevronDown, Activity, Clock, ShoppingBag, Package, AlertTriangle, Download, Filter, Truck, RotateCcw, Lock } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface OrderListViewProps {
  orders: Order[];
  catalog: CatalogProduct[];
  userRole: UserRole;
  onUpdateStatus: (orderId: string, nextStatus: OrderStatus, returnDate?: string) => Promise<void>;
  onDeleteOrder: (id: string) => void;
}

const OrderListView: React.FC<OrderListViewProps> = ({ orders, catalog, userRole, onUpdateStatus, onDeleteOrder }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    marketplace: '',
    type: '',
    startDate: '',
    endDate: '',
    onlyCustom: false,
    onlyUrgent: false
  });
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isUpdatingReturn, setIsUpdatingReturn] = useState(false);
  
  // Return Date Modal State
  const [returnDateModal, setReturnDateModal] = useState<{orderId: string, date: string} | null>(null);

  const isSuperAdmin = userRole === UserRole.SUPERADMIN;
  const todayStr = new Date().toISOString().split('T')[0];

  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    if (nextStatus === OrderStatus.RETURNED) {
      setReturnDateModal({ orderId, date: todayStr });
      setEditingStatusId(null);
      return;
    }
    try {
      await onUpdateStatus(orderId, nextStatus);
      setEditingStatusId(null);
    } catch (err) {
      // Error ditangani di App.tsx (alert)
    }
  };

  const confirmReturnDate = async () => {
    if (returnDateModal) {
      setIsUpdatingReturn(true);
      try {
        await onUpdateStatus(returnDateModal.orderId, OrderStatus.RETURNED, returnDateModal.date);
        setReturnDateModal(null);
      } catch (err) {
        console.error('Confirm Return Error:', err);
      } finally {
        setIsUpdatingReturn(false);
      }
    }
  };

  const getProductImage = (productId: string) => {
    return catalog.find(p => p.id === productId)?.image || '';
  };

  const isOverdue = (order: Order) => {
    return order.orderDate < todayStr && 
           order.status !== OrderStatus.COMPLETED && 
           order.status !== OrderStatus.CANCELED &&
           order.status !== OrderStatus.RETURNED;
  };

  const resetDateFilters = () => {
    setFilters(prev => ({ ...prev, startDate: '', endDate: '' }));
  };

  const handleDateClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    if ('showPicker' in HTMLInputElement.prototype) {
      try {
        input.showPicker();
      } catch (err) {
        input.focus();
      }
    }
  };

  const getMarketplaceColor = (mp: string) => {
    const name = mp.toLowerCase();
    if (name.includes('tiktok')) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (name.includes('shopee')) return 'bg-orange-50 text-orange-700 border-orange-100';
    if (name.includes('lazada')) return 'bg-blue-50 text-blue-700 border-blue-100';
    return 'bg-slate-50 text-slate-600 border-slate-100';
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.resi && o.resi.toLowerCase().includes(searchTerm.toLowerCase())) ||
      o.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.backName && o.backName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filters.status ? o.status === filters.status : true;
    const matchesMarketplace = filters.marketplace ? o.marketplace === filters.marketplace : true;
    const matchesType = filters.type ? o.type === filters.type : true;
    const matchesCustom = filters.onlyCustom ? (o.backName || o.backNumber) : true;
    const matchesUrgent = filters.onlyUrgent ? isOverdue(o) : true;
    
    let matchesDate = true;
    if (filters.startDate && filters.endDate) {
      matchesDate = o.orderDate >= filters.startDate && o.orderDate <= filters.endDate;
    } else if (filters.startDate) {
      matchesDate = o.orderDate >= filters.startDate;
    } else if (filters.endDate) {
      matchesDate = o.orderDate <= filters.endDate;
    }

    return matchesSearch && matchesStatus && matchesMarketplace && matchesType && matchesDate && matchesCustom && matchesUrgent;
  });

  const totalOrders = filteredOrders.length;
  const totalQty = filteredOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
  const overdueCount = orders.filter(o => isOverdue(o)).length;

  const loadImage = (url: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => resolve('');
      img.src = url;
    });
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      doc.setFillColor(15, 23, 42); 
      doc.rect(0, 0, 297, 40, 'F');
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('ERFOLGS STORE', 14, 18);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('PRODUCTION REPORT CLOUD SYSTEM', 14, 25);
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 240, 15);
      doc.text(`Total: ${totalOrders} Pesanan | Qty: ${totalQty}`, 240, 21);
      doc.text(`Periode: ${filters.startDate || '-'} / ${filters.endDate || '-'}`, 240, 27);

      const tableData: any[] = [];
      const imageMap = new Map();
      for (const order of filteredOrders) {
        const imgUrl = getProductImage(order.productId);
        if (imgUrl && !imageMap.has(order.productId)) {
          const b64 = await loadImage(imgUrl);
          imageMap.set(order.productId, b64);
        }
        const customLines = [];
        if (order.backName) customLines.push(`Nama : ${order.backName}`);
        if (order.backNumber) customLines.push(`No. ${order.backNumber}`);
        const customText = customLines.join('\n');
        tableData.push([
          '', 
          order.orderId,
          order.marketplace,
          order.expedition || '',
          order.productName,
          customText || '',
          order.size,
          order.quantity,
          order.orderDate,
          STATUS_LABELS[order.status]
        ]);
      }

      autoTable(doc, {
        startY: 45,
        head: [['Foto', 'ID Order', 'Marketplace', 'Kurir', 'Produk', 'Custom', 'Size', 'Qty', 'Tanggal', 'Status']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2, valign: 'middle' },
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 22, minCellHeight: 22 }, 
          4: { cellWidth: 40 },
          5: { cellWidth: 35 },
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const order = filteredOrders[data.row.index];
            const base64 = imageMap.get(order.productId);
            if (base64) {
              const imgSize = 18;
              const xPos = data.cell.x + (data.cell.width - imgSize) / 2;
              const yPos = data.cell.y + (data.cell.height - imgSize) / 2;
              doc.addImage(base64, 'JPEG', xPos, yPos, imgSize, imgSize);
            }
          }
        },
        rowPageBreak: 'avoid',
      });
      doc.save(`REKAPAN_ERFOLGS_${todayStr}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('Gagal membuat PDF. Coba ulangi kembali.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = () => {
    const headers = ['ID Pesanan', 'Marketplace', 'Kurir', 'Resi', 'Nama Produk', 'Nama Player', 'No Player', 'Ukuran', 'Qty', 'Tgl Order', 'Tipe', 'Status Akhir', 'Tgl Return'];
    const rows = filteredOrders.map(o => [
      `"${o.orderId}"`, `"${o.marketplace}"`, `"${o.expedition || '-'}"`, `"${o.resi || '-'}"`, `"${o.productName}"`,
      `"${o.backName || '-'}"`, `"${o.backNumber || '-'}"`, `"${o.size}"`, o.quantity,
      `"${o.orderDate}"`, `"${o.type === OrderType.STOCK ? 'Stok' : 'Produksi'}"`, `"${STATUS_LABELS[o.status]}"`, `"${o.returnDate || '-'}"`
    ]);
    const csvString = "\ufeff" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ERFOLGS_EXPORT_${todayStr}.csv`;
    link.click();
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteOrder(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 w-full max-w-full">
      <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8 no-print">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
           <div className="flex items-center gap-4 text-slate-800 font-black text-sm uppercase tracking-[0.2em]">
             <div className="w-2 h-6 bg-blue-600 rounded-full"></div> Filter & Kendali Database
           </div>
           <div className="flex flex-wrap gap-4">
             <button 
               onClick={() => setFilters(prev => ({...prev, onlyCustom: !prev.onlyCustom}))}
               className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filters.onlyCustom ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
             >
               <UserPlus size={18} /> {filters.onlyCustom ? 'Tampilkan Semua Produk' : 'Filter Kustom Jersey'}
             </button>
             <button 
               onClick={() => setFilters(prev => ({...prev, onlyUrgent: !prev.onlyUrgent}))}
               className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filters.onlyUrgent ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100'}`}
             >
               <AlertTriangle size={18} className={filters.onlyUrgent ? 'animate-bounce' : ''} /> 
               {filters.onlyUrgent ? 'SEMUA DATA' : `URGENT (${overdueCount})`}
             </button>
             <button onClick={exportToExcel} className="flex items-center gap-3 px-6 py-3.5 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-emerald-100 hover:bg-emerald-600 active:scale-95 transition-all">
               <FileSpreadsheet size={18} /> EXCEL
             </button>
             <button 
               onClick={handleExportPDF} 
               disabled={isExporting}
               className="flex items-center gap-3 px-6 py-3.5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
             >
               {isExporting ? <Clock size={18} className="animate-spin" /> : <Download size={18} />}
               {isExporting ? 'MENYIAPKAN FOTO...' : 'EXPORT PDF + FOTO'}
             </button>
           </div>
        </div>
        
        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-3 relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="text" 
              placeholder="Cari ID, Nama, Resi..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-blue-50/50 transition-all focus:border-blue-200"
            />
          </div>

          <div className="xl:col-span-2">
            <select value={filters.status} onChange={(e) => setFilters(prev => ({...prev, status: e.target.value}))} className="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl text-[10px] font-black uppercase outline-none cursor-pointer focus:bg-white appearance-none">
              <option value="">-- SEMUA STATUS --</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div className="xl:col-span-2">
            <select value={filters.marketplace} onChange={(e) => setFilters(prev => ({...prev, marketplace: e.target.value}))} className="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl text-[10px] font-black uppercase outline-none cursor-pointer focus:bg-white appearance-none">
              <option value="">-- MARKETPLACE --</option>
              {MARKETPLACE_LIST.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="xl:col-span-1">
            <select value={filters.type} onChange={(e) => setFilters(prev => ({...prev, type: e.target.value}))} className="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl text-[10px] font-black uppercase outline-none cursor-pointer focus:bg-white appearance-none">
              <option value="">TIPE</option>
              <option value={OrderType.PRE_ORDER}>PO</option>
              <option value={OrderType.STOCK}>STOK</option>
            </select>
          </div>

          <div className="xl:col-span-4 flex flex-col sm:flex-row gap-2">
             <div className="flex-1 relative group bg-slate-50 border-2 border-transparent rounded-2xl hover:bg-white hover:border-blue-100 transition-all cursor-pointer">
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 z-10 pointer-events-none group-hover:scale-110 transition-transform">
                  <Calendar size={18} />
                </div>
                <div className="absolute left-4 top-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest z-10 pointer-events-none group-hover:text-blue-500 transition-colors">Dari</div>
                <input 
                  type="date" 
                  value={filters.startDate} 
                  onChange={(e) => setFilters(prev => ({...prev, startDate: e.target.value}))} 
                  onClick={handleDateClick}
                  className="w-full pl-4 pr-10 pt-4 pb-2 bg-transparent border-none text-[11px] font-black uppercase outline-none cursor-pointer block relative z-0 [&::-webkit-calendar-picker-indicator]:opacity-0" 
                />
             </div>
             <div className="flex-1 relative group bg-slate-50 border-2 border-transparent rounded-2xl hover:bg-white hover:border-blue-100 transition-all cursor-pointer">
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 z-10 pointer-events-none group-hover:scale-110 transition-transform">
                  <Calendar size={18} />
                </div>
                <div className="absolute left-4 top-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest z-10 pointer-events-none group-hover:text-blue-500 transition-colors">Sampai</div>
                <input 
                  type="date" 
                  value={filters.endDate} 
                  onChange={(e) => setFilters(prev => ({...prev, endDate: e.target.value}))} 
                  onClick={handleDateClick}
                  className="w-full pl-4 pr-10 pt-4 pb-2 bg-transparent border-none text-[11px] font-black uppercase outline-none cursor-pointer block relative z-0 [&::-webkit-calendar-picker-indicator]:opacity-0" 
                />
             </div>
          </div>
        </div>
      </div>

      <div className="mx-0 md:mx-6 p-6 bg-blue-50 border border-blue-100 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8 no-print shadow-sm">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-blue-600 text-white rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-blue-200 flex-shrink-0">
            <Info size={24} />
          </div>
          <div>
            <h4 className="text-sm font-black text-blue-900 uppercase tracking-[0.2em]">Ringkasan Database</h4>
            <p className="text-xs font-bold text-blue-600 uppercase opacity-70 tracking-widest">Sinkronisasi Cloud Real-time</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-6 md:gap-12 text-center md:text-right">
           <div className="bg-white/70 px-6 py-3 rounded-2xl border border-blue-100 shadow-sm min-w-[120px]">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">(Total Pesanan)</p>
              <p className="text-3xl font-black text-blue-900">{totalOrders}</p>
           </div>
           <div className="bg-white/70 px-6 py-3 rounded-2xl border border-blue-100 shadow-sm min-w-[120px]">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">(Total Pcs)</p>
              <p className="text-3xl font-black text-slate-900">{totalQty}</p>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden w-full max-w-full">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1650px]">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-5 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-24">Foto</th>
                <th className="px-5 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-48">ID Pesanan</th>
                <th className="px-5 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-48">No. Resi</th>
                <th className="px-5 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Produk & Kustom</th>
                <th className="px-5 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-56">Marketplace</th>
                <th className="px-5 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-40">Kurir</th>
                <th className="px-5 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-28 text-center">Tipe</th>
                <th className="px-5 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] min-w-[170px]">Tanggal</th>
                <th className="px-5 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-20 text-center">Size</th>
                <th className="px-5 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-20 text-center">Qty</th>
                <th className="px-5 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-60">Status</th>
                <th className="px-5 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-32 text-right">Navigasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-8 py-32 text-center text-slate-400 font-bold uppercase tracking-[0.3em] text-sm italic">
                    Database: Data tidak ditemukan.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const img = getProductImage(order.productId);
                  const overdue = isOverdue(order);
                  const isReturned = order.status === OrderStatus.RETURNED;
                  return (
                    <tr key={order.id} className={`transition-all group ${overdue ? 'bg-red-50/30' : 'hover:bg-slate-50/50'} ${isReturned ? 'bg-amber-50/20' : ''}`}>
                      <td className="px-5 py-6">
                         <div className="w-16 h-16 rounded-2xl border-4 border-white shadow-md bg-slate-50 overflow-hidden flex items-center justify-center group-hover:scale-110 transition-transform">
                            {img ? <img src={img} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-200" size={28} />}
                         </div>
                      </td>
                      <td className="px-5 py-6">
                        <div className="flex flex-col gap-1">
                          <div className={`font-black text-[13px] tracking-tight flex items-center gap-2 whitespace-nowrap ${overdue ? 'text-red-600' : 'text-slate-900'}`}>
                            {overdue && <AlertTriangle size={14} className="text-red-500 animate-pulse" />}
                            <Hash size={14} className={overdue ? 'text-red-300' : 'text-slate-300'} /> {order.orderId}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-6">
                        <div className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-xl w-fit whitespace-nowrap">
                           <Tag size={12} className="text-slate-400" /> {order.resi || '-'}
                        </div>
                      </td>
                      <td className="px-5 py-6">
                        <div className="text-sm font-black text-blue-600 uppercase max-w-[300px] truncate leading-tight">{order.productName}</div>
                        {(order.backName || order.backNumber) && (
                           <div className="flex flex-wrap gap-2 mt-2.5">
                             {order.backName && <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm">{order.backName}</span>}
                             {order.backNumber && <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-[9px] font-black uppercase tracking-wider border border-blue-200 shadow-sm">#{order.backNumber}</span>}
                           </div>
                        )}
                      </td>
                      <td className="px-5 py-6">
                        <div className="whitespace-nowrap">
                          <span className={`px-4 py-2.5 border rounded-2xl text-[10px] font-black uppercase tracking-widest inline-block shadow-sm ${getMarketplaceColor(order.marketplace)}`}>
                            {order.marketplace}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-6">
                        <div className="flex items-center gap-2 text-[11px] font-black text-slate-600 uppercase bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 w-fit">
                           <Truck size={14} className="text-slate-400" /> {order.expedition || '-'}
                        </div>
                      </td>
                      <td className="px-5 py-6 text-center">
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${order.type === OrderType.STOCK ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                          {order.type === OrderType.STOCK ? 'STOK' : 'PO'}
                        </span>
                      </td>
                      <td className="px-5 py-6">
                        <div className="text-[11px] font-black flex items-center gap-2 whitespace-nowrap px-3 py-2 rounded-xl border w-fit bg-slate-50 text-slate-600 border-slate-100">
                          <Calendar size={13} className="text-slate-400" /> {order.orderDate}
                        </div>
                      </td>
                      <td className="px-5 py-6 text-center">
                        <span className="text-base font-black text-slate-900">{order.size}</span>
                      </td>
                      <td className="px-5 py-6 text-center">
                        <span className="text-base font-black text-slate-900">x{order.quantity}</span>
                      </td>
                      <td className="px-5 py-6">
                        {editingStatusId === order.id ? (
                          <div className="relative">
                            <select 
                              autoFocus
                              value={order.status}
                              onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                              className="w-full text-[10px] font-black border-2 border-blue-500 rounded-2xl p-3 outline-none bg-white shadow-2xl appearance-none"
                            >
                              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" size={16} />
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-3 group/status">
                              <span className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border ${getStatusColor(order.status)} whitespace-nowrap`}>
                                {STATUS_LABELS[order.status]}
                              </span>
                              {!isReturned ? (
                                <button 
                                  onClick={() => setEditingStatusId(order.id)}
                                  className="opacity-0 group-hover/status:opacity-100 p-2 text-slate-400 hover:text-blue-600 transition-all"
                                >
                                  <Edit3 size={18} />
                                </button>
                              ) : (
                                <div className="p-2 text-amber-500" title="Data Return Terkunci">
                                  <Lock size={16} />
                                </div>
                              )}
                            </div>
                            {isReturned && order.returnDate && (
                              <div className="flex items-center gap-1.5 text-[9px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-lg border border-amber-100 w-fit">
                                <Calendar size={10} /> RETURN: {order.returnDate}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-6 text-right">
                        <div className="flex justify-end gap-2.5">
                          <button 
                            onClick={() => setSelectedOrder(order)}
                            className="p-3.5 text-slate-400 hover:bg-slate-900 hover:text-white rounded-2xl transition-all bg-slate-50 border border-slate-100 shadow-sm"
                          >
                            <HistoryIcon size={20} />
                          </button>
                          {isSuperAdmin && (
                            <button 
                              onClick={() => setDeleteConfirmId(order.id)}
                              className="p-3.5 text-slate-400 hover:bg-red-600 hover:text-white rounded-2xl transition-all bg-slate-50 border border-slate-100 shadow-sm"
                            >
                              <Trash2 size={20} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Return Date */}
      {returnDateModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300 no-print">
           <div className="bg-white w-full max-w-[400px] rounded-[2.5rem] shadow-2xl p-8 space-y-8 border border-slate-100 animate-in zoom-in duration-300">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center border border-amber-200 shadow-inner">
                   <RotateCcw size={32} />
                </div>
                <div>
                   <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Data Pengembalian</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Wajib Input Tanggal Return</p>
                </div>
              </div>
              
              <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Tanggal Barang Kembali</label>
                 <div className="relative group">
                    <input 
                      type="date" 
                      value={returnDateModal.date}
                      onChange={(e) => setReturnDateModal(prev => prev ? {...prev, date: e.target.value} : null)}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-black outline-none focus:bg-white focus:border-amber-400 transition-all uppercase tracking-widest"
                    />
                    <Calendar className="absolute right-6 top-1/2 -translate-y-1/2 text-amber-500" size={20} />
                 </div>
                 <p className="text-[9px] text-amber-500 font-bold uppercase tracking-wider px-2">* Setelah dikonfirmasi, status pesanan tidak dapat diubah lagi.</p>
              </div>

              <div className="flex flex-col gap-3">
                 <button 
                   disabled={isUpdatingReturn}
                   onClick={confirmReturnDate}
                   className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-amber-200 hover:bg-amber-600 transition-all active:scale-95 disabled:opacity-50"
                 >
                   {isUpdatingReturn ? 'MEMPROSES...' : 'KONFIRMASI RETURN'}
                 </button>
                 <button 
                   disabled={isUpdatingReturn}
                   onClick={() => setReturnDateModal(null)}
                   className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-200 transition-all"
                 >
                   BATALKAN
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Detail Riwayat Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300 no-print">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
               <div>
                  <h3 className="text-2xl font-black tracking-tighter uppercase">Detail Log Produksi</h3>
                  <p className="text-[10px] opacity-60 font-black uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
                    <Hash size={12} /> ID: {selectedOrder.orderId}
                  </p>
               </div>
               <button onClick={() => setSelectedOrder(null)} className="p-4 hover:bg-white/10 rounded-[1.5rem] transition-all border border-white/10">
                  <X size={28} />
               </button>
            </div>
            
            <div className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-12">
               <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-start bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200">
                  <div className="w-28 h-28 rounded-3xl border-4 border-white shadow-xl bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                    {getProductImage(selectedOrder.productId) ? (
                      <img src={getProductImage(selectedOrder.productId)} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="text-slate-200" size={40} />
                    )}
                  </div>
                  <div className="space-y-3 text-center sm:text-left">
                     <h4 className="text-xl font-black text-slate-900 leading-tight uppercase">{selectedOrder.productName}</h4>
                     <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                        <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-500 tracking-widest">{selectedOrder.marketplace}</span>
                        <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-500 tracking-widest">SIZE: {selectedOrder.size}</span>
                     </div>
                     {selectedOrder.status === OrderStatus.RETURNED && selectedOrder.returnDate && (
                       <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 text-amber-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-200">
                         <RotateCcw size={12} /> Direturn Pada: {selectedOrder.returnDate}
                       </div>
                     )}
                  </div>
               </div>

               <div className="space-y-8">
                  <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2 flex items-center gap-2">
                    <Activity size={14} className="text-blue-500" /> Histori Perubahan Status
                  </h5>
                  <div className="relative pl-10 space-y-10">
                     <div className="absolute left-[19px] top-2 bottom-2 w-1.5 bg-slate-100 rounded-full"></div>
                     {selectedOrder.history.map((h, i) => (
                        <div key={i} className="relative">
                           <div className={`absolute -left-[32px] top-1 w-9 h-9 rounded-[1.25rem] border-4 border-white shadow-lg flex items-center justify-center bg-slate-200`}>
                              <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                           </div>
                           <div className="p-6 rounded-[2rem] border bg-white border-slate-100">
                              <p className="text-xs font-black uppercase tracking-widest text-slate-800">
                                 {STATUS_LABELS[h.status]}
                              </p>
                              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-wider">
                                 <span>Oleh: {h.updatedBy}</span>
                                 <span>{new Date(h.updatedAt).toLocaleString('id-ID')}</span>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            <div className="p-10 border-t border-slate-100 bg-slate-50/50">
               <button onClick={() => setSelectedOrder(null)} className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-[0.3em] shadow-xl shadow-blue-200">
                  TUTUP RIWAYAT
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const getStatusColor = (status: OrderStatus) => {
  if (status === OrderStatus.COMPLETED) return 'bg-green-100 text-green-700 border-green-200';
  if (status === OrderStatus.READY_TO_SHIP) return 'bg-indigo-100 text-indigo-700 border-indigo-200';
  if (status === OrderStatus.CANCELED) return 'bg-red-100 text-red-700 border-red-200';
  if (status === OrderStatus.RETURNED) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-blue-100 text-blue-700 border-blue-200';
};

export default OrderListView;