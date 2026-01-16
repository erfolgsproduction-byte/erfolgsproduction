import React, { useState, useEffect } from 'react';
import Layout from './components/Layout.tsx';
import Login from './components/Login.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import WorkerView from './components/WorkerView.tsx';
import CatalogView from './components/CatalogView.tsx';
import InputOrderView from './components/InputOrderView.tsx';
import OrderListView from './components/OrderListView.tsx';
import ReportView from './components/ReportView.tsx';
import { UserRole, Order, OrderStatus, CatalogProduct, OrderType, ViewType } from './types.ts';
import { supabase } from './services/supabase.ts';
import { ShieldAlert } from 'lucide-react';

const STORAGE_KEY = 'erfolgs_last_view';

interface UserProfile {
  role: UserRole;
  fullname: string;
}

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved as ViewType) || ViewType.DASHBOARD;
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    if (currentView) {
      localStorage.setItem(STORAGE_KEY, currentView);
    }
  }, [currentView]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
      else setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setUserRole(null);
        setUserProfile(null);
        setOrders([]);
        setCatalog([]);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    if (!userRole) setIsLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('role, fullname').eq('id', userId).single();
      if (error) throw error;
      if (data) {
        const role = data.role as UserRole;
        setUserRole(role);
        setUserProfile({
          role: role,
          fullname: data.fullname || 'Tanpa Nama'
        });
        
        const savedView = localStorage.getItem(STORAGE_KEY) as ViewType;
        const isManager = role === UserRole.SUPERADMIN || role === UserRole.ADMIN_MARKETPLACE;
        if (savedView) {
          if (!isManager && savedView !== ViewType.TASKS) setCurrentView(ViewType.TASKS);
          else setCurrentView(savedView);
        } else {
          setCurrentView(isManager ? ViewType.DASHBOARD : ViewType.TASKS);
        }
        setDbError(null);
      }
    } catch (err: any) {
      setDbError(`Profil Error: ${err.message}`);
      setUserRole(null); 
    } finally {
      setIsLoading(false);
    }
  };

  const fetchData = async () => {
    if (!session || !userRole) return;
    const isInitialLoad = orders.length === 0 && catalog.length === 0;
    if (isInitialLoad) setIsLoading(true);
    try {
      const { data: catData, error: catErr } = await supabase.from('catalog').select('*').order('name');
      if (catErr) throw catErr;
      setCatalog(catData || []);
      const { data: ordData, error: ordErr } = await supabase.from('orders').select('*').order('orderDate', { ascending: false });
      if (ordErr) throw ordErr;
      setOrders(ordData || []);
    } catch (error: any) {
      if (isInitialLoad) setDbError(error.message);
    } finally {
      if (isInitialLoad) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session && userRole) fetchData();
  }, [session, userRole]);

  const handleLogout = async () => {
    setIsLoading(true);
    localStorage.removeItem(STORAGE_KEY);
    await supabase.auth.signOut();
    setUserRole(null);
    setUserProfile(null);
    setSession(null);
    setIsLoading(false);
  };

  const handleAddOrder = async (newOrderData: Partial<Order>) => {
    const status = (newOrderData.status as OrderStatus) || OrderStatus.PENDING_SETTING;
    const order: Order = {
      id: Math.random().toString(36).substring(2, 11),
      orderId: newOrderData.orderId || `ERF-${Date.now().toString().slice(-4)}`,
      resi: newOrderData.resi || '',
      productId: newOrderData.productId || 'custom',
      productName: newOrderData.productName || 'Unknown Product',
      size: newOrderData.size || 'L',
      quantity: newOrderData.quantity || 1,
      orderDate: newOrderData.orderDate || new Date().toISOString().split('T')[0],
      expedition: newOrderData.expedition || 'J&T',
      marketplace: newOrderData.marketplace || 'Manual',
      type: (newOrderData.type as OrderType) || OrderType.PRE_ORDER,
      status: status,
      backName: newOrderData.backName,
      backNumber: newOrderData.backNumber,
      history: [{ 
        status: status, 
        updatedBy: userProfile?.fullname || userRole || 'UNKNOWN', 
        updatedAt: new Date().toISOString() 
      }]
    };
    try {
      const { error } = await supabase.from('orders').insert([order]);
      if (error) throw error;
      setOrders(prev => [order, ...prev]);
      setCurrentView(ViewType.ORDER_LIST);
    } catch (error: any) {
      alert('Gagal simpan: ' + error.message);
    }
  };

  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus, returnDate?: string) => {
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) return;
    
    const newHistoryEntry = { 
      status: nextStatus, 
      updatedBy: userProfile?.fullname || userRole || 'UNKNOWN', 
      updatedAt: new Date().toISOString() 
    };

    const updatedHistory = [...(orderToUpdate.history || []), newHistoryEntry];
    const updatePayload: any = { status: nextStatus, history: updatedHistory };
    if (returnDate) updatePayload.returnDate = returnDate;
    
    try {
      const { error } = await supabase.from('orders').update(updatePayload).eq('id', orderId);
      if (error) throw error;
      setOrders(currentOrders => currentOrders.map(o => o.id === orderId ? { ...o, ...updatePayload } : o));
    } catch (error: any) {
      alert('UPDATE GAGAL: ' + error.message);
      throw error;
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (userRole !== UserRole.SUPERADMIN) return;
    try {
      // Menghapus data dari supabase
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw error;
      
      // Update state lokal agar UI sinkron
      setOrders(prev => prev.filter(o => o.id !== id));
    } catch (error: any) {
      console.error('Delete Error:', error);
      alert('Gagal menghapus data: ' + error.message);
    }
  };

  const handleAddProduct = async (productData: Omit<CatalogProduct, 'id' | 'image'> & { image: string }) => {
    if (userRole !== UserRole.SUPERADMIN) return;
    const newProduct: CatalogProduct = { ...productData, id: Math.random().toString(36).substring(2, 11) };
    try {
      const { error } = await supabase.from('catalog').insert([newProduct]);
      if (error) throw error;
      setCatalog(prev => [newProduct, ...prev]);
    } catch (error: any) {
      alert('Gagal: ' + error.message);
    }
  };

  const handleUpdateProduct = async (updatedProduct: CatalogProduct) => {
    if (userRole !== UserRole.SUPERADMIN) return;
    try {
      const { error } = await supabase.from('catalog').update(updatedProduct).eq('id', updatedProduct.id);
      if (error) throw error;
      setCatalog(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    } catch (error: any) {
      alert('Gagal update: ' + error.message);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (userRole !== UserRole.SUPERADMIN) return;
    try {
      const { error } = await supabase.from('catalog').delete().eq('id', id);
      if (error) throw error;
      setCatalog(prev => prev.filter(p => p.id !== id));
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  if (!session) return <Login onLoginSuccess={() => {}} />;

  const renderContent = () => {
    if (dbError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <ShieldAlert size={48} className="text-red-500 mb-4" />
          <h2 className="text-2xl font-black text-slate-900 mb-2">Error Database</h2>
          <p className="text-slate-500 mb-8 max-w-md">{dbError}</p>
          <button onClick={() => window.location.reload()} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold">Refresh App</button>
        </div>
      );
    }

    if (isLoading && orders.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="mt-6 text-slate-400 font-bold uppercase tracking-widest text-sm">Menghubungkan ke Cloud Erfolgs...</p>
        </div>
      );
    }

    if (!userRole) return null;
    const isManager = userRole === UserRole.SUPERADMIN || userRole === UserRole.ADMIN_MARKETPLACE;
    
    if (!isManager) return <WorkerView role={userRole} orders={orders} catalog={catalog} onUpdateStatus={handleUpdateStatus} />;

    switch (currentView) {
      case ViewType.DASHBOARD: return <AdminDashboard orders={orders} catalog={catalog} />;
      case ViewType.INPUT_ORDER: return <InputOrderView catalog={catalog} onAddOrder={handleAddOrder} />;
      case ViewType.ORDER_LIST: return <OrderListView orders={orders} catalog={catalog} userRole={userRole} onUpdateStatus={handleUpdateStatus} onDeleteOrder={handleDeleteOrder} />;
      case ViewType.REPORT: return userRole === UserRole.SUPERADMIN ? <ReportView orders={orders} /> : <AdminDashboard orders={orders} catalog={catalog} />;
      case ViewType.CATALOG: return <CatalogView catalog={catalog} userRole={userRole} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct} />;
      case ViewType.TASKS: return <WorkerView role={userRole} orders={orders} catalog={catalog} onUpdateStatus={handleUpdateStatus} />;
      default: return <AdminDashboard orders={orders} catalog={catalog} />;
    }
  };

  return (
    <Layout userRole={userRole || UserRole.SETTING} currentView={currentView} onViewChange={setCurrentView} onLogout={handleLogout}>
      {renderContent()}
    </Layout>
  );
};

export default App;