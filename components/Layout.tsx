import React, { useState } from 'react';
import { UserRole, ROLE_LABELS, ViewType } from '../types';
import { User, LayoutDashboard, Package, Settings, Truck, Printer, Scissors, Flame, CirclePlus, BookOpen, List, FileText, LogOut, ShieldCheck, Activity, Menu, X } from 'lucide-react';

interface LayoutProps {
  // Fixed: Change React.Node to React.ReactNode
  children: React.ReactNode;
  userRole: UserRole;
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, userRole, currentView, onViewChange, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isSuperAdmin = userRole === UserRole.SUPERADMIN;
  const isAdminMarketplace = userRole === UserRole.ADMIN_MARKETPLACE;
  const isManager = isSuperAdmin || isAdminMarketplace;

  const handleViewChange = (view: ViewType) => {
    onViewChange(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-50 w-full overflow-hidden">
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 z-30">
        <h1 className="text-xl font-black text-blue-600 tracking-tighter">ERFOLGS</h1>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-600 bg-slate-100 rounded-xl"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col h-full z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 flex-shrink-0 hidden md:block">
          <h1 className="text-2xl font-black text-blue-600 tracking-tighter">ERFOLGS STORE</h1>
          <p className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-[0.2em]">Cloud Production System</p>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar pb-6 mt-4 md:mt-0">
          {isManager ? (
            <>
              <div className="text-[10px] font-black text-slate-400 px-4 py-3 uppercase tracking-[0.25em]">Menu Utama</div>
              <button
                onClick={() => handleViewChange(ViewType.DASHBOARD)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                  currentView === ViewType.DASHBOARD ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <LayoutDashboard size={20} /> Dashboard
              </button>
              <button
                onClick={() => handleViewChange(ViewType.INPUT_ORDER)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                  currentView === ViewType.INPUT_ORDER ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CirclePlus size={20} /> Input Pesanan
              </button>
              <button
                onClick={() => handleViewChange(ViewType.ORDER_LIST)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                  currentView === ViewType.ORDER_LIST ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <List size={20} /> Daftar Pesanan
              </button>
              <button
                onClick={() => handleViewChange(ViewType.CATALOG)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                  currentView === ViewType.CATALOG ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <BookOpen size={20} /> Katalog Produk
              </button>
              
              {isSuperAdmin && (
                <>
                  <div className="text-[10px] font-black text-slate-400 px-4 py-3 mt-4 uppercase tracking-[0.25em] border-t border-slate-50">Otoritas Owner</div>
                  <button
                    onClick={() => handleViewChange(ViewType.TASKS)}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                      currentView === ViewType.TASKS ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Activity size={20} /> Monitor Produksi
                  </button>
                  <button
                    onClick={() => handleViewChange(ViewType.REPORT)}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                      currentView === ViewType.REPORT ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <FileText size={20} className={currentView === ViewType.REPORT ? 'text-blue-400' : ''} /> Laporan & Audit
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <div className="text-[10px] font-black text-slate-400 px-4 py-3 uppercase tracking-[0.25em]">Workspace Operator</div>
              <button
                className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-sm font-black bg-blue-50 text-blue-700 border border-blue-100 shadow-sm"
              >
                {userRole === UserRole.SETTING && <Settings size={22} />}
                {userRole === UserRole.PRINT && <Printer size={22} />}
                {userRole === UserRole.PRESS && <Flame size={22} />}
                {userRole === UserRole.JAHIT && <Scissors size={22} />}
                {userRole === UserRole.PACKING && <Package size={22} />}
                Antrian {ROLE_LABELS[userRole]}
              </button>
            </>
          )}
        </nav>

        <div className="p-6 border-t border-slate-100 space-y-3 bg-white flex-shrink-0">
          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center font-black shadow-sm border border-slate-100 text-lg flex-shrink-0 ${isSuperAdmin ? 'bg-slate-900 text-blue-400' : 'bg-white text-blue-600'}`}>
              {isSuperAdmin ? <ShieldCheck size={20} /> : userRole[0]}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[10px] md:text-xs font-black text-slate-900 truncate uppercase tracking-wider">{ROLE_LABELS[userRole]}</p>
              <p className="text-[9px] text-emerald-500 font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Online
              </p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-red-500 bg-red-50 hover:bg-red-100 text-[10px] font-black uppercase tracking-[0.2em] transition-all"
          >
            <LogOut size={14} /> Keluar
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-50 relative overflow-hidden">
        
        {/* Header Desktop (Hidden on Mobile) */}
        <header className="hidden md:flex justify-between items-center p-6 md:px-10 border-b border-slate-200 bg-white flex-shrink-0 no-print shadow-sm z-10">
          <div className="flex-1 mr-4">
            <h2 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight truncate">
              {currentView === ViewType.DASHBOARD && 'Ringkasan Produksi Global'}
              {currentView === ViewType.INPUT_ORDER && 'Penerimaan Pesanan Marketplace'}
              {currentView === ViewType.ORDER_LIST && 'Manajemen Seluruh Pesanan'}
              {currentView === ViewType.REPORT && 'Laporan Audit Produksi'}
              {currentView === ViewType.CATALOG && 'Manajemen Katalog Produk'}
              {currentView === ViewType.TASKS && (isSuperAdmin ? 'Monitor Antrian Produksi' : `Tugas Operasional: ${ROLE_LABELS[userRole]}`)}
            </h2>
          </div>
          <div className="flex items-center gap-3 md:gap-6 flex-shrink-0">
             <div className="text-right hidden lg:block">
                <p className="text-xs font-black text-slate-900 uppercase tracking-widest">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">ERFOLGS v2.5</p>
             </div>
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${isSuperAdmin ? 'bg-slate-900 text-blue-400 border-slate-800' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                {isSuperAdmin ? <ShieldCheck size={20} /> : <User size={20} />}
             </div>
          </div>
        </header>

        {/* Dynamic Title for Mobile */}
        <div className="md:hidden bg-white px-4 py-3 border-b border-slate-100">
           <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">
              {currentView.replace('_', ' ')}
           </h2>
        </div>

        <main className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-10 bg-slate-50 pb-20 md:pb-10">
          <div className="max-w-full">
             {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;