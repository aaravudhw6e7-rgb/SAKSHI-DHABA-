import React, { useState } from 'react';
import { MenuItem } from '../types';
import { Plus, Trash2, Edit2, X, Save, AlertCircle } from 'lucide-react';

interface MenuManagerProps {
  menu: MenuItem[];
  onAdd: (item: MenuItem) => void;
  onUpdate: (item: MenuItem) => void;
  onDelete: (id: string) => void;
}

export const MenuManager: React.FC<MenuManagerProps> = ({ menu, onAdd, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<MenuItem>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleEdit = (item: MenuItem) => {
    setIsEditing(item.id);
    setFormData(item);
    setIsAdding(false);
    setDeleteConfirmId(null);
  };

  const handleAddNew = () => {
    setIsAdding(true);
    setFormData({ name: '', price: 0, category: 'Veg' });
    setIsEditing(null);
    setDeleteConfirmId(null);
  };

  const handleSave = () => {
    if (!formData.name || !formData.price || !formData.category) return;
    
    if (isAdding) {
      onAdd({
        id: Date.now().toString(),
        name: formData.name,
        price: Number(formData.price),
        category: formData.category
      });
      setIsAdding(false);
    } else if (isEditing) {
      onUpdate({
        ...formData,
        id: isEditing,
        name: formData.name,
        price: Number(formData.price),
        category: formData.category
      } as MenuItem);
      setIsEditing(null);
    }
    setFormData({});
  };

  const CATEGORIES = ['Veg', 'Non Veg', 'Cold Drink'];

  return (
    <div className="h-full p-4 md:p-6 bg-gray-50 overflow-y-auto pb-24">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Menu Manager</h2>
            <p className="text-sm text-gray-500">Manage your items and prices</p>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center shadow-sm hover:bg-orange-700 transition-colors font-bold text-sm"
        >
          <Plus size={18} className="mr-2" /> Add Item
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl shadow-lg mb-6 border border-orange-100 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-bold mb-4 text-gray-900 flex items-center">
             <div className="bg-orange-100 p-1 rounded mr-2 text-orange-600"><Plus size={16}/></div> New Item Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              className="border border-gray-200 p-3 rounded-xl w-full focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium"
              placeholder="Item Name (e.g. Paneer Tikka)"
              autoFocus
              value={formData.name || ''}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
            <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400 font-bold">₹</span>
                <input
                className="border border-gray-200 p-3 pl-8 rounded-xl w-full focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium"
                type="number"
                placeholder="Price"
                value={formData.price || ''}
                onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                />
            </div>
            <select
              className="border border-gray-200 p-3 rounded-xl w-full bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium"
              value={formData.category || 'Veg'}
              onChange={e => setFormData({...formData, category: e.target.value})}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={handleSave} className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-2.5 rounded-xl flex items-center shadow-md font-bold text-sm transition-all active:scale-95">
              <Save size={18} className="mr-2"/> Save Item
            </button>
            <button onClick={() => setIsAdding(false)} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-xl flex items-center shadow-sm font-bold text-sm transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold border-b border-gray-100">
            <tr>
              <th className="px-6 py-4">Item Name</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Price</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {menu.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                {isEditing === item.id ? (
                  <>
                    <td className="px-4 py-3"><input className="border border-gray-300 p-2 rounded-lg w-full text-sm" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})}/></td>
                    <td className="px-4 py-3">
                      <select 
                        className="border border-gray-300 p-2 rounded-lg w-full bg-white text-sm" 
                        value={formData.category} 
                        onChange={e=>setFormData({...formData, category: e.target.value})}
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3"><input type="number" className="border border-gray-300 p-2 rounded-lg w-24 text-sm" value={formData.price} onChange={e=>setFormData({...formData, price: Number(e.target.value)})}/></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end space-x-2">
                        <button onClick={handleSave} className="text-white p-2 bg-green-600 hover:bg-green-700 rounded-lg shadow-sm"><Save size={18}/></button>
                        <button onClick={() => setIsEditing(null)} className="text-gray-600 p-2 bg-gray-200 hover:bg-gray-300 rounded-lg"><X size={18}/></button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4 font-bold text-gray-800">{item.name}</td>
                    <td className="px-6 py-4 text-gray-500">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        item.category === 'Veg' ? 'bg-green-100 text-green-700' :
                        item.category === 'Non Veg' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-black text-gray-900">₹{item.price}</td>
                    <td className="px-6 py-4 text-right">
                      {deleteConfirmId === item.id ? (
                        <div className="flex justify-end items-center space-x-2 animate-in fade-in slide-in-from-right-2">
                          <span className="text-xs font-bold text-red-500 mr-1">Sure?</span>
                          <button
                            onClick={() => {
                              onDelete(item.id);
                              setDeleteConfirmId(null);
                            }}
                            className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-red-700 transition-colors flex items-center"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-gray-500 bg-gray-100 px-2 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEdit(item)} 
                            className="text-blue-600 hover:text-white hover:bg-blue-600 p-2 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16}/>
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmId(item.id)} 
                            className="text-red-600 hover:text-white hover:bg-red-600 p-2 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};