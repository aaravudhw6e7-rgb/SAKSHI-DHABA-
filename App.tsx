import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { POS } from './components/POS';
import { Udhari } from './components/Udhari';
import { Reports } from './components/Reports';
import { MenuManager } from './components/MenuManager';
import { Receipt } from './components/Receipt';
import { AppState, ViewState, CartItem, PaymentMode, Bill, MenuItem, Customer } from './types';
import { loadState, saveState, loadSession, saveSession } from './services/storageService';

export default function App() {
  const [view, setView] = useState<ViewState>('POS');
  const [state, setState] = useState<AppState>(loadState());
  const [lastBill, setLastBill] = useState<Bill | null>(null);

  // --- PERSISTENT POS STATE (LIFTED UP) ---
  const initialSession = loadSession();
  const [cart, setCart] = useState<CartItem[]>(initialSession.cart);
  const [tableNo, setTableNo] = useState<string>(initialSession.tableNo);
  const [kitchenNote, setKitchenNote] = useState<string>(initialSession.kitchenNote);
  const [posCustomerName, setPosCustomerName] = useState<string>(initialSession.customerName);
  const [posCustomerPhone, setPosCustomerPhone] = useState<string>(initialSession.customerPhone);

  // Save main data
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Save session data (cart, etc) whenever it changes
  useEffect(() => {
    saveSession({
      cart,
      tableNo,
      kitchenNote,
      customerName: posCustomerName,
      customerPhone: posCustomerPhone
    });
  }, [cart, tableNo, kitchenNote, posCustomerName, posCustomerPhone]);

  const handleProcessOrder = (
    items: CartItem[], 
    mode: PaymentMode, 
    taxEnabled: boolean,
    customerDetails?: { name: string; phone: string },
    orderMeta?: { tableNo: string; notes: string }
  ): Bill => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = 0; 
    const total = subtotal;

    const newBill: Bill = {
      id: `${Date.now()}`,
      timestamp: Date.now(),
      items,
      subtotal,
      tax,
      taxEnabled: false,
      total,
      paymentMode: mode,
      customerName: customerDetails?.name,
      customerPhone: customerDetails?.phone,
      isPaid: mode !== PaymentMode.UDHARI,
      isCanceled: false,
      tableNo: orderMeta?.tableNo,
      notes: orderMeta?.notes
    };

    // Update Global State
    setState(prev => {
      let nextCustomers = [...prev.customers];
      
      if (mode === PaymentMode.UDHARI && customerDetails) {
        // Try to find existing customer loosely by name AND phone, or just phone if provided
        const existingCustomerIndex = nextCustomers.findIndex(
          c => (c.phone && c.phone === customerDetails.phone) || 
               (!c.phone && c.name.toLowerCase() === customerDetails.name.toLowerCase())
        );

        if (existingCustomerIndex >= 0) {
          nextCustomers[existingCustomerIndex] = {
            ...nextCustomers[existingCustomerIndex],
            name: customerDetails.name, // Update name in case of typo fix
            phone: customerDetails.phone || nextCustomers[existingCustomerIndex].phone,
            totalDue: nextCustomers[existingCustomerIndex].totalDue + total,
            history: [...nextCustomers[existingCustomerIndex].history, newBill]
          };
        } else {
          nextCustomers.push({
            id: Date.now().toString(),
            name: customerDetails.name,
            phone: customerDetails.phone,
            totalDue: total,
            history: [newBill]
          });
        }
      }

      return {
        ...prev,
        bills: [...prev.bills, newBill],
        customers: nextCustomers
      };
    });

    setLastBill(newBill);
    
    // Clear Session Data after successful order
    setCart([]);
    setTableNo('');
    setKitchenNote('');
    setPosCustomerName('');
    setPosCustomerPhone('');

    return newBill;
  };

  const handleCancelBill = (billId: string) => {
    setState(prev => {
      const billToCancel = prev.bills.find(b => b.id === billId);
      if (!billToCancel || billToCancel.isCanceled) return prev;
      
      const updatedBills = prev.bills.map(b => 
        b.id === billId ? { ...b, isCanceled: true } : b
      );

      let updatedCustomers = [...prev.customers];
      if (billToCancel.paymentMode === PaymentMode.UDHARI && billToCancel.customerName) {
        updatedCustomers = updatedCustomers.map(c => {
          // Find the customer associated with this bill
          const isMatch = (c.phone && c.phone === billToCancel.customerPhone) || 
                          c.name === billToCancel.customerName;

          if (isMatch) {
             return {
               ...c,
               totalDue: Math.max(0, c.totalDue - billToCancel.total),
               // We keep the history but mark it or remove it? 
               // Let's remove it from history so it doesn't show up in statements
               history: c.history.filter(h => h.id !== billId)
             };
          }
          return c;
        });
      }

      return {
        ...prev,
        bills: updatedBills,
        customers: updatedCustomers
      };
    });
  };

  const handleSettlePayment = (customerId: string, amount: number) => {
    setState(prev => ({
      ...prev,
      customers: prev.customers.map(c => 
        c.id === customerId ? { ...c, totalDue: Math.max(0, c.totalDue - amount) } : c
      )
    }));
  };

  const handleDeleteCustomer = (customerId: string) => {
    setState(prev => ({
      ...prev,
      customers: prev.customers.filter(c => c.id !== customerId)
    }));
  };

  // Menu CRUD
  const addMenuItem = (item: MenuItem) => {
    setState(prev => ({ ...prev, menu: [...prev.menu, item] }));
  };
  const updateMenuItem = (item: MenuItem) => {
    setState(prev => ({ ...prev, menu: prev.menu.map(i => i.id === item.id ? item : i) }));
  };
  const deleteMenuItem = (id: string) => {
    setState(prev => ({ ...prev, menu: prev.menu.filter(i => i.id !== id) }));
  };

  // Prop-drilling setup for POS persistence
  const posProps = {
    cart, setCart,
    tableNo, setTableNo,
    kitchenNote, setKitchenNote,
    customerName: posCustomerName, setCustomerName: setPosCustomerName,
    customerPhone: posCustomerPhone, setCustomerPhone: setPosCustomerPhone,
    customers: state.customers // Passing customers for autocomplete
  };

  return (
    <>
      <Layout currentView={view} onChangeView={setView}>
        {view === 'POS' && (
          <POS 
            menu={state.menu} 
            onProcessOrder={handleProcessOrder} 
            {...posProps}
          />
        )}
        {view === 'UDHARI' && (
          <Udhari 
            customers={state.customers} 
            onSettlePayment={handleSettlePayment}
            onDeleteCustomer={handleDeleteCustomer}
          />
        )}
        {view === 'REPORTS' && (
          <Reports 
            bills={state.bills} 
            onCancelBill={handleCancelBill}
          />
        )}
        {view === 'MENU' && (
          <MenuManager 
            menu={state.menu}
            onAdd={addMenuItem}
            onUpdate={updateMenuItem}
            onDelete={deleteMenuItem}
          />
        )}
      </Layout>
      
      {/* Invisible Receipt Component for Printing */}
      <Receipt bill={lastBill} />
    </>
  );
}