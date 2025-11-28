import React, { useState, useMemo, useEffect } from 'react';
import { MenuItem, CartItem, PaymentMode, Bill, Customer } from '../types';
import { Plus, Minus, Search, ShoppingCart, QrCode, X, ChevronUp, ChevronDown, ClipboardList, Printer, FileText, User } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

interface POSProps {
  menu: MenuItem[];
  onProcessOrder: (
    items: CartItem[], 
    mode: PaymentMode, 
    taxEnabled: boolean, 
    customerDetails?: { name: string; phone: string },
    orderMeta?: { tableNo: string; notes: string }
  ) => Bill;
  // Lifted State Props
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  tableNo: string;
  setTableNo: React.Dispatch<React.SetStateAction<string>>;
  kitchenNote: string;
  setKitchenNote: React.Dispatch<React.SetStateAction<string>>;
  customerName: string;
  setCustomerName: React.Dispatch<React.SetStateAction<string>>;
  customerPhone: string;
  setCustomerPhone: React.Dispatch<React.SetStateAction<string>>;
  customers: Customer[]; // Added for Autocomplete
}

export const POS: React.FC<POSProps> = ({ 
  menu, onProcessOrder,
  cart, setCart,
  tableNo, setTableNo,
  kitchenNote, setKitchenNote,
  customerName, setCustomerName,
  customerPhone, setCustomerPhone,
  customers
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(PaymentMode.CASH);
  
  // UI Toggle State
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  // Customer Autocomplete State
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  // QR Code State
  const [showQrModal, setShowQrModal] = useState(false);
  const [upiId, setUpiId] = useState('');

  useEffect(() => {
    const savedUpi = localStorage.getItem('sakshi_pos_upi_id');
    if (savedUpi) setUpiId(savedUpi);
    
    // Auto-show details if table/note exists (persistence)
    if (tableNo || kitchenNote) {
        setShowOrderDetails(true);
    }
  }, []);

  const saveUpiId = (id: string) => {
    setUpiId(id);
    localStorage.setItem('sakshi_pos_upi_id', id);
  };

  const categories = useMemo(() => {
    const cats = Array.from(new Set(menu.map((i) => i.category)));
    return ['All', ...cats];
  }, [menu]);

  const filteredMenu = useMemo(() => {
    return menu.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [menu, searchTerm, selectedCategory]);

  const filteredCustomers = useMemo(() => {
    if (!customerName) return [];
    return customers.filter(c => 
      c.name.toLowerCase().includes(customerName.toLowerCase()) || 
      c.phone.includes(customerName)
    ).slice(0, 5);
  }, [customers, customerName]);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(0, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter((item) => item.quantity > 0)
    );
  };

  const resetPOS = () => {
    if (cart.length > 0) {
        if (window.confirm("Clear order?")) {
            setCart([]);
            setSearchTerm('');
            setSelectedCategory('All');
            setTableNo('');
            setKitchenNote('');
            setCustomerName('');
            setCustomerPhone('');
            setPaymentMode(PaymentMode.CASH);
            setShowCheckout(false);
            setShowOrderDetails(false);
        }
    } else {
        setSearchTerm('');
        setSelectedCategory('All');
    }
  };

  const selectCustomer = (customer: Customer) => {
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setShowCustomerSuggestions(false);
  };

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const total = subtotal;

  const generatePDF = (bill: Bill) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("SAKSHI DHABA", 105, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text("Main Highway Road, Sector 12", 105, 22, { align: "center" });
    
    doc.text(`Bill #: ${bill.id.slice(-6).toUpperCase()}`, 14, 35);
    doc.text(`Date: ${new Date(bill.timestamp).toLocaleString()}`, 14, 40);
    
    if (bill.tableNo) {
      doc.setFont("helvetica", "bold");
      doc.text(`Table No: ${bill.tableNo}`, 140, 35);
      doc.setFont("helvetica", "normal");
    }
    
    if (bill.customerName) doc.text(`Customer: ${bill.customerName}`, 14, 45);

    autoTable(doc, {
      startY: 50,
      head: [['Item', 'Qty', 'Price', 'Total']],
      body: bill.items.map(item => [
        item.name,
        item.quantity,
        item.price.toFixed(2),
        (item.price * item.quantity).toFixed(2)
      ]),
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [234, 88, 12] } 
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Total: ${bill.total.toFixed(2)}`, 140, finalY + 5);

    if (bill.notes) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text(`Note: ${bill.notes}`, 14, finalY + 15);
    }

    doc.save(`Bill_${bill.id.slice(-6)}.pdf`);
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    if (paymentMode === PaymentMode.UDHARI && !customerName.trim()) {
      alert("Customer Name is required for Udhari!");
      return;
    }

    const bill = onProcessOrder(
      cart, 
      paymentMode, 
      false, 
      { name: customerName, phone: customerPhone },
      { tableNo, notes: kitchenNote }
    );
    
    generatePDF(bill);
    setShowCheckout(false);
    setShowOrderDetails(false);
    setPaymentMode(PaymentMode.CASH);
  };

  const qrCodeUrl = useMemo(() => {
    if (!upiId) return '';
    const name = "Sakshi Dhaba";
    const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${total.toFixed(2)}&cu=INR`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}`;
  }, [upiId, total]);

  return (
    <div className="flex flex-col md:flex-row h-full relative bg-gray-50">
      {/* QR Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 relative animate-in zoom-in-95">
            <button 
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-center mb-1 text-gray-800">Scan to Pay</h3>
            <p className="text-center text-gray-500 text-sm mb-4">Pay via any UPI App</p>
            
            <div className="text-center text-4xl font-extrabold text-gray-900 mb-6">₹{total.toFixed(2)}</div>
            
            <div className="flex justify-center mb-6">
              {upiId ? (
                <div className="p-3 border-4 border-orange-500 rounded-2xl bg-white shadow-inner">
                   <img src={qrCodeUrl} alt="UPI QR Code" className="w-48 h-48 mix-blend-multiply" />
                </div>
              ) : (
                <div className="w-56 h-56 bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                  <QrCode size={48} className="mb-2 opacity-50"/>
                  <span className="text-xs font-medium">Add UPI ID below to show QR</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="relative">
                <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Merchant UPI ID</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => saveUpiId(e.target.value)}
                  placeholder="e.g. 9876543210@ybl"
                  className="w-full p-3 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-gray-900"
                />
              </div>
            </div>

            <button 
               onClick={() => { setShowQrModal(false); setPaymentMode(PaymentMode.ONLINE); }}
               className="w-full mt-6 bg-orange-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-orange-200 hover:bg-orange-700 hover:shadow-xl transition-all active:scale-95"
            >
              Payment Received
            </button>
          </div>
        </div>
      )}

      {/* Left: Menu Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Filters */}
        <div className="p-4 bg-white shadow-sm space-y-4 z-10 sticky top-0">
          <div className="flex items-center space-x-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-3 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={20} />
              <input
                type="text"
                placeholder="Search items..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent group-focus-within:bg-white group-focus-within:border-orange-200 rounded-xl focus:ring-4 focus:ring-orange-50 outline-none transition-all text-gray-900"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all shadow-sm ${
                  selectedCategory === cat
                    ? 'bg-gray-900 text-white shadow-md transform scale-105'
                    : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-32 md:pb-6">
            {filteredMenu.map((item) => (
              <div
                key={item.id}
                onClick={() => addToCart(item)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-orange-100 transition-all duration-200 cursor-pointer flex flex-col justify-between group active:scale-95 h-36"
              >
                <div>
                  <h3 className="font-bold text-gray-800 line-clamp-2 leading-tight group-hover:text-orange-600 transition-colors">{item.name}</h3>
                  <p className="text-xs text-gray-400 mt-1 font-medium tracking-wide uppercase">{item.category}</p>
                </div>
                <div className="flex justify-between items-end mt-2">
                  <span className="text-lg font-black text-gray-900">₹{item.price}</span>
                  <div className="h-9 w-9 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all shadow-sm">
                    <Plus size={18} strokeWidth={3} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Cart/Bill Area */}
      <div className={`
        fixed bottom-[60px] md:bottom-0 left-0 right-0 md:static md:w-[400px] 
        bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)] md:shadow-xl md:border-l border-gray-100
        flex flex-col z-30 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
        ${showCheckout ? 'h-[85vh] rounded-t-[2rem]' : 'h-[72px] md:h-full rounded-t-[2rem] md:rounded-none'}
      `}>
        {/* Mobile Toggle Handle */}
        <div 
          onClick={() => setShowCheckout(!showCheckout)}
          className="md:hidden flex items-center justify-between px-6 h-[72px] bg-orange-600 text-white cursor-pointer rounded-t-[2rem] shadow-lg relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>

          <div className="flex items-center space-x-3 z-10">
            <div className="bg-white/20 p-2 rounded-lg">
              <ShoppingCart size={20} fill="currentColor" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-lg">{cart.length} Items</span>
              <span className="text-[10px] opacity-80 uppercase tracking-wider font-medium">View Bill</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 z-10">
            <span className="font-black text-xl">₹{total.toFixed(0)}</span>
            <div className="bg-white/20 rounded-full p-1">
               {showCheckout ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </div>
          </div>
        </div>

        {/* Cart Content */}
        <div className={`${showCheckout ? 'flex' : 'hidden md:flex'} flex-col h-full bg-white`}>
          {/* Desktop Header */}
          <div className="p-5 border-b border-gray-100 hidden md:flex items-center justify-between bg-white">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              Current Order
            </h2>
            {cart.length > 0 && (
              <button 
                onClick={resetPOS}
                className="text-xs text-red-500 font-bold hover:bg-red-50 px-2 py-1 rounded transition-colors"
              >
                CLEAR
              </button>
            )}
          </div>

          {/* Scrollable Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-300">
                <div className="bg-gray-50 p-6 rounded-full mb-4">
                    <ClipboardList size={48} className="opacity-50" />
                </div>
                <p className="font-medium">No items added yet</p>
                <p className="text-xs mt-1">Select items from the menu</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition-colors group">
                  <div className="flex-1 pr-3">
                    <h4 className="font-semibold text-gray-800 text-sm">{item.name}</h4>
                    <p className="text-xs text-gray-400 font-medium">₹{item.price}</p>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm h-8">
                      <button 
                        onClick={() => updateQuantity(item.id, -1)} 
                        className="w-8 h-full flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-l-lg transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-gray-800">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1)} 
                        className="w-8 h-full flex items-center justify-center text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-r-lg transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <div className="text-right w-16 font-bold text-gray-900">
                      ₹{item.price * item.quantity}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Billing Summary & Actions */}
          <div className="p-5 bg-gray-50 rounded-t-[2rem] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] border-t border-gray-100">
             
            <div className="mb-4">
                <button 
                    onClick={() => setShowOrderDetails(!showOrderDetails)}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center"
                >
                    {showOrderDetails ? <ChevronDown size={14} className="mr-1"/> : <ChevronUp size={14} className="mr-1"/>}
                    {showOrderDetails ? 'Hide Order Details' : 'Add Table No / Notes'}
                </button>

                {showOrderDetails && (
                    <div className="mt-3 flex gap-3 animate-in slide-in-from-bottom-2 fade-in">
                        <div className="w-1/3">
                            <select 
                            className="w-full p-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-orange-500 outline-none text-gray-900"
                            value={tableNo}
                            onChange={(e) => setTableNo(e.target.value)}
                            >
                            <option value="">Table</option>
                            {[...Array(20)].map((_, i) => (
                                <option key={i} value={i + 1}>#{i + 1}</option>
                            ))}
                            <option value="Parcel">Parcel</option>
                            </select>
                        </div>
                        <div className="w-2/3">
                            <input 
                            type="text" 
                            placeholder="Cooking Note..." 
                            className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none text-gray-900"
                            value={kitchenNote}
                            onChange={(e) => setKitchenNote(e.target.value)}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-baseline mb-4 border-b border-gray-200 pb-4 border-dashed">
              <span className="text-gray-500 font-medium">Grand Total</span>
              <span className="text-3xl font-black text-gray-900">₹{total.toFixed(2)}</span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Payment Mode</label>
                <button 
                  onClick={() => setShowQrModal(true)}
                  disabled={cart.length === 0}
                  className="text-xs flex items-center bg-orange-50 text-orange-700 px-2 py-1 rounded-lg font-bold hover:bg-orange-100 transition-colors disabled:opacity-50"
                >
                  <QrCode size={14} className="mr-1"/> Show QR
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                {Object.values(PaymentMode).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPaymentMode(mode)}
                    className={`py-3 px-1 rounded-xl text-xs font-bold transition-all duration-200 border relative overflow-hidden ${
                      paymentMode === mode
                        ? 'bg-gray-900 text-white border-gray-900 shadow-lg scale-[1.02]'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {mode === PaymentMode.ONLINE ? 'Online' : mode}
                    {paymentMode === mode && (
                        <div className="absolute top-0 right-0 w-2 h-2 bg-orange-500 rounded-bl-full"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {paymentMode === PaymentMode.UDHARI && (
              <div className="mt-4 space-y-3 animate-in slide-in-from-bottom-2 fade-in bg-red-50 p-3 rounded-xl border border-red-100 relative">
                <div className="relative">
                  <User size={16} className="absolute left-3 top-3 text-red-300" />
                  <input
                    type="text"
                    placeholder="Search / Enter Name *"
                    value={customerName}
                    onFocus={() => setShowCustomerSuggestions(true)}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setShowCustomerSuggestions(true);
                    }}
                    className="w-full pl-10 pr-3 py-2.5 text-sm border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-white text-gray-900 placeholder-gray-400"
                  />
                  
                  {/* Autocomplete Dropdown - Positioned upwards (bottom-full) to prevent cutoff */}
                  {showCustomerSuggestions && customerName.length > 0 && filteredCustomers.length > 0 && (
                     <div className="absolute z-50 left-0 right-0 bottom-full mb-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                        {filteredCustomers.map(c => (
                            <div 
                                key={c.id}
                                onClick={() => selectCustomer(c)}
                                className="p-3 hover:bg-red-50 cursor-pointer border-b border-gray-100 last:border-0"
                            >
                                <div className="font-bold text-sm text-gray-800">{c.name}</div>
                                {c.phone && <div className="text-xs text-gray-500">{c.phone}</div>}
                            </div>
                        ))}
                     </div>
                  )}
                </div>
                
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full p-2.5 text-sm border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-white text-gray-900 placeholder-gray-400"
                />
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className={`w-full mt-5 py-4 rounded-xl font-bold shadow-xl flex justify-center items-center text-sm tracking-wide transition-all active:scale-95 ${
                  paymentMode === PaymentMode.UDHARI 
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-200'
                  : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {paymentMode === PaymentMode.UDHARI ? (
                  <>
                    <FileText size={18} className="mr-2" /> RECORD UDHARI
                  </>
              ) : (
                  <>
                    <Printer size={18} className="mr-2" /> PAY & PRINT
                  </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};