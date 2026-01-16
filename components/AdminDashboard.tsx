import React from 'react';
import { Order, OrderStatus, STATUS_LABELS, CatalogProduct } from '../types';
import { Search, Clock, Package, CircleCheck, Activity, CircleAlert, ImageIcon } from 'lucide-react';

interface AdminDashboardProps {
  orders: Order[];
  catalog: CatalogProduct[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ orders, catalog }) => {
  const today = new Date().toISOString().split('T')[0];
  
  // Logic for Deadlines: Orders from previous days not yet completed, canceled or returned
  const deadlineOrders = orders.filter(o => 
    o.orderDate < today && 
    o.status !== OrderStatus.COMPLETED && 
    o.status !== OrderStatus.CANCELED &&
    o.status !== OrderStatus.RETURNED
  );

  const getStageCount = (stages: OrderStatus[]) => 
    orders.filter(o => stages.includes(o.status)).length;

  const getProductImage = (productId: string) => {
    return catalog.find(p => p.id === productId)?.image || '';
  };

  const summaries = [
    { label: 'Antrian Setting', value: getStageCount([OrderStatus.PENDING_SETTING, OrderStatus.IN_SETTING]), icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Proses Print/Press', value: getStageCount([OrderStatus.PENDING_PRINT, OrderStatus.IN_PRINT, OrderStatus.PENDING_PRESS, OrderStatus.IN_PRESS]), icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Proses Jahit', value: getStageCount([OrderStatus.PENDING_JAHIT, OrderStatus.IN_JAHIT]), icon: Package, color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: 'Packing & Siap', value: getStageCount([OrderStatus.PENDING_PACKING, OrderStatus.IN_PACKING, OrderStatus.READY_TO_SHIP]), icon: CircleCheck, color: 'text-green-500', bg: 'bg-green-50' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Summary Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaries.map((summary) => (
          <div key={summary.label} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-3">
              <div className={`${summary.bg} p-2.5 rounded-2xl`}>
                <summary.icon className={summary.color} size={22} />
              </div>
              <span className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{summary.label}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-black text-gray-900">{summary.value}</p>
              <p className="text-[10px] font-bold text-gray-400">Pesanan Aktif</p>
            </div>
          </div>
        ))}
      </div>

      {/* Deadline Priorities (Production Debt) */}
      {deadlineOrders.length > 0 && (
        <div className="bg-red-50 border-2 border-red-100 rounded-[32px] p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-red-600">
              <div className="bg-red-600 text-white p-2 rounded-xl animate-pulse">
                <CircleAlert size={22} />
              </div>
              <div>
                <h3 className="font-black text-lg uppercase tracking-tight">Hutang Produksi (Deadline)</h3>
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Urgent: Pesanan melewati estimasi waktu</p>
              </div>
            </div>
            <div className="bg-white px-4 py-2 rounded-2xl border border-red-100 shadow-sm">
              <span className="text-red-600 font-black text-xl">{deadlineOrders.length}</span>
              <span className="text-[10px] font-black text-slate-400 ml-2 uppercase">Pesanan</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {deadlineOrders.map(order => (
              <div key={order.id} className="bg-white p-5 rounded-3xl flex items-start gap-4 shadow-sm border border-red-100 hover:shadow-xl hover:shadow-red-500/5 transition-all">
                <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-slate-50 border border-slate-100 shadow-sm">
                   {getProductImage(order.productId) ? (
                     <img src={getProductImage(order.productId)} className="w-full h-full object-cover" alt="" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-slate-200"><ImageIcon size={24} /></div>
                   )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-black text-slate-900">#{order.orderId}</p>
                    <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase shadow-sm border border-red-200">
                      {order.marketplace}
                    </span>
                  </div>
                  <p className="text-[11px] font-black text-red-500 uppercase mt-1">{STATUS_LABELS[order.status]}</p>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400 font-bold uppercase">
                    <Clock size={12} />
                    Input: {order.orderDate}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Production Tracking Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between gap-4 items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Live Tracking Produksi</h3>
            <p className="text-xs text-gray-500">Monitoring real-time alur pengerjaan dengan foto produk</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari ID Pesanan..." 
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Produk</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Detail Pesanan</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Marketplace</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-gray-400 italic text-sm">Belum ada pesanan masuk.</td>
                </tr>
              ) : (
                orders.map((order) => {
                  const img = getProductImage(order.productId);
                  return (
                    <tr key={order.id} className="hover:bg-blue-50/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="w-12 h-12 rounded-xl border border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center">
                          {img ? <img src={img} className="w-full h-full object-cover" alt="" /> : <ImageIcon size={20} className="text-gray-200" />}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-black text-gray-900 text-sm">#{order.orderId}</div>
                        <div className="text-[11px] font-bold text-gray-500">{order.productName}</div>
                        <div className="text-[10px] text-gray-400">Size: {order.size} | Qty: {order.quantity}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="px-2 py-0.5 bg-white border border-gray-100 text-gray-700 rounded-lg text-[9px] font-black shadow-sm self-start">
                            {order.marketplace}
                          </span>
                          <span className="text-[10px] text-gray-400">{order.orderDate}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 min-w-[200px]">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-black uppercase">
                            <span className={order.status === OrderStatus.COMPLETED ? 'text-green-600' : 'text-blue-600'}>
                              {STATUS_LABELS[order.status]}
                            </span>
                            <span className="text-gray-400">{getProgressPercentage(order.status)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                             <div 
                                className={`h-full transition-all duration-1000 ${getProgressColor(order.status)}`}
                                style={{ width: `${getProgressPercentage(order.status)}%` }}
                             ></div>
                          </div>
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
    </div>
  );
};

const getProgressPercentage = (status: OrderStatus) => {
  const steps = Object.values(OrderStatus);
  const index = steps.indexOf(status);
  if (index === -1) return 0;
  return Math.round(((index + 1) / steps.length) * 100);
};

const getProgressColor = (status: OrderStatus) => {
  if (status === OrderStatus.COMPLETED) return 'bg-green-500';
  if (status === OrderStatus.CANCELED) return 'bg-red-400';
  if (status === OrderStatus.RETURNED) return 'bg-amber-500';
  if (status === OrderStatus.READY_TO_SHIP) return 'bg-indigo-500';
  return 'bg-blue-500';
};

export default AdminDashboard;