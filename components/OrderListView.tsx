import React, { useState, useMemo } from 'react';
import { Order, STATUS_LABELS, OrderStatus, ROLE_LABELS, OrderType, CatalogProduct, MARKETPLACE_LIST, UserRole } from '../types';
import { Search, History as HistoryIcon, X, User as UserIcon, Check, ImageIcon, Trash2, Edit3, Calendar, FileSpreadsheet, Printer, Hash, Info, Tag, UserPlus, ChevronDown, Activity, Clock, ShoppingBag, Package, AlertTriangle, Download, Filter, Truck, RotateCcw, Lock, MoreVertical, Scissors, Clipboard, BarChart3, ListOrdered, FileDown, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

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
  const [exportingType, setExportingType] = useState<'pdf' | 'excel' | null>(null);
  const [returnDateModal, setReturnDateModal] = useState<{orderId: string, date: string} | null>(null);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

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
    } catch (err) {}
  };

  const confirmReturnDate = async () => {
    if (returnDateModal) {
      try {
        await onUpdateStatus(returnDateModal.orderId, OrderStatus.RETURNED, returnDateModal.date);
        setReturnDateModal(null);
      } catch (err) {}
    }
  };

  const getProductImage = (productId: string) => {
    return catalog.find(p => p.id === productId)?.image || '';
  };

  const getBase64FromUrl = async (url: string): Promise<string | null> => {
    if (!url) return null;
    try {
      const data = await fetch(url);
      const blob = await data.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          resolve(base64data);
        };
      });
    } catch (e) {
      console.error("Failed to convert image to base64", e);
      return null;
    }
  };

  const isOverdue = (order: Order) => {
    return order.orderDate < todayStr && 
           order.status !== OrderStatus.COMPLETED && 
           order.status !== OrderStatus.CANCELED &&
           order.status !== OrderStatus.RETURNED;
  };

  const getMarketplaceColor = (mp: string) => {
    const name = mp.toLowerCase();
    if (name.includes('tiktok')) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (name.includes('shopee')) return 'bg-orange-50 text-orange-700 border-orange-100';
    if (name.includes('lazada')) return 'bg-blue-50 text-blue-700 border-blue-100';
    return 'bg-slate-50 text-slate-600 border-slate-100';
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
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
  }, [orders, searchTerm, filters, todayStr]);

  const stats = useMemo(() => {
    const mps: Record<string, { count: number; qty: number }> = {};
    let totalQty = 0;

    filteredOrders.forEach(o => {
      if (!mps[o.marketplace]) {
        mps[o.marketplace] = { count: 0, qty: 0 };
      }
      mps[o.marketplace].count += 1;
      mps[o.marketplace].qty += (o.quantity || 0);
      totalQty += (o.quantity || 0);
    });

    return {
      marketplaces: Object.entries(mps).sort((a, b) => b[1].count - a[1].count),
      totalCount: filteredOrders.length,
      totalQty
    };
  }, [filteredOrders]);

  const handleExportPDF = async () => {
    setExportingType('pdf');
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      
      const mpCount = stats.marketplaces.length;
      const rowsNeeded = Math.max(1, Math.ceil(mpCount / 4));
      const headerAreaHeight = 45 + (rowsNeeded * 7);

      doc.setFillColor(15, 23, 42); 
      doc.rect(0, 0, pageWidth, headerAreaHeight, 'F');
      
      doc.setFontSize(22); 
      doc.setTextColor(255, 255, 255); 
      doc.setFont('helvetica', 'bold');
      doc.text('ERFOLGS STORE', 14, 18);
      
      doc.setFontSize(10); 
      doc.setFont('helvetica', 'normal');
      doc.text(`Rekapitulasi Laporan Produksi - ${todayStr}`, 14, 28);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(59, 130, 246);
      doc.text(`TOTAL KESELURUHAN: ${stats.totalCount} ORDER / ${stats.totalQty} PCS`, pageWidth - 14, 28, { align: 'right' });

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text('RINGKASAN MARKETPLACE:', 14, 38);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      let currentY = 44;
      stats.marketplaces.forEach(([name, data], idx) => {
        const col = idx % 4;
        const xPos = 14 + (col * 65);
        doc.text(`${name}: ${data.count} Ord (${data.qty} Pcs)`, xPos, currentY);
        if (col === 3) currentY += 6;
      });

      const tableBody = filteredOrders.map((order, index) => [
        index + 1,
        order.orderId, 
        order.resi || '-', 
        order.productName,
        '', 
        (order.backName || order.backNumber) ? `${order.backName || ''} #${order.backNumber || ''}` : '-',
        order.size, 
        order.quantity, 
        order.marketplace, 
        order.orderDate, 
        order.expedition || '-',
        STATUS_LABELS[order.status]
      ]);

      const imageMap = new Map<string, string | null>();
      for (const order of filteredOrders) {
        const imgUrl = getProductImage(order.productId);
        if (imgUrl && !imageMap.has(imgUrl)) {
          const base64 = await getBase64FromUrl(imgUrl);
          imageMap.set(imgUrl, base64);
        }
      }

      autoTable(doc, {
        startY: headerAreaHeight + 10,
        head: [['No', 'ID Order', 'Resi', 'Produk', 'Foto', 'Custom', 'Size', 'Qty', 'Marketplace', 'Tanggal', 'Kurir', 'Status']],
        body: tableBody,
        theme: 'grid',
        styles: { fontSize: 7, valign: 'middle', minCellHeight: 18, cellPadding: 2 },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 35 },
          4: { cellWidth: 20, halign: 'center' },
          7: { halign: 'center', fontStyle: 'bold' }
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 4) {
            const order = filteredOrders[data.row.index];
            if (order) {
              const base64 = imageMap.get(getProductImage(order.productId));
              if (base64) {
                const size = 14;
                const x = data.cell.x + (data.cell.width - size) / 2;
                const y = data.cell.y + (data.cell.height - size) / 2;
                doc.addImage(base64, 'JPEG', x, y, size, size);
              }
            }
          }
        }
      });

      doc.save(`ERFOLGS_REPORT_${todayStr}.pdf`);
    } catch (error) {
      console.error(error);
      alert("Gagal export PDF.");
    } finally {
      setExportingType(null);
    }
  };

  const handleExportExcel = async () => {
    setExportingType('excel');
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Daftar Pesanan');

      worksheet.mergeCells('A1:M1');
      worksheet.getCell('A1').value = 'ERFOLGS STORE - LAPORAN REKAPITULASI PRODUKSI';
      worksheet.getCell('A1').font = { bold: true, size: 16 };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };

      worksheet.mergeCells('A2:M2');
      worksheet.getCell('A2').value = `GRAND TOTAL: ${stats.totalCount} ORDER / ${stats.totalQty} PCS | Tanggal: ${todayStr}`;
      worksheet.getCell('A2').font = { bold: true, color: { argb: 'FF2563EB' } };
      worksheet.getCell('A2').alignment = { horizontal: 'center' };

      let currentRow = 4;
      worksheet.getCell(`A${currentRow}`).value = 'RINGKASAN MARKETPLACE:';
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      currentRow++;

      stats.marketplaces.forEach(([name, data]) => {
        worksheet.getCell(`A${currentRow}`).value = name;
        worksheet.getCell(`B${currentRow}`).value = `${data.count} Order`;
        worksheet.getCell(`C${currentRow}`).value = `${data.qty} Pcs`;
        currentRow++;
      });

      currentRow += 2;
      const tableHeaderRow = currentRow;
      const headers = ['NO', 'ID ORDER', 'RESI', 'PRODUK', 'FOTO', 'NAMA PUNGGUNG', 'NOMOR PUNGGUNG', 'SIZE', 'QTY', 'MARKETPLACE', 'TANGGAL', 'KURIR', 'STATUS'];
      
      const headerRow = worksheet.getRow(tableHeaderRow);
      headerRow.values = headers;
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

      worksheet.columns = [
        { width: 8 }, { width: 25 }, { width: 20 }, { width: 35 }, { width: 18 }, { width: 20 }, { width: 15 }, { width: 10 }, { width: 10 }, { width: 25 }, { width: 15 }, { width: 15 }, { width: 20 }
      ];

      for (let i = 0; i < filteredOrders.length; i++) {
        const order = filteredOrders[i];
        const rowIndex = tableHeaderRow + i + 1;
        
        const rowValues = [
          i + 1,
          order.orderId,
          order.resi || '-',
          order.productName,
          '', 
          order.backName || '-',
          order.backNumber || '-',
          order.size,
          order.quantity,
          order.marketplace,
          order.orderDate,
          order.expedition || '-',
          STATUS_LABELS[order.status]
        ];

        const row = worksheet.getRow(rowIndex);
        row.values = rowValues;
        row.height = 90;
        row.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getCell(`D${rowIndex}`).alignment = { horizontal: 'left', vertical: 'middle' };

        const imgUrl = getProductImage(order.productId);
        if (imgUrl) {
          const base64 = await getBase64FromUrl(imgUrl);
          if (base64) {
            const imageId = workbook.addImage({ base64, extension: 'png' });
            worksheet.addImage(imageId, {
              tl: { col: 4.1, row: rowIndex - 0.95 },
              ext: { width: 100, height: 100 }
            });
          }
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const anchor = document.createElement('a');
      anchor.href = URL.createObjectURL(blob);
      anchor.download = `ERFOLGS_EXCEL_${todayStr}.xlsx`;
      anchor.click();
    } catch (error) {
      console.error(error);
      alert("Gagal export Excel.");
    } finally {
      setExportingType(null);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-20 w-full max-w-full">
      
      {/* Marketplace & Totals Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
        <div className="md:col-span-1 bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-xl shadow-slate-200/50 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/10 rounded-full -mr-8 -mt-8 blur-2xl"></div>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <BarChart3 size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grand Total</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white tracking-tighter">{stats.totalCount}</span>
            <span className="text-[10px] font-black text-blue-400 uppercase">Order</span>
            <span className="mx-2 text-slate-700">/</span>
            <span className="text-3xl font-black text-white tracking-tighter">{stats.totalQty}</span>
            <span className="text-[10px] font-black text-emerald-400 uppercase">Pcs</span>
          </div>
        </div>

        <div className="md:col-span-3 bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4 overflow-x-auto custom-scrollbar no-print">
          {stats.marketplaces.length > 0 ? stats.marketplaces.map(([name, data]) => (
            <div key={name} className="flex-shrink-0 px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-1 min-w-[160px] hover:bg-white hover:border-blue-200 transition-all group">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-black text-slate-400 uppercase truncate max-w-[100px]">{name}</span>
                <div className="w-2 h-2 rounded-full bg-blue-500 group-hover:animate-pulse"></div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-slate-900 tracking-tight">{data.count}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">Ord</span>
                <span className="text-xl font-black text-blue-600 tracking-tight">{data.qty}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">Pcs</span>
              </div>
            </div>
          )) : (
            <div className="w-full text-center py-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">
              Belum ada data untuk marketplace terpilih
            </div>
          )}
        </div>
      </div>

      {/* Search & Filter Panel */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6 no-print">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Cari Pesanan (ID, Resi, Produk, Custom)..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-50/50 outline-none transition-all focus:border-blue-200"
            />
          </div>
          <button 
            onClick={() => setShowFiltersMobile(!showFiltersMobile)}
            className="md:hidden flex items-center justify-center gap-3 p-4 bg-slate-100 text-slate-600 rounded-2xl text-sm font-black"
          >
            <Filter size={18} /> {showFiltersMobile ? 'Tutup Filter' : 'Filter Lanjutan'}
          </button>
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-12 gap-4 ${showFiltersMobile ? 'grid' : 'hidden md:grid'}`}>
          <div className="xl:col-span-2">
            <select value={filters.status} onChange={(e) => setFilters(prev => ({...prev, status: e.target.value}))} className="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl text-[10px] font-black uppercase outline-none focus:bg-white focus:border-blue-100 transition-all cursor-pointer">
              <option value="">STATUS PRODUKSI</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="xl:col-span-2">
            <select value={filters.marketplace} onChange={(e) => setFilters(prev => ({...prev, marketplace: e.target.value}))} className="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl text-[10px] font-black uppercase outline-none focus:bg-white focus:border-blue-100 transition-all cursor-pointer">
              <option value="">MARKETPLACE</option>
              {MARKETPLACE_LIST.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="xl:col-span-2">
            <select value={filters.type} onChange={(e) => setFilters(prev => ({...prev, type: e.target.value}))} className="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl text-[10px] font-black uppercase outline-none focus:bg-white focus:border-blue-100 transition-all cursor-pointer">
              <option value="">TIPE (PO/STOCK)</option>
              <option value={OrderType.PRE_ORDER}>PRODUKSI (PO)</option>
              <option value={OrderType.STOCK}>STOK READY</option>
            </select>
          </div>
          
          <div className="xl:col-span-2 flex gap-2">
             <button 
               onClick={() => setFilters(prev => ({...prev, onlyCustom: !prev.onlyCustom}))}
               className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 border-2 ${filters.onlyCustom ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'}`}
             >
               <Scissors size={14} /> <span className="whitespace-nowrap">CUSTOM</span>
             </button>
             <button 
               onClick={() => setFilters(prev => ({...prev, onlyUrgent: !prev.onlyUrgent}))}
               className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 border-2 ${filters.onlyUrgent ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-100' : 'bg-white border-slate-100 text-slate-400 hover:border-red-200'}`}
             >
               <AlertTriangle size={14} /> <span className="whitespace-nowrap">URGENT</span>
             </button>
          </div>

          <div className="xl:col-span-2 flex gap-2">
             <input type="date" value={filters.startDate} onChange={(e) => setFilters(prev => ({...prev, startDate: e.target.value}))} className="flex-1 px-3 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl text-[10px] font-black outline-none focus:bg-white focus:border-blue-100 min-w-0" />
             <input type="date" value={filters.endDate} onChange={(e) => setFilters(prev => ({...prev, endDate: e.target.value}))} className="flex-1 px-3 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl text-[10px] font-black outline-none focus:bg-white focus:border-blue-100 min-w-0" />
          </div>

          <div className="xl:col-span-2 flex gap-2">
             <button 
               onClick={handleExportPDF} 
               disabled={exportingType !== null} 
               className="flex-1 min-w-0 py-2.5 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase disabled:opacity-50 hover:bg-red-700 transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
             >
               {exportingType === 'pdf' ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={14} />}
               <span className="hidden sm:inline">PDF</span>
             </button>
             <button 
               onClick={handleExportExcel} 
               disabled={exportingType !== null} 
               className="flex-1 min-w-0 py-2.5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase disabled:opacity-50 hover:bg-emerald-700 transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
             >
               {exportingType === 'excel' ? <Loader2 size={12} className="animate-spin" /> : <FileSpreadsheet size={14} />}
               <span className="hidden sm:inline">EXCEL</span>
             </button>
             <button onClick={() => setFilters({ status: '', marketplace: '', type: '', startDate: '', endDate: '', onlyCustom: false, onlyUrgent: false })} className="p-2.5 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 transition-colors flex-shrink-0">
               <RotateCcw size={16} />
             </button>
          </div>
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1850px]">
            <thead className="bg-slate-50/80">
              <tr className="border-b border-slate-100">
                <th className="px-4 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest w-16 text-center">No</th>
                <th className="px-5 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest w-36">ID Pesanan</th>
                <th className="px-5 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest w-52">No. Resi</th>
                <th className="pl-6 pr-1 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest w-96">Produk</th>
                <th className="pl-1 pr-5 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest w-24 text-center">Foto</th>
                <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest w-64">Kustomisasi</th>
                <th className="px-5 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest w-20 text-center">Size</th>
                <th className="px-5 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest w-20 text-center">Qty</th>
                <th className="px-5 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest w-60">Marketplace</th>
                <th className="px-5 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest w-44">Tanggal</th>
                <th className="px-5 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest w-44">Ekspedisi</th>
                <th className="px-5 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest w-64 text-center">Status</th>
                <th className="px-5 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest w-32 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-6 py-28 text-center text-slate-300 font-black uppercase tracking-[0.4em] text-xs">
                    Data pesanan tidak ditemukan
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, idx) => {
                  const img = getProductImage(order.productId);
                  return (
                    <tr key={order.id} className={`hover:bg-slate-50/80 transition-all duration-200 ${isOverdue(order) ? 'bg-red-50/20' : ''}`}>
                      <td className="px-4 py-5 text-center">
                        <span className="text-[11px] font-black text-slate-400">{idx + 1}</span>
                      </td>
                      <td className="px-5 py-5">
                        <span className={`text-[13px] font-black ${isOverdue(order) ? 'text-red-600' : 'text-slate-900'}`}>{order.orderId}</span>
                      </td>
                      <td className="px-5 py-5">
                        {order.resi ? (
                           <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{order.resi}</span>
                        ) : (
                           <span className="text-[10px] font-bold text-slate-300 uppercase italic">Belum Input</span>
                        )}
                      </td>
                      <td className="pl-6 pr-1 py-5">
                        <p className="text-sm font-black text-blue-600 uppercase leading-tight">{order.productName}</p>
                        <p className={`text-[9px] font-bold uppercase mt-1 ${order.type === OrderType.STOCK ? 'text-emerald-500' : 'text-indigo-400'}`}>
                          {order.type === OrderType.STOCK ? 'READY STOCK' : 'PRE-ORDER (PO)'}
                        </p>
                      </td>
                      <td className="pl-1 pr-5 py-5 relative group/photo">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-100 bg-white shadow-sm flex-shrink-0 cursor-zoom-in transition-transform active:scale-95 mx-auto">
                          {img ? <img src={img} className="w-full h-full object-cover" alt="" /> : <ImageIcon className="w-full h-full p-4 text-slate-200" />}
                        </div>
                        {img && (
                          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 w-64 h-64 bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl z-[100] overflow-hidden pointer-events-none opacity-0 group-hover/photo:opacity-100 transition-all duration-300 scale-90 group-hover/photo:scale-100 origin-left">
                            <img src={img} className="w-full h-full object-cover" alt="Preview" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        {order.backName ? (
                          <div className="flex items-center gap-4">
                             <div className="w-1 h-10 bg-indigo-500 rounded-full"></div>
                             <div>
                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter leading-none mb-1.5">NAMA: <span className="text-slate-900 font-black text-[11px] uppercase">{order.backName}</span></p>
                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter leading-none">NO: <span className="text-slate-900 font-black text-[11px]">{order.backNumber || '00'}</span></p>
                             </div>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-300 uppercase italic">Tanpa Nama</span>
                        )}
                      </td>
                      <td className="px-5 py-5 text-center">
                        <span className="text-sm font-black text-slate-900">{order.size}</span>
                      </td>
                      <td className="px-5 py-5 text-center">
                        <span className="text-sm font-black text-slate-900">x{order.quantity}</span>
                      </td>
                      <td className="px-5 py-5">
                        <span className={`px-4 py-2 border rounded-xl text-[10px] font-black uppercase inline-block shadow-sm whitespace-nowrap ${getMarketplaceColor(order.marketplace)}`}>
                          {order.marketplace}
                        </span>
                      </td>
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-2.5 whitespace-nowrap">
                           <Calendar size={16} className="text-slate-400" />
                           <span className="text-[11px] font-black text-slate-700 uppercase tracking-tighter">{order.orderDate}</span>
                        </div>
                      </td>
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-2.5 whitespace-nowrap">
                           <Truck size={16} className="text-slate-400" />
                           <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{order.expedition || '-'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-5">
                        {editingStatusId === order.id ? (
                          <div className="relative">
                            <select 
                              autoFocus 
                              value={order.status} 
                              onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)} 
                              className="w-full text-[10px] font-black border-2 border-blue-500 rounded-xl px-4 py-2.5 bg-white shadow-xl outline-none appearance-none"
                            >
                              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" size={14} />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-3 group/st">
                            <div className="flex flex-col items-center gap-1.5">
                              <span className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase border shadow-sm transition-all whitespace-nowrap ${getStatusColor(order.status)}`}>
                                {STATUS_LABELS[order.status]}
                              </span>
                              {order.status === OrderStatus.RETURNED && order.returnDate && (
                                <span className="text-[9px] font-black text-amber-600 uppercase tracking-tighter flex items-center gap-1">
                                  <RotateCcw size={10} /> {order.returnDate}
                                </span>
                              )}
                            </div>
                            <button onClick={() => setEditingStatusId(order.id)} className="opacity-0 group-hover/st:opacity-100 text-slate-400 hover:text-blue-600 transition-all p-2 bg-white rounded-xl border border-slate-100 shadow-sm active:scale-90"><Edit3 size={16} /></button>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-5 text-right">
                         <div className="flex justify-end gap-1.5">
                           <button onClick={() => setSelectedOrder(order)} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><HistoryIcon size={20} /></button>
                           {isSuperAdmin && <button onClick={() => setDeleteConfirmId(order.id)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={20} /></button>}
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

      {/* History Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-7 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <div>
                 <h3 className="text-xl font-black uppercase text-slate-900 tracking-tight">Timeline Produksi</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Pesanan {selectedOrder.orderId}</p>
               </div>
               <button onClick={() => setSelectedOrder(null)} className="p-3 text-slate-400 hover:text-slate-900 transition-colors bg-white rounded-2xl shadow-sm"><X size={24} /></button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
               <div className="flex flex-col sm:flex-row gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                  <div className="w-full sm:w-32 h-32 bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 flex-shrink-0">
                     {getProductImage(selectedOrder.productId) ? (
                        <img src={getProductImage(selectedOrder.productId)} className="w-full h-full object-cover" alt="" />
                     ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-200 bg-slate-100">
                           <ImageIcon size={32} />
                        </div>
                     )}
                  </div>
                  <div className="flex-1 space-y-4">
                     <div>
                        <h4 className="text-sm font-black text-slate-900 uppercase leading-tight line-clamp-2">{selectedOrder.productName}</h4>
                        <div className={`mt-2 inline-block px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider ${getMarketplaceColor(selectedOrder.marketplace)}`}>
                           {selectedOrder.marketplace}
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                           <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Quantity</p>
                           <p className="text-sm font-black text-slate-900">x{selectedOrder.quantity} Pcs</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-100">
                           <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Ukuran</p>
                           <p className="text-sm font-black text-blue-600">{selectedOrder.size}</p>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="space-y-7 relative">
                  <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-100"></div>
                  {selectedOrder.history && selectedOrder.history.length > 0 ? (
                    selectedOrder.history.map((h, i) => (
                       <div key={i} className="flex gap-5 relative pl-2">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 z-10 border-4 border-white ${i === selectedOrder.history.length - 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-400'}`}>
                            {i + 1}
                          </div>
                          <div className="flex-1 pb-2">
                             <p className={`text-[12px] font-black uppercase ${i === selectedOrder.history.length - 1 ? 'text-blue-600' : 'text-slate-700'}`}>{STATUS_LABELS[h.status]}</p>
                             <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                   <UserIcon size={12} className="text-slate-300" /> {h.updatedBy}
                                </p>
                                <span className="text-slate-200 hidden sm:inline">|</span>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight flex items-center gap-1.5">
                                   <Clock size={12} className="text-slate-300" /> {new Date(h.updatedAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
                             </div>
                          </div>
                       </div>
                    ))
                  ) : (
                    <p className="text-center text-slate-400 text-xs py-14 font-bold uppercase tracking-widest">Belum ada riwayat pengerjaan.</p>
                  )}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in zoom-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 text-center space-y-8 border border-slate-100 shadow-2xl">
              <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto border border-red-100 shadow-xl shadow-red-200/20">
                <Trash2 size={44} />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Hapus Pesanan?</h3>
                <p className="text-[11px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
              <div className="flex flex-col gap-3">
                 <button onClick={() => {onDeleteOrder(deleteConfirmId); setDeleteConfirmId(null);}} className="w-full py-4.5 bg-red-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-red-200 hover:bg-red-700">Hapus Sekarang</button>
                 <button onClick={() => setDeleteConfirmId(null)} className="w-full py-4.5 bg-slate-100 text-slate-500 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em]">Batalkan</button>
              </div>
           </div>
        </div>
      )}

      {/* Return Modal */}
      {returnDateModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-[400px] rounded-[3rem] p-10 space-y-8 shadow-2xl">
              <div className="space-y-3 text-center">
                <h3 className="text-2xl font-black text-slate-900 uppercase">Set Tanggal Return</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kapan pesanan ini kembali ke gudang?</p>
              </div>
              <input type="date" value={returnDateModal.date} onChange={(e) => setReturnDateModal(prev => prev ? {...prev, date: e.target.value} : null)} className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase outline-none focus:border-blue-500 transition-all text-center" />
              <div className="flex flex-col gap-3">
                 <button onClick={confirmReturnDate} className="w-full py-4.5 bg-amber-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-amber-200 hover:bg-amber-600">Simpan Status Return</button>
                 <button onClick={() => setReturnDateModal(null)} className="w-full py-4.5 bg-slate-100 text-slate-500 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em]">Batal</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const getStatusColor = (status: OrderStatus) => {
  if (status === OrderStatus.COMPLETED) return 'bg-green-100 text-green-700 border-green-200';
  if (status === OrderStatus.READY_TO_SHIP) return 'bg-indigo-100 text-indigo-700 border-indigo-200 shadow-sm';
  if (status === OrderStatus.CANCELED) return 'bg-red-100 text-red-700 border-red-200';
  if (status === OrderStatus.RETURNED) return 'bg-amber-100 text-amber-700 border-amber-200';
  if (status.includes('IN_')) return 'bg-blue-600 text-white border-blue-600 shadow-md';
  return 'bg-blue-50 text-blue-600 border-blue-100';
};

export default OrderListView;