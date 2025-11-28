import React, { useState } from 'react';
import { Customer, Bill } from '../types';
import { Search, Phone, ChevronDown, ChevronUp, CheckCircle, Download, Trash2, Calendar, FileText, Send, MessageCircle, X, AlertTriangle } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

interface UdhariProps {
  customers: Customer[];
  onSettlePayment: (customerId: string, amount: number) => void;
  onDeleteCustomer: (customerId: string) => void;
}

export const Udhari: React.FC<UdhariProps> = ({ customers, onSettlePayment, onDeleteCustomer }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Settle Payment State
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const openSettleModal = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCustomer(customer);
    setPaymentAmount(customer.totalDue.toString());
    setSettleModalOpen(true);
  };

  const handlePaymentSubmit = () => {
    if (!selectedCustomer || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount");
        return;
    }
    
    onSettlePayment(selectedCustomer.id, amount);
    setSettleModalOpen(false);
    setSelectedCustomer(null);
    setPaymentAmount('');
  };

  const openDeleteModal = (customer: Customer, e: React.MouseEvent) => {
      e.stopPropagation();
      setCustomerToDelete(customer);
      setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
      if (customerToDelete) {
          onDeleteCustomer(customerToDelete.id);
          setDeleteModalOpen(false);
          setCustomerToDelete(null);
      }
  };

  const sendWhatsAppReminder = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!customer.phone) {
        alert("Customer phone number not available.");
        return;
    }
    const message = `Hello ${customer.name}, your total pending amount at Sakshi Dhaba is ₹${customer.totalDue.toFixed(0)}. Please pay at your earliest convenience.`;
    const url = `https://wa.me/91${customer.phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const downloadStatement = (customer: Customer) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Udhari Statement`, 105, 15, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Customer: ${customer.name}`, 14, 25);
    doc.text(`Phone: ${customer.phone}`, 14, 32);
    doc.setTextColor(220, 38, 38);
    doc.text(`Total Due: ${customer.totalDue.toFixed(2)}`, 14, 39);
    doc.setTextColor(0, 0, 0);

    autoTable(doc, {
      startY: 45,
      head: [['Date', 'Items', 'Amount']],
      body: customer.history.map(bill => [
        new Date(bill.timestamp).toLocaleString(),
        bill.items.map(i => `${i.name} (${i.quantity})`).join(', '),
        bill.total.toFixed(2)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [234, 88, 12] }
    });
    
    doc.save(`Statement_${customer.name}.pdf`);
  };

  const downloadSingleBill = (bill: Bill) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("SAKSHI DHABA", 105, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text("Original Bill Reprint", 105, 22, { align: "center" });
    
    doc.text(`Bill #: ${bill.id.slice(-6).toUpperCase()}`, 14, 35);
    doc.text(`Date: ${new Date(bill.timestamp).toLocaleString()}`, 14, 40);
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
      theme: 'striped',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [50, 50, 50] }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Amount: ${bill.total.toFixed(2)}`, 140, finalY + 5);

    doc.save(`Bill_${bill.id.slice(-6)}.pdf`);
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-6 overflow-hidden bg-gray-50 relative">
      
      {/* Settle Payment Modal */}
      {settleModalOpen && selectedCustomer && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">Receive Payment</h3>
                    <button onClick={() => setSettleModalOpen(false)} className="bg-gray-100 p-1 rounded-full"><X size={20}/></button>
                </div>
                
                <div className="mb-4">
                    <p className="text-gray-500 text-sm">Customer</p>
                    <p className="font-bold text-lg">{selectedCustomer.name}</p>
                    <p className="text-red-500 text-sm font-semibold">Total Due: ₹{selectedCustomer.totalDue.toFixed(2)}</p>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Amount Received</label>
                    <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-500 font-bold">₹</span>
                        <input 
                            type="number" 
                            autoFocus
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-lg font-bold"
                        />
                    </div>
                </div>

                <button 
                    onClick={handlePaymentSubmit}
                    className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg"
                >
                    Confirm Payment
                </button>
            </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && customerToDelete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95">
                <div className="flex items-center justify-center text-red-100 bg-red-500 w-12 h-12 rounded-full mx-auto mb-4">
                    <AlertTriangle size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Delete Customer?</h3>
                <p className="text-center text-gray-500 text-sm mb-6">
                    Are you sure you want to delete <span className="font-bold text-gray-800">{customerToDelete.name}</span>? 
                    This will remove all transaction history permanently.
                </p>
                
                <div className="flex gap-3">
                    <button 
                        onClick={() => setDeleteModalOpen(false)}
                        className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirmDelete}
                        className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-100 transition-colors"
                    >
                        Yes, Delete
                    </button>
                </div>
            </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4 md:mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Udhari Register</h2>
          <p className="text-gray-500 text-sm">Track customer credits & history</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-red-100 text-right">
          <p className="text-xs text-gray-500 font-bold uppercase">Total Outstanding</p>
          <p className="text-xl font-bold text-red-600">
            ₹{customers.reduce((acc, c) => acc + c.totalDue, 0).toFixed(0)}
          </p>
        </div>
      </div>

      <div className="mb-4 relative z-10">
        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search Customer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-50 outline-none text-gray-900"
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-24">
        {filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Calendar size={48} className="mb-2 opacity-50"/>
            <p>No udhari records found.</p>
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div
                onClick={() => toggleExpand(customer.id)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3 md:space-x-4">
                  <div className="h-10 w-10 md:h-12 md:w-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 font-bold text-lg border border-orange-200">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base md:text-lg">{customer.name}</h3>
                    {customer.phone && (
                      <div className="flex items-center text-gray-500 text-xs md:text-sm">
                        <Phone size={12} className="mr-1" /> {customer.phone}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                   {/* WhatsApp Button */}
                  {customer.phone && (
                    <button 
                        onClick={(e) => sendWhatsAppReminder(customer, e)}
                        className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-full transition-colors hidden md:block"
                        title="Send Reminder on WhatsApp"
                    >
                        <MessageCircle size={20} />
                    </button>
                  )}
                  <span className={`font-bold text-lg ${customer.totalDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{customer.totalDue.toFixed(0)}
                  </span>
                  {expandedId === customer.id ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                </div>
              </div>

              {expandedId === customer.id && (
                <div className="bg-gray-50 border-t border-gray-100 animate-in slide-in-from-top-2">
                  
                  <div className="p-3 bg-gray-100 flex justify-between items-center border-b border-gray-200">
                    <span className="text-xs font-bold text-gray-500 uppercase">Transaction History</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); downloadStatement(customer); }}
                      className="flex items-center px-3 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm whitespace-nowrap"
                    >
                      <Download size={14} className="mr-1"/> Statement
                    </button>
                  </div>
                  
                  <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
                    {customer.history.length === 0 ? (
                      <div className="text-xs text-gray-400 text-center py-4">No history available</div>
                    ) : (
                      [...customer.history].reverse().map((bill) => (
                        <div key={bill.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm relative">
                          
                          <div className="flex justify-between items-start mb-2 pb-2 border-b border-gray-100 border-dashed gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center text-orange-700 font-medium text-sm">
                                    <Calendar size={14} className="mr-1 flex-shrink-0" />
                                    <span className="truncate">
                                      {new Date(bill.timestamp).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-400 mt-0.5 ml-5">
                                    {new Date(bill.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • #{bill.id.slice(-4)}
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <span className="block font-bold text-gray-900">₹{bill.total.toFixed(0)}</span>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); downloadSingleBill(bill); }}
                                    className="mt-1 flex items-center justify-end text-[10px] text-blue-600 font-medium hover:underline w-full"
                                >
                                    <FileText size={10} className="mr-1" /> PDF
                                </button>
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded p-2">
                            <ul className="space-y-1">
                                {bill.items.map((item, idx) => (
                                    <li key={idx} className="flex justify-between text-xs text-gray-700">
                                        <span className="truncate pr-2">• {item.name} <span className="text-gray-400">x{item.quantity}</span></span>
                                        <span className="font-medium flex-shrink-0">₹{item.price * item.quantity}</span>
                                    </li>
                                ))}
                            </ul>
                          </div>

                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-4 bg-white border-t border-gray-200 flex justify-between items-center gap-2">
                     <button
                        type="button"
                        onClick={(e) => openDeleteModal(customer, e)}
                        className="flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-100 hover:text-red-700 p-2.5 rounded-xl transition-colors flex-shrink-0"
                        title="Delete Customer"
                      >
                        <Trash2 size={20} />
                        <span className="ml-2 text-sm font-bold md:hidden">Delete</span>
                      </button>

                    <button
                      type="button"
                      onClick={(e) => openSettleModal(customer, e)}
                      className="flex-1 flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-bold shadow-md bg-green-600 hover:bg-green-700 text-white transition-all active:scale-95"
                    >
                      <CheckCircle size={18} className="mr-2" /> 
                      Receive Payment
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};