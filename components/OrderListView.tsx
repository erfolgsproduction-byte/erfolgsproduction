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
      // Error handled in App.tsx
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

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteOrder(deleteConfirmId);
      setDeleteConfirmId(null);
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
      doc.setFillColor(15, 23, 42); doc.rect(0, 0, 297, 40, 'F');
      doc.setFontSize(22); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
      doc.text('ERFOLGS STORE', 14, 18);
      doc.setFontSize(8); doc.setTextColor(148, 163, 184); doc.text('PRODUCTION REPORT CLOUD SYSTEM', 14, 25);
      
      const tableData = await Promise.all(filteredOrders.map(async (order) => {
        const customLines = [];
        if (order.backName) customLines.push(`Nama : ${order.backName}`);
        if (order.backNumber) customLines.push(`No. ${order.backNumber}`);
        return [
          '', 
          order.orderId,
          order.marketplace,
          order.expedition || '',
          order.productName,
          customLines.join('\n') || '',
          order.size,
          order.quantity,
          order.orderDate,
          STATUS_LABELS[order.status]
        ];
      }));

      autoTable(doc, {
        startY: 45,
        head: [['Foto', 'ID Order', 'Marketplace', 'Kurir', 'Produk', 'Custom', 'Size', 'Qty', 'Tanggal', 'Status']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2, valign: 'middle' },
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
        columnStyles: { 0: { cellWidth: 22, minCellHeight: 22 }, 4: { cellWidth: 40 }, 5: { cellWidth: 35 } },
        didDrawCell: async (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const order = filteredOrders[data.row.index];
            const imgUrl = getProductImage(order.productId);
            if (imgUrl) {
               const b64 = await loadImage(imgUrl);
               if (b64) doc.addImage(b64, 'JPEG', data.cell.x + 2, data.cell.y + 2, 18, 18);
            }
          }
        }
      });
      doc.save(`REKAPAN_ERFOLGS_${todayStr}.pdf`);
    } catch (error) { console.error(error); } finally { setIsExporting(false); }
  };

  const exportToExcel = () => {
    const headers = ['ID Pesanan', 'Marketplace', 'Kurir', 'Resi', 'Nama Produk', 'Nama Player', 'No Player', 'Ukuran', 'Qty', 'Tgl Order', 'Status Akhir'];
    const rows = filteredOrders.map(o => [
      `"${o.orderId}"`, `"${o.marketplace}"`, `"${o.expedition || '-'}"`, `"${o.resi || '-'}"`, `"${o.productName}"`,
      `"${o.backName || '-'}"`, `"${o.backNumber || '-'}"`, `"${o.size}"`, o.quantity, `"${o.orderDate}"`, `"${STATUS_LABELS[o.status]}"`
    ]);
    const csvString = "\ufeff" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ERFOLGS_EXPORT_${todayStr}.csv`;
    link.click();
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
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 z-10 pointer-events-none">
                  <Calendar size={18} />
                </div>
                <div className="absolute left-4 top-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest z-10">Dari</div>
                <input type="date" value={filters.startDate} onChange={(e) => setFilters(prev => ({...prev, startDate: e.target.value}))} onClick={handleDateClick} className="w-full pl-4 pr-10 pt-4 pb-2 bg-transparent border-none text-[11px] font-black outline-none cursor-pointer" />
             </div>
             <div className="flex-1 relative group bg-slate-50 border-2 border-transparent rounded-2xl hover:bg-white hover:border-blue-100 transition-all cursor-pointer">
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 z-10 pointer-events-none">
                  <Calendar size={18} />
                </div>
                <div className="absolute left-4 top-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest z-10">Sampai</div>
                <input type="date" value={filters.endDate} onChange={(e) => setFilters(prev => ({...prev, endDate: e.target.value}))} onClick={handleDateClick} className="w-full pl-4 pr-10 pt-4 pb-2 bg-transparent border-none text-[11px] font-black outline-none cursor-pointer" />
             </div>
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
                  return (
                    <tr key={order.id} className={`transition-all group ${overdue ? 'bg-red-50/30' : 'hover:bg-slate-50/50'}`}>
                      <td className="px-5 py-6">
                         <div className="w-16 h-16 rounded-2xl border-4 border-white shadow-md bg-slate-50 overflow-hidden flex items-center justify-center">
                            {img ? <img src={img} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-200" size={28} />}
                         </div>
                      </td>
                      <td className="px-5 py-6">
                        <div className={`font-black text-[13px] tracking-tight flex items-center gap-2 ${overdue ? 'text-red-600' : 'text-slate-900'}`}>
                          {overdue && <AlertTriangle size={14} className="animate-pulse" />} #{order.orderId}
                        </div>
                      </td>
                      <td className="px-5 py-6">
                        <div className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-xl w-fit">
                           <Tag size={12} /> {order.resi || '-'}
                        </div>
                      </td>
                      <td className="px-5 py-6">
                        <div className="text-sm font-black text-blue-600 uppercase truncate max-w-[250px]">{order.productName}</div>
                        {(order.backName || order.backNumber) && (
                           <div className="flex gap-2 mt-2">
                             {order.backName && <span className="px-2 py-1 bg-slate-900 text-white rounded text-[9px] font-black">{order.backName}</span>}
                             {order.backNumber && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[9px] font-black">#{order.backNumber}</span>}
                           </div>
                        )}
                      </td>
                      <td className="px-5 py-6">
                        <span className={`px-4 py-2 border rounded-2xl text-[10px] font-black uppercase tracking-widest ${getMarketplaceColor(order.marketplace)}`}>
                          {order.marketplace}
                        </span>
                      </td>
                      <td className="px-5 py-6">
                        <div className="text-[11px] font-black text-slate-600 flex items-center gap-2"><Truck size={14} /> {order.expedition || '-'}</div>
                      </td>
                      <td className="px-5 py-6 text-center">
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black border ${order.type === OrderType.STOCK ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>
                          {order.type === OrderType.STOCK ? 'STOK' : 'PO'}
                        </span>
                      </td>
                      <td className="px-5 py-6">
                        <div className="text-[11px] font-black flex items-center gap-2"><Calendar size={13} /> {order.orderDate}</div>
                      </td>
                      <td className="px-5 py-6 text-center font-black">{order.size}</td>
                      <td className="px-5 py-6 text-center font-black">x{order.quantity}</td>
                      <td className="px-5 py-6">
                        {editingStatusId === order.id ? (
                          <div className="relative">
                            <select autoFocus value={order.status} onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)} className="w-full text-[10px] font-black border-2 border-blue-500 rounded-2xl p-3 outline-none bg-white shadow-2xl">
                              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 group/status">
                            <span className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(order.status)} whitespace-nowrap`}>
                              {STATUS_LABELS[order.status]}
                            </span>
                            <button onClick={() => setEditingStatusId(order.id)} className="opacity-0 group-hover/status:opacity-100 p-2 text-slate-400 hover:text-blue-600 transition-all"><Edit3 size={18} /></button>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-6 text-right">
                        <div className="flex justify-end gap-2.5">
                          <button onClick={() => setSelectedOrder(order)} className="p-3.5 text-slate-400 hover:bg-slate-900 hover:text-white rounded-2xl transition-all bg-slate-50 border border-slate-100 shadow-sm"><HistoryIcon size={20} /></button>
                          {isSuperAdmin && (
                            <button onClick={() => setDeleteConfirmId(order.id)} className="p-3.5 text-slate-400 hover:bg-red-600 hover:text-white rounded-2xl transition-all bg-slate-50 border border-slate-100 shadow-sm"><Trash2 size={20} /></button>
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

      {/* Modal Konfirmasi Hapus - MEMPERBAIKI BUG USER */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-10 text-center space-y-8 border border-slate-100 animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto border border-red-100 shadow-xl shadow-red-200/20">
                 <Trash2 size={40} />
              </div>
              <div className="space-y-2">
                 <h3 className="text-xl font-black text-slate-900 uppercase">Hapus Transaksi?</h3>
                 <p className="text-xs font-bold text-slate-400 leading-relaxed">Data pesanan ini akan dihapus permanen dari database cloud dan tidak bisa dikembalikan.</p>
              </div>
              <div className="flex flex-col gap-3">
                 <button onClick={confirmDelete} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-red-200 hover:bg-red-700 transition-all active:scale-95">Hapus Permanen</button>
                 <button onClick={() => setDeleteConfirmId(null)} className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-200 transition-all active:scale-95">Batal</button>
              </div>
           </div>
        </div>
      )}

      {/* Detail Riwayat Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
               <div><h3 className="text-2xl font-black tracking-tighter uppercase">Log Produksi</h3></div>
               <button onClick={() => setSelectedOrder(null)} className="p-4 hover:bg-white/10 rounded-[1.5rem]"><X size={28} /></button>
            </div>
            <div className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-8">
               {selectedOrder.history.map((h, i) => (
                  <div key={i} className="flex gap-6 relative">
                     <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-[10px] text-slate-400 shrink-0">{i+1}</div>
                     <div className="flex-1 pb-8 border-b border-slate-50">
                        <p className="text-xs font-black uppercase text-slate-800">{STATUS_LABELS[h.status]}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">Oleh: {h.updatedBy} • {new Date(h.updatedAt).toLocaleString()}</p>
                     </div>
                  </div>
               ))}
            </div>
          </div>
        </div>
      )}

      {/* Return Date Modal */}
      {returnDateModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
           <div className="bg-white w-full max-w-[400px] rounded-[2.5rem] p-8 space-y-8">
              <h3 className="text-xl font-black text-slate-900 uppercase">Input Tanggal Return</h3>
              <input type="date" value={returnDateModal.date} onChange={(e) => setReturnDateModal(prev => prev ? {...prev, date: e.target.value} : null)} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black uppercase outline-none" />
              <div className="flex flex-col gap-3">
                 <button onClick={confirmReturnDate} disabled={isUpdatingReturn} className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase">Konfirmasi</button>
                 <button onClick={() => setReturnDateModal(null)} className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase">Batal</button>
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