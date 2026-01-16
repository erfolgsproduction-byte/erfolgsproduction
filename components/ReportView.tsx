import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, OrderType, MARKETPLACE_LIST } from '../types';
import { Calendar, ShoppingCart, Check, Package, LayoutGrid, Clock, Store, FileDown, Box, Database, Copy, CheckCircle2 } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);

  const fullSqlSchema = `-- JALANKAN INI DI SQL EDITOR SUPABASE
create table if not exists orders (
  id text primary key,
  "orderId" text not null,
  resi text,
  "productId" text,
  "productName" text,
  size text,
  quantity integer,
  "orderDate" text,
  expedition text,
  marketplace text,
  type text,
  status text,
  history jsonb,
  "returnDate" text
);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(fullSqlSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter orders based on date range
  const filteredOrders = useMemo(() => {
    return orders.filter(o => o.orderDate >= startDate && o.orderDate <= endDate);
  }, [orders, startDate, endDate]);
  
  // Advanced Stats
  const stats = useMemo(() => {
    const prodOrders = filteredOrders.filter(o => o.type === OrderType.PRE_ORDER);
    const stockOrders = filteredOrders.filter(o => o.type === OrderType.STOCK);
    
    return {
      total: filteredOrders.length,
      completed: filteredOrders.filter(o => o.status === OrderStatus.COMPLETED).length,
      productionQty: prodOrders.reduce((sum, o) => sum + (o.quantity || 0), 0),
      stockQty: stockOrders.reduce((sum, o) => sum + (o.quantity || 0), 0),
      totalQty: filteredOrders.reduce((sum, o) => sum + (o.quantity || 0), 0)
    };
  }, [filteredOrders]);

  const marketplaceSummary = useMemo(() => {
    const summary: Record<string, { count: number; qty: number; done: number; pending: number }> = {};
    MARKETPLACE_LIST.forEach(mp => { summary[mp] = { count: 0, qty: 0, done: 0, pending: 0 }; });

    filteredOrders.forEach(o => {
      if (summary[o.marketplace]) {
        summary[o.marketplace].count += 1;
        summary[o.marketplace].qty += (o.quantity || 0);
        if (o.status === OrderStatus.COMPLETED) summary[o.marketplace].done += 1;
        else if (o.status !== OrderStatus.CANCELED && o.status !== OrderStatus.RETURNED) summary[o.marketplace].pending += 1;
      }
    });
    return Object.entries(summary).filter(([_, data]) => data.count > 0).sort((a, b) => b[1].count - a[1].count);
  }, [filteredOrders]);

  const grandTotal = useMemo(() => {
    return marketplaceSummary.reduce((acc, [_, data]) => ({
      count: acc.count + data.count,
      qty: acc.qty + data.qty,
      done: acc.done + data.done,
      pending: acc.pending + data.pending
    }), { count: 0, qty: 0, done: 0, pending: 0 });
  }, [marketplaceSummary]);

  const handleExportPDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFillColor(15, 23, 42); doc.rect(0, 0, pageWidth, 45, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(24); doc.setFont('helvetica', 'bold');
      doc.text('ERFOLGS STORE', 15, 20);
      doc.setFontSize(10); doc.text('LAPORAN AUDIT & REKAPITULASI PRODUKSI', 15, 28);
      doc.text(`Periode: ${startDate} s/d ${endDate}`, 15, 34);

      autoTable(doc, {
        startY: 55,
        head: [['Indikator', 'Hasil']],
        body: [['Total Order', `${stats.total}`], ['Volume Produksi (PO)', `${stats.productionQty} Pcs`], ['Ambil Stok', `${stats.stockQty} Pcs`], ['Selesai', `${stats.completed}`]],
        theme: 'striped',
      });

      const tableBody = marketplaceSummary.map(([name, data]) => [name, data.count, data.qty, data.done, data.pending]);
      tableBody.push(['TOTAL', grandTotal.count, grandTotal.qty, grandTotal.done, grandTotal.pending]);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 15,
        head: [['Marketplace', 'Order', 'Qty', 'Done', 'Antri']],
        body: tableBody,
        theme: 'grid',
      });

      doc.save(`LAPORAN_ERFOLGS_${startDate}.pdf`);
    } catch (error) { console.error(error); } finally { setIsGenerating(false); }
  };

  return (
    <div className="space-y-10 pb-24">
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
          <button onClick={handleExportPDF} disabled={isGenerating} className="sm:ml-4 flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg disabled:opacity-50">
            {isGenerating ? <Clock size={18} className="animate-spin" /> : <FileDown size={18} />}
            {isGenerating ? 'MENGOLAH...' : 'CETAK PDF'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Pesanan</p>
          <p className="text-3xl font-black text-slate-900 tracking-tighter">{stats.total}</p>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Produksi (PO)</p>
          <p className="text-3xl font-black text-indigo-900 tracking-tighter">{stats.productionQty}</p>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ambil Stok</p>
          <p className="text-3xl font-black text-orange-900 tracking-tighter">{stats.stockQty}</p>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Selesai</p>
          <p className="text-3xl font-black text-emerald-900 tracking-tighter">{stats.completed}</p>
        </div>
      </div>

      {/* SQL Helper Section */}
      <div className="bg-slate-900 p-8 md:p-10 rounded-[3rem] border border-slate-800 shadow-2xl overflow-hidden relative group">
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
         <div className="relative z-10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/20">
                     <Database size={24} />
                  </div>
                  <div>
                     <h4 className="text-lg font-black text-white uppercase tracking-tight">Setup Database Helper</h4>
                     <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Gunakan ini untuk sinkronisasi tabel Supabase Anda</p>
                  </div>
               </div>
               <button 
                onClick={handleCopySql}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
               >
                 {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                 {copied ? 'BERHASIL DISALIN' : 'SALIN SQL SCHEMA'}
               </button>
            </div>
            <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 font-mono text-xs text-blue-400 overflow-x-auto custom-scrollbar">
               <pre className="leading-relaxed">
                  {fullSqlSchema}
               </pre>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-800/50 w-fit px-4 py-2 rounded-lg">
               <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
               PENTING: Jalankan kode di atas pada SQL Editor Supabase jika kolom returnDate tidak ditemukan.
            </div>
         </div>
      </div>

      <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
         <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-4">
            <div>
               <h4 className="font-black text-2xl text-slate-900 uppercase tracking-tighter flex items-center gap-4">
                 <Store className="text-blue-600" size={28} /> Rekapan Per Marketplace
               </h4>
            </div>
         </div>

         <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-slate-50/80 border-b-2 border-slate-200">
                     <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Marketplace</th>
                     <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Order</th>
                     <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Qty</th>
                     <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Selesai</th>
                     <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Antrian</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {marketplaceSummary.map(([name, data]) => (
                    <tr key={name} className="hover:bg-slate-50 transition-colors">
                       <td className="px-8 py-6"><span className="text-sm font-black text-slate-900 uppercase">{name}</span></td>
                       <td className="px-8 py-6 text-center text-slate-900 font-black">{data.count}</td>
                       <td className="px-8 py-6 text-center text-blue-600 font-black">{data.qty}</td>
                       <td className="px-8 py-6 text-center"><span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black">{data.done}</span></td>
                       <td className="px-8 py-6 text-center"><span className="px-4 py-1.5 bg-orange-50 text-orange-600 rounded-full text-[9px] font-black">{data.pending}</span></td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default ReportView;