import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, OrderType, MARKETPLACE_LIST, STATUS_LABELS } from '../types.ts';
import { Calendar, LayoutGrid, Clock, Store, FileDown, Activity, XCircle, ChevronRight, CheckCircle2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportViewProps {
  orders: Order[];
}

const ReportView: React.FC<ReportViewProps> = ({ orders = [] }) => {
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter orders based on date range
  const filteredOrders = useMemo(() => {
    return orders.filter(o => o.orderDate >= startDate && o.orderDate <= endDate);
  }, [orders, startDate, endDate]);
  
  // Summary Stats
  const stats = useMemo(() => {
    const prodOrders = filteredOrders.filter(o => o.type === OrderType.PRE_ORDER);
    const stockOrders = filteredOrders.filter(o => o.type === OrderType.STOCK);
    
    return {
      total: filteredOrders.length,
      completed: filteredOrders.filter(o => o.status === OrderStatus.COMPLETED).length,
      canceled: filteredOrders.filter(o => o.status === OrderStatus.CANCELED).length,
      productionQty: prodOrders.reduce((sum, o) => sum + (o.quantity || 0), 0),
      stockQty: stockOrders.reduce((sum, o) => sum + (o.quantity || 0), 0)
    };
  }, [filteredOrders]);

  // Production Flow Tracking Logic
  const productionFlow = useMemo(() => {
    return [
      { label: 'Setting', status: [OrderStatus.PENDING_SETTING, OrderStatus.IN_SETTING] },
      { label: 'Print', status: [OrderStatus.PENDING_PRINT, OrderStatus.IN_PRINT] },
      { label: 'Press', status: [OrderStatus.PENDING_PRESS, OrderStatus.IN_PRESS] },
      { label: 'Jahit', status: [OrderStatus.PENDING_JAHIT, OrderStatus.IN_JAHIT] },
      { label: 'Packing', status: [OrderStatus.PENDING_PACKING, OrderStatus.IN_PACKING] },
      { label: 'Siap Kirim', status: [OrderStatus.READY_TO_SHIP] }
    ].map(stage => ({
      ...stage,
      count: filteredOrders.filter(o => stage.status.includes(o.status)).length
    }));
  }, [filteredOrders]);

  // Marketplace Summary Logic
  const marketplaceSummary = useMemo(() => {
    const summary: Record<string, { count: number; qty: number; done: number; canceled: number; pending: number }> = {};
    MARKETPLACE_LIST.forEach(mp => { summary[mp] = { count: 0, qty: 0, done: 0, canceled: 0, pending: 0 }; });

    filteredOrders.forEach(o => {
      if (summary[o.marketplace]) {
        summary[o.marketplace].count += 1;
        summary[o.marketplace].qty += (o.quantity || 0);
        
        if (o.status === OrderStatus.COMPLETED) {
          summary[o.marketplace].done += 1;
        } else if (o.status === OrderStatus.CANCELED) {
          summary[o.marketplace].canceled += 1;
        } else if (o.status !== OrderStatus.RETURNED) {
          summary[o.marketplace].pending += 1;
        }
      }
    });
    return Object.entries(summary).filter(([_, data]) => data.count > 0).sort((a, b) => b[1].count - a[1].count);
  }, [filteredOrders]);

  const grandTotal = useMemo(() => {
    return marketplaceSummary.reduce((acc, [_, data]) => ({
      count: acc.count + data.count,
      qty: acc.qty + data.qty,
      done: acc.done + data.done,
      canceled: acc.canceled + data.canceled,
      pending: acc.pending + data.pending
    }), { count: 0, qty: 0, done: 0, canceled: 0, pending: 0 });
  }, [marketplaceSummary]);

  const handleExportPDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFillColor(15, 23, 42); doc.rect(0, 0, pageWidth, 45, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(24); doc.setFont('helvetica', 'bold');
      doc.text('ERFOLGS STORE', 15, 20);
      doc.setFontSize(10); doc.text('LAPORAN AUDIT PRODUKSI & MARKETPLACE', 15, 28);
      doc.text(`Periode: ${startDate} s/d ${endDate}`, 15, 34);

      autoTable(doc, {
        startY: 55,
        head: [['Indikator Performa', 'Hasil']],
        body: [
          ['Total Pesanan Masuk', `${stats.total}`], 
          ['Volume Produksi PO (Pcs)', `${stats.productionQty}`], 
          ['Volume Ambil Stok (Pcs)', `${stats.stockQty}`], 
          ['Pesanan Selesai (Completed)', `${stats.completed}`],
          ['Pesanan Dibatalkan (Canceled)', `${stats.canceled}`]
        ],
        theme: 'striped',
      });

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Tahapan Produksi', 'Jumlah Antrian']],
        body: productionFlow.map(s => [s.label, `${s.count} Pesanan`]),
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] }
      });

      const tableBody = marketplaceSummary.map(([name, data]) => [name, data.count, data.qty, data.done, data.canceled, data.pending]);
      tableBody.push(['TOTAL KESELURUHAN', grandTotal.count, grandTotal.qty, grandTotal.done, grandTotal.canceled, grandTotal.pending]);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Marketplace', 'Order', 'Qty', 'Done', 'Batal', 'Antri']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59] }
      });

      doc.save(`AUDIT_ERFOLGS_${startDate}.pdf`);
    } catch (error) { console.error(error); } finally { setIsGenerating(false); }
  };

  return (
    <div className="space-y-10 pb-24 animate-in fade-in duration-500">
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col xl:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-200">
            <LayoutGrid size={32} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Audit & Rekapitulasi</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Laporan harian lintas marketplace</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-3 rounded-[2rem] border border-slate-200">
          <div className="flex items-center gap-3 px-4 py-2">
            <Calendar size={18} className="text-blue-600" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dari</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent font-black text-sm outline-none" />
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-2">
            <Calendar size={18} className="text-blue-600" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sampai</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent font-black text-sm outline-none" />
            </div>
          </div>
          <button onClick={handleExportPDF} disabled={isGenerating} className="sm:ml-4 flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg disabled:opacity-50 transition-all hover:bg-black active:scale-95">
            {isGenerating ? <Clock size={18} className="animate-spin" /> : <FileDown size={18} />}
            {isGenerating ? 'MENGOLAH...' : 'CETAK PDF'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm group">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Pesanan</p>
          <p className="text-3xl font-black text-slate-900 tracking-tighter">{stats.total}</p>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm group">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vol. Produksi (PO)</p>
          <p className="text-3xl font-black text-indigo-900 tracking-tighter">{stats.productionQty}</p>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm group">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vol. Ambil Stok</p>
          <p className="text-3xl font-black text-orange-900 tracking-tighter">{stats.stockQty}</p>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm group">
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Selesai</p>
          <p className="text-3xl font-black text-emerald-900 tracking-tighter">{stats.completed}</p>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm group">
          <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Dibatalkan</p>
          <p className="text-3xl font-black text-red-900 tracking-tighter">{stats.canceled}</p>
        </div>
      </div>

      <div className="bg-indigo-900 p-8 md:p-12 rounded-[3rem] border border-indigo-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -mr-48 -mt-48"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white border border-white/20">
              <Activity size={24} />
            </div>
            <div>
              <h4 className="text-xl font-black text-white uppercase tracking-tight">Tracking Pipa Produksi</h4>
              <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Distribusi antrian per tahapan hari ini</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {productionFlow.map((stage, idx) => (
              <div key={stage.label} className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-all group relative">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-10 h-10 bg-indigo-500/20 text-indigo-300 rounded-full flex items-center justify-center text-lg font-black group-hover:scale-110 transition-transform">
                    {stage.count}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">{stage.label}</p>
                  </div>
                </div>
                {idx < productionFlow.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-20 text-indigo-500/50">
                    <ChevronRight size={24} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
         <div className="mb-10">
            <h4 className="font-black text-2xl text-slate-900 uppercase tracking-tighter flex items-center gap-4">
              <Store className="text-blue-600" size={28} /> Rekapan Per Marketplace
            </h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Laporan pesanan masuk, qty, selesai, dan dibatalkan</p>
         </div>

         <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-slate-50/80 border-b-2 border-slate-200">
                     <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Marketplace</th>
                     <th className="px-6 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Order</th>
                     <th className="px-6 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Qty</th>
                     <th className="px-6 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Done</th>
                     <th className="px-6 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Batal</th>
                     <th className="px-6 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Antri</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {marketplaceSummary.map(([name, data]) => (
                    <tr key={name} className="hover:bg-slate-50 transition-colors group">
                       <td className="px-8 py-6"><span className="text-sm font-black text-slate-900 uppercase">{name}</span></td>
                       <td className="px-6 py-6 text-center text-slate-900 font-black">{data.count}</td>
                       <td className="px-6 py-6 text-center text-blue-600 font-black">{data.qty}</td>
                       <td className="px-6 py-6 text-center"><span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black">{data.done}</span></td>
                       <td className="px-6 py-6 text-center"><span className="px-4 py-1.5 bg-red-50 text-red-600 rounded-full text-[9px] font-black">{data.canceled}</span></td>
                       <td className="px-6 py-6 text-center"><span className="px-4 py-1.5 bg-orange-50 text-orange-600 rounded-full text-[9px] font-black">{data.pending}</span></td>
                    </tr>
                  ))}
                  <tr className="bg-slate-900 text-white font-black">
                     <td className="px-8 py-6">TOTAL KESELURUHAN</td>
                     <td className="px-6 py-6 text-center">{grandTotal.count}</td>
                     <td className="px-6 py-6 text-center text-blue-400">{grandTotal.qty}</td>
                     <td className="px-6 py-6 text-center text-emerald-400">{grandTotal.done}</td>
                     <td className="px-6 py-6 text-center text-red-400">{grandTotal.canceled}</td>
                     <td className="px-6 py-6 text-center text-orange-400">{grandTotal.pending}</td>
                  </tr>
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default ReportView;