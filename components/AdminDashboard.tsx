import React from 'react';
import { Order, OrderStatus, STATUS_LABELS, CatalogProduct } from '../types';
import { Search, Clock, Package, CircleCheck, Activity, CircleAlert, ImageIcon } from 'lucide-react';

interface AdminDashboardProps {
  orders: Order[];
  catalog: CatalogProduct[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ orders, catalog }) => {
  const today = new Date().toISOString().split('T')[0];
  
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
    { label: 'Setting', value: getStageCount([OrderStatus.PENDING_SETTING, OrderStatus.IN_SETTING]), icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Print/Press', value: getStageCount([OrderStatus.PENDING_PRINT, OrderStatus.IN_PRINT, OrderStatus.PENDING_PRESS, OrderStatus.IN_PRESS]), icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Jahit', value: getStageCount([OrderStatus.PENDING_JAHIT, OrderStatus.IN_JAHIT]), icon: Package, color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: 'Packing', value: getStageCount([OrderStatus.PENDING_PACKING, OrderStatus.IN_PACKING, OrderStatus.READY_TO_SHIP]), icon: CircleCheck, color: 'text-green-500', bg: 'bg-green-50' },
  ];

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      
      {/* Summary Section - Optimized for Mobile (2 columns) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {summaries.map((summary) => (
          <div key={summary.label} className="bg-white p-4 md:p-5 rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div className={`${summary.bg} p-2 rounded-lg md:rounded-xl`}>
                <summary.icon className={summary.color} size={18} />
              </div>
            </div>
            <p className="text-[9px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">{summary.label}</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <p className="text-xl md:text-3xl font-black text-gray-900">{summary.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Deadline Priorities (Production Debt) */}
      {deadlineOrders.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-[2rem] p-5 md:p-8 space-y-4 md:space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-red-600">
              <div className="bg-red-600 text-white p-2 rounded-xl">
                <CircleAlert size={20} />
              </div>
              <div>
                <h3 className="font-black text-sm md:text-lg uppercase tracking-tight">Hutang Produksi</h3>
                <p className="text-[8px] md:text-[10px] font-bold text-red-400 uppercase tracking-widest">Melewati Deadline</p>
              </div>
            </div>
            <div className="bg-white px-3 py-1.5 rounded-xl border border-red-100">
              <span className="text-red-600 font-black text-base md:text-xl">{deadlineOrders.length}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
            {deadlineOrders.slice(0, 6).map(order => (
              <div key={order.id} className="bg-white p-4 rounded-2xl flex items-center gap-4 shadow-sm border border-red-50">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-slate-50">
                   <img src={getProductImage(order.productId) || ''} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-black text-slate-900 truncate">#{order.orderId}</p>
                    <span className="text-[7px] font-black uppercase text-red-500">{order.marketplace.split(' ')[0]}</span>
                  </div>
                  <p className="text-[9px] font-black text-red-500 uppercase truncate">{STATUS_LABELS[order.status]}</p>
                </div>
              </div>
            ))}
            {deadlineOrders.length > 6 && (
              <div className="flex items-center justify-center p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                + {deadlineOrders.length - 6} pesanan lainnya...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Production Tracking Table - Simplified for Desktop, kept scrollable for tablet */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between gap-4 items-center">
          <div>
            <h3 className="text-sm md:text-lg font-bold text-gray-800">Tracking Produksi</h3>
            <p className="text-[10px] md:text-xs text-gray-500">Monitoring real-time alur pengerjaan</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-5 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Order</th>
                <th className="px-5 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.slice(0, 10).map((order) => (
                <tr key={order.id}>
                  <td className="px-5 py-4">
                    <div className="font-black text-gray-900 text-xs">#{order.orderId}</div>
                    <div className="text-[10px] text-gray-400 truncate max-w-[120px]">{order.productName}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-between gap-4">
                       <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[100px]">
                          <div className={`h-full bg-blue-500`} style={{ width: `${Math.round(((Object.values(OrderStatus).indexOf(order.status) + 1) / Object.values(OrderStatus).length) * 100)}%` }}></div>
                       </div>
                       <span className="text-[9px] font-black text-blue-600 whitespace-nowrap uppercase">{STATUS_LABELS[order.status].split(' ')[0]}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;