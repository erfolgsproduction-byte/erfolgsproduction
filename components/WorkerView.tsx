import React, { useState } from 'react';
import { Order, OrderStatus, UserRole, STATUS_LABELS, ROLE_LABELS, CatalogProduct } from '../types';
import { CircleCheck, ChevronRight, Clock, MapPin, User as UserIcon, ImageIcon, History as HistoryIcon, Settings, Printer, Flame, Scissors, Package, ShieldCheck } from 'lucide-react';

interface WorkerViewProps {
  role: UserRole;
  orders: Order[];
  catalog: CatalogProduct[];
  onUpdateStatus: (orderId: string, nextStatus: OrderStatus) => void;
}

const WorkerView: React.FC<WorkerViewProps> = ({ role, orders, catalog, onUpdateStatus }) => {
  const isSuperAdmin = role === UserRole.SUPERADMIN;
  
  // State for SuperAdmin to switch departments
  const [activeDept, setActiveDept] = useState<UserRole>(
    isSuperAdmin ? UserRole.SETTING : role
  );

  const roleConfig: Record<string, { current: OrderStatus; inProgress: OrderStatus; next: OrderStatus; icon: any }> = {
    [UserRole.SETTING]: { 
      current: OrderStatus.PENDING_SETTING, 
      inProgress: OrderStatus.IN_SETTING, 
      next: OrderStatus.PENDING_PRINT,
      icon: Settings
    },
    [UserRole.PRINT]: { 
      current: OrderStatus.PENDING_PRINT, 
      inProgress: OrderStatus.IN_PRINT, 
      next: OrderStatus.PENDING_PRESS,
      icon: Printer
    },
    [UserRole.PRESS]: { 
      current: OrderStatus.PENDING_PRESS, 
      inProgress: OrderStatus.IN_PRESS, 
      next: OrderStatus.PENDING_JAHIT,
      icon: Flame
    },
    [UserRole.JAHIT]: { 
      current: OrderStatus.PENDING_JAHIT, 
      inProgress: OrderStatus.IN_JAHIT, 
      next: OrderStatus.PENDING_PACKING,
      icon: Scissors
    },
    [UserRole.PACKING]: { 
      current: OrderStatus.PENDING_PACKING, 
      inProgress: OrderStatus.IN_PACKING, 
      next: OrderStatus.READY_TO_SHIP,
      icon: Package
    }
  };

  const config = roleConfig[activeDept];
  const pendingOrders = orders.filter(o => o.status === config.current || o.status === config.inProgress);

  const getProductImage = (productId: string) => {
    return catalog.find(p => p.id === productId)?.image || '';
  };

  return (
    <div className="space-y-8">
      {/* SuperAdmin Authority Selector */}
      {isSuperAdmin && (
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-indigo-100 shadow-xl shadow-indigo-50/50 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">SuperAdmin Control Center</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Pilih antrian departemen untuk dikelola</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.keys(roleConfig).map((roleKey) => {
              const Icon = roleConfig[roleKey].icon;
              const isActive = activeDept === roleKey;
              const count = orders.filter(o => o.status === roleConfig[roleKey].current || o.status === roleConfig[roleKey].inProgress).length;
              
              return (
                <button
                  key={roleKey}
                  onClick={() => setActiveDept(roleKey as UserRole)}
                  className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all group ${
                    isActive 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' 
                    : 'bg-slate-50 border-transparent text-slate-400 hover:bg-white hover:border-indigo-200 hover:text-indigo-600'
                  }`}
                >
                  <Icon size={24} className={`mb-2 transition-transform group-hover:scale-110 ${isActive ? 'text-indigo-200' : ''}`} />
                  <span className="text-[9px] font-black uppercase tracking-wider text-center leading-tight">
                    {ROLE_LABELS[roleKey as UserRole].split(' (')[0].replace('Tim ', '')}
                  </span>
                  {count > 0 && (
                    <span className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm ${isActive ? 'bg-white text-indigo-600' : 'bg-red-500 text-white'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm min-h-[400px]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <h3 className="text-2xl font-black text-slate-900 flex items-center gap-4 uppercase tracking-tighter">
            <div className="w-1.5 h-8 bg-blue-600 rounded-full"></div>
            Antrian {ROLE_LABELS[activeDept]}
          </h3>
          <div className="px-5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl">
             <span className="text-xl font-black text-blue-600">{pendingOrders.length}</span>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Pesanan Menunggu</span>
          </div>
        </div>
        
        {pendingOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-8 border border-emerald-100 shadow-inner">
              <CircleCheck size={48} />
            </div>
            <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Semua Beres!</h4>
            <p className="text-sm text-slate-400 font-medium max-w-xs mt-2">Tidak ada tugas tertunda di departemen ini. Silakan pantau departemen lain.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {pendingOrders.map((order) => {
              const img = getProductImage(order.productId);
              return (
                <div key={order.id} className="group relative bg-white border border-slate-100 rounded-[2rem] p-6 hover:shadow-2xl hover:shadow-slate-200/50 transition-all hover:-translate-y-1 flex flex-col sm:flex-row gap-6 overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-bl-[4rem] -mr-8 -mt-8 transition-all group-hover:scale-150"></div>
                  
                  <div className="w-full sm:w-40 h-40 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 flex-shrink-0 relative z-10 shadow-sm">
                    {img ? (
                      <img src={img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200">
                        <ImageIcon size={48} />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 px-3 py-1 bg-black/70 backdrop-blur-md rounded-lg text-[10px] font-black text-white uppercase tracking-widest">
                      {order.size}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-between relative z-10">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">{order.marketplace}</span>
                        <span className="text-[10px] font-black text-slate-300 uppercase">ID: {order.orderId}</span>
                      </div>
                      <h4 className="text-lg font-black text-slate-900 leading-tight uppercase tracking-tight line-clamp-2 mb-2">{order.productName}</h4>
                      
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Kuantitas</span>
                          <span className="text-sm font-black text-slate-900">x{order.quantity} Pcs</span>
                        </div>
                        {order.backName && (
                          <div className="flex flex-col">
                             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Kustom Nama</span>
                             <span className="text-[11px] font-black text-indigo-600 uppercase tracking-wider">{order.backName} #{order.backNumber || '0'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-2">
                      <div className="flex items-center gap-2 mb-1">
                         <div className={`w-2 h-2 rounded-full ${order.status === config.inProgress ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`}></div>
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{STATUS_LABELS[order.status]}</span>
                      </div>
                      
                      {order.status === config.current ? (
                        <button 
                          onClick={() => onUpdateStatus(order.id, config.inProgress)}
                          className="w-full py-4 bg-white border-2 border-blue-600 text-blue-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-3 group/btn shadow-lg shadow-blue-50"
                        >
                          Mulai Pengerjaan
                          <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                      ) : (
                        <button 
                          onClick={() => onUpdateStatus(order.id, config.next)}
                          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-3 active:scale-95"
                        >
                          Konfirmasi Selesai
                          <CircleCheck size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History Log Section */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
           <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
             <HistoryIcon size={18} className="text-indigo-400" />
             Riwayat Otoritas {ROLE_LABELS[activeDept]} Hari Ini
           </h4>
        </div>
        
        <div className="space-y-3">
          {orders.filter(o => o.history?.some(h => h.status === config.next)).length === 0 ? (
            <div className="py-12 border-2 border-dashed border-slate-50 rounded-3xl text-center">
              <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.4em]">Belum ada riwayat penyelesaian hari ini.</p>
            </div>
          ) : (
            orders.filter(o => o.history?.some(h => h.status === config.next)).slice(0, 10).map(order => {
              const latestUpdate = [...(order.history || [])].reverse().find(h => h.status === config.next);
              return (
                <div key={`history-${order.id}`} className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-indigo-100 transition-colors gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl border border-white shadow-sm overflow-hidden bg-white">
                      <img src={getProductImage(order.productId)} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div>
                      <p className="text-[13px] font-black text-slate-900 tracking-tight uppercase">#{order.orderId} - {order.productName}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                        <UserIcon size={10} className="text-indigo-500" /> 
                        Operator: <span className="text-slate-900">{latestUpdate?.updatedBy}</span> • {new Date(latestUpdate?.updatedAt || '').toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black border border-emerald-100 uppercase tracking-widest shadow-sm">
                      VERIFIED DONE
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkerView;