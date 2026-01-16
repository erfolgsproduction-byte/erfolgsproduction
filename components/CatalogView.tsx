
import React, { useState } from 'react';
import { CatalogProduct, UserRole } from '../types';
import { Plus, Search, Trash2, Edit2, X, Check, Package, Upload, Image as ImageIcon, Lock } from 'lucide-react';

interface CatalogViewProps {
  catalog: CatalogProduct[];
  userRole: UserRole;
  onAddProduct: (product: Omit<CatalogProduct, 'id' | 'image'> & { image: string }) => void;
  onUpdateProduct: (product: CatalogProduct) => void;
  onDeleteProduct: (id: string) => void;
}

const CATEGORIES = ['Jersey', 'Kemeja', 'Kaos', 'Jaket'];

const CatalogView: React.FC<CatalogViewProps> = ({ catalog, userRole, onAddProduct, onUpdateProduct, onDeleteProduct }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CatalogProduct | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [manualForm, setManualForm] = useState({ name: '', category: 'Jersey', image: '', description: '' });

  const isSuperAdmin = userRole === UserRole.SUPERADMIN;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setManualForm(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const startEdit = (product: CatalogProduct) => {
    if (!isSuperAdmin) return;
    setEditingId(product.id);
    setEditForm({ ...product });
  };

  const saveEdit = () => {
    if (editForm) {
      onUpdateProduct(editForm);
      setEditingId(null);
      setEditForm(null);
    }
  };

  const handleAdd = () => {
    if (!manualForm.name) {
      alert("Nama produk wajib diisi!");
      return;
    }
    onAddProduct({
      name: manualForm.name,
      category: manualForm.category,
      image: manualForm.image || `https://images.unsplash.com/photo-1574634534894-89d7576c8259?auto=format&fit=crop&q=80&w=400`,
      description: manualForm.description
    });
    setIsAdding(false);
    setManualForm({ name: '', category: 'Jersey', image: '', description: '' });
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteProduct(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari produk katalog..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
        </div>
        
        {isSuperAdmin ? (
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
          >
            {isAdding ? <X size={18} /> : <Plus size={18} />}
            {isAdding ? 'Batal Tambah' : 'Tambah Produk Baru'}
          </button>
        ) : (
          <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold uppercase tracking-widest">
            <Lock size={14} /> Katalog (Mode Baca Saja)
          </div>
        )}
      </div>

      {isAdding && isSuperAdmin && (
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl animate-in slide-in-from-top-2 duration-300">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-6">
            <Package className="text-blue-500" size={20} /> Input Data Produk Baru
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-4 flex flex-col items-center">
              <div className="w-full aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl overflow-hidden flex items-center justify-center relative group">
                {manualForm.image ? (
                  <img src={manualForm.image} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <div className="flex flex-col items-center text-gray-400">
                    <ImageIcon size={48} className="mb-2 opacity-20" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">No Image</p>
                  </div>
                )}
                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <Upload size={16} /> Upload Foto
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </label>
              </div>
            </div>

            <div className="md:col-span-8 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nama Produk</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Jersey Esport 2024" 
                    value={manualForm.name}
                    onChange={e => setManualForm({...manualForm, name: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Kategori</label>
                  <select 
                    value={manualForm.category}
                    onChange={e => setManualForm({...manualForm, category: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm appearance-none cursor-pointer"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Deskripsi Produk</label>
                <textarea 
                  placeholder="Keterangan singkat produk..." 
                  value={manualForm.description}
                  onChange={e => setManualForm({...manualForm, description: e.target.value})}
                  className="w-full h-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500" 
                ></textarea>
              </div>
              <div className="flex justify-end pt-4">
                <button 
                  onClick={handleAdd}
                  className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                >
                  Simpan ke Katalog
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Catalog Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Foto</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Nama Produk</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Kategori</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Deskripsi</th>
                {isSuperAdmin && <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {catalog.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <img src={product.image} className="w-12 h-12 rounded-lg object-cover border border-gray-100 shadow-sm" alt="" />
                  </td>
                  <td className="px-6 py-4">
                    {editingId === product.id ? (
                      <input 
                        type="text" 
                        value={editForm?.name} 
                        onChange={e => setEditForm(prev => prev ? {...prev, name: e.target.value} : null)}
                        className="px-3 py-1.5 border border-blue-200 rounded-lg text-sm font-bold w-full"
                      />
                    ) : (
                      <div className="text-sm font-bold text-gray-900">{product.name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-gray-500 line-clamp-1">{product.description || '-'}</div>
                  </td>
                  {isSuperAdmin && (
                    <td className="px-6 py-4 text-right">
                      {editingId === product.id ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={saveEdit} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600"><Check size={16} /></button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"><X size={16} /></button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => startEdit(product)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                          <button onClick={() => setDeleteConfirmId(product.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-10 text-center space-y-8 border border-slate-100">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto border border-red-100 shadow-xl shadow-red-200/20">
                 <Trash2 size={40} />
              </div>
              <div className="space-y-2">
                 <h3 className="text-xl font-black text-slate-900 uppercase">Hapus Produk?</h3>
                 <p className="text-xs font-bold text-slate-400 leading-relaxed">Produk akan hilang dari katalog dan tidak bisa dipilih saat input pesanan baru.</p>
              </div>
              <div className="flex flex-col gap-3">
                 <button 
                   onClick={confirmDelete}
                   className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-red-200 hover:bg-red-700 transition-all active:scale-95"
                 >
                   Hapus Dari Katalog
                 </button>
                 <button 
                   onClick={() => setDeleteConfirmId(null)}
                   className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-200 transition-all active:scale-95"
                 >
                   Batal
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CatalogView;
