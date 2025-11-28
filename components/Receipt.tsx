import React from 'react';
import { Bill } from '../types';

interface ReceiptProps {
  bill: Bill | null;
}

export const Receipt: React.FC<ReceiptProps> = ({ bill }) => {
  if (!bill) return null;

  return (
    <div className="print-only p-4 bg-white text-black font-mono text-sm">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold">SAKSHI DHABA</h1>
        <p>Main Highway Road, Sector 12</p>
        <p>Ph: +91 98765 43210</p>
      </div>
      
      <div className="border-b border-black pb-2 mb-2">
        <p>Bill #: {bill.id.slice(-6).toUpperCase()}</p>
        <p>Date: {new Date(bill.timestamp).toLocaleString()}</p>
        {bill.tableNo && <p className="font-bold">Table No: {bill.tableNo}</p>}
        <p>Mode: {bill.paymentMode}</p>
        {bill.customerName && <p>Customer: {bill.customerName}</p>}
      </div>

      <table className="w-full mb-4 text-left">
        <thead>
          <tr className="border-b border-black border-dashed">
            <th className="py-1">Item</th>
            <th className="py-1 text-center">Qty</th>
            <th className="py-1 text-right">Amt</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((item, idx) => (
            <tr key={idx}>
              <td className="py-1">{item.name}</td>
              <td className="py-1 text-center">{item.quantity}</td>
              <td className="py-1 text-right">₹{(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-black pt-2 space-y-1">
        {/* GST Removed */}
        <div className="flex justify-between text-lg font-bold mt-2">
          <span>Total:</span>
          <span>₹{bill.total.toFixed(2)}</span>
        </div>
      </div>

      {bill.notes && (
        <div className="mt-2 pt-2 border-t border-dashed border-gray-400">
           <p className="font-bold text-xs">Kitchen Note:</p>
           <p>{bill.notes}</p>
        </div>
      )}

      <div className="mt-8 text-center text-xs">
        <p>Thank you for visiting!</p>
        <p>Please come again.</p>
      </div>
    </div>
  );
};