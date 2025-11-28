import React, { useMemo, useState } from 'react';
import { Bill, PaymentMode } from '../types';
import { 
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  PieChart, Pie, Cell, BarChart, Bar 
} from 'recharts';
import { 
  TrendingUp, Wallet, Download, 
  PieChart as PieIcon, ArrowUpRight, Ban, Search, 
  LayoutDashboard, List, UtensilsCrossed, Clock, FileSpreadsheet, ChevronDown
} from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

interface ReportsProps {
  bills: Bill[];
  onCancelBill: (id: string) => void;
}

type DateRange = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'all';
type ReportTab = 'dashboard' | 'transactions' | 'menu';

const COLORS = ['#ea580c', '#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#8b5cf6', '#ec4899'];
const PAYMENT_COLORS = {
  [PaymentMode.CASH]: '#10b981', // Green
  [PaymentMode.ONLINE]: '#3b82f6', // Blue
  [PaymentMode.UDHARI]: '#ef4444', // Red
};

export const Reports: React.FC<ReportsProps> = ({ bills, onCancelBill }) => {
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [activeTab, setActiveTab] = useState<ReportTab>('dashboard');
  
  // Transaction Tab State
  const [txnSearch, setTxnSearch] = useState('');
  const [txnFilter, setTxnFilter] = useState<PaymentMode | 'ALL'>('ALL');

  // Filter Bills Logic
  const filteredBills = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = new Date(startOfToday - 86400000).getTime();
    const startOfLast7Days = new Date(now.getTime() - 7 * 86400000).getTime();
    const startOfLast30Days = new Date(now.getTime() - 30 * 86400000).getTime();
    const startOfThisYear = new Date(now.getFullYear(), 0, 1).getTime();

    return bills.filter(bill => {
      let inRange = false;
      switch (dateRange) {
        case 'today': inRange = bill.timestamp >= startOfToday; break;
        case 'yesterday': inRange = bill.timestamp >= startOfYesterday && bill.timestamp < startOfToday; break;
        case 'week': inRange = bill.timestamp >= startOfLast7Days; break;
        case 'month': inRange = bill.timestamp >= startOfLast30Days; break;
        case 'year': inRange = bill.timestamp >= startOfThisYear; break;
        case 'all': default: inRange = true; break;
      }
      return inRange;
    });
  }, [bills, dateRange]);

  const activeBills = filteredBills.filter(b => !b.isCanceled);

  // --- ANALYTICS CALCULATIONS ---

  const totalSales = activeBills.reduce((acc, bill) => acc + bill.total, 0);
  const totalOrders = activeBills.length;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  
  const paymentStats = useMemo(() => {
    let cash = 0;
    let online = 0;
    let udhari = 0;

    activeBills.forEach(bill => {
      if (bill.paymentMode === PaymentMode.CASH) cash += bill.total;
      else if (bill.paymentMode === PaymentMode.ONLINE) online += bill.total;
      else if (bill.paymentMode === PaymentMode.UDHARI) udhari += bill.total;
    });

    return { cash, online, udhari, totalReceived: cash + online };
  }, [activeBills]);

  // Chart: Sales Trend
  const trendData = useMemo(() => {
    const data: Record<string, number> = {};
    if (dateRange === 'today' || dateRange === 'yesterday') {
      for (let i = 0; i < 24; i++) data[i.toString().padStart(2, '0') + ':00'] = 0;
      activeBills.forEach(bill => {
        const key = new Date(bill.timestamp).getHours().toString().padStart(2, '0') + ':00';
        data[key] = (data[key] || 0) + bill.total;
      });
    } else {
      activeBills.forEach(bill => {
        const key = new Date(bill.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        data[key] = (data[key] || 0) + bill.total;
      });
    }
    return Object.entries(data).map(([name, sales]) => ({ name, sales }));
  }, [activeBills, dateRange]);

  // Chart: Peak Hours
  const peakHoursData = useMemo(() => {
    const hours = Array(24).fill(0);
    activeBills.forEach(b => {
        const h = new Date(b.timestamp).getHours();
        hours[h] += b.total;
    });
    return hours.map((v, i) => {
        const hour12 = i === 0 ? '12 AM' : i === 12 ? '12 PM' : i > 12 ? `${i-12} PM` : `${i} AM`;
        return { hour: hour12, sales: v, fullHour: i };
    }).filter(h => h.sales > 0).sort((a,b) => a.fullHour - b.fullHour);
  }, [activeBills]);

  // Chart: Category Data
  const categoryData = useMemo(() => {
    const stats: Record<string, number> = {};
    activeBills.forEach(bill => {
      bill.items.forEach(item => {
        stats[item.category] = (stats[item.category] || 0) + (item.price * item.quantity);
      });
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [activeBills]);

  // Menu Analysis Data
  const itemPerformance = useMemo(() => {
    const stats: Record<string, { id: string, name: string, category: string, qty: number, revenue: number }> = {};
    activeBills.forEach(bill => {
      bill.items.forEach(item => {
        if (!stats[item.id]) stats[item.id] = { id: item.id, name: item.name, category: item.category, qty: 0, revenue: 0 };
        stats[item.id].qty += item.quantity;
        stats[item.id].revenue += item.price * item.quantity;
      });
    });
    return Object.values(stats).sort((a, b) => b.revenue - a.revenue);
  }, [activeBills]);

  // Transaction Search Logic
  const searchedTransactions = useMemo(() => {
      return filteredBills.filter(b => {
          const matchesSearch = 
            b.id.includes(txnSearch) || 
            (b.customerName && b.customerName.toLowerCase().includes(txnSearch.toLowerCase())) ||
            (b.tableNo && b.tableNo.toString().includes(txnSearch));
          const matchesFilter = txnFilter === 'ALL' || b.paymentMode === txnFilter;
          return matchesSearch && matchesFilter;
      }).reverse(); // Newest first
  }, [filteredBills, txnSearch, txnFilter]);


  // --- EXPORT FUNCTIONS ---

  const downloadPDFReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Business Report - ${dateRange.toUpperCase()}`, 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    
    // Summary
    doc.setFillColor(240, 240, 240);
    doc.rect(14, 35, 180, 25, 'F');
    doc.text(`Total Business: ${totalSales.toFixed(2)}`, 20, 45);
    doc.text(`Cash/Online Received: ${paymentStats.totalReceived.toFixed(2)}`, 20, 52);
    doc.text(`Udhari Given: ${paymentStats.udhari.toFixed(2)}`, 100, 52);

    autoTable(doc, {
      startY: 65,
      head: [['Time', 'Bill ID', 'Table', 'Mode', 'Amount']],
      body: activeBills.map(b => [
        new Date(b.timestamp).toLocaleTimeString(),
        b.id.slice(-6),
        b.tableNo ? `Table ${b.tableNo}` : '-',
        b.paymentMode,
        b.total.toFixed(2)
      ])
    });

    doc.save(`Sakshi_Dhaba_Report_${dateRange}.pdf`);
  };

  const downloadCSV = () => {
    // CSV Header
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Bill ID,Date,Time,Table No,Customer Name,Payment Mode,Total Amount,Status,Items\n";

    // CSV Rows
    filteredBills.forEach(b => {
        const itemsStr = b.items.map(i => `${i.name} (x${i.quantity})`).join("; ");
        const row = [
            b.id,
            new Date(b.timestamp).toLocaleDateString(),
            new Date(b.timestamp).toLocaleTimeString(),
            b.tableNo || "-",
            b.customerName || "-",
            b.paymentMode,
            b.total.toFixed(2),
            b.isCanceled ? "Canceled" : "Active",
            `"${itemsStr}"` // Quote items to handle commas
        ].join(",");
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sakshi_dhaba_export_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const confirmCancel = (billId: string) => {
      if(window.confirm("Are you sure you want to cancel this bill? Amount will be deducted.")) {
          onCancelBill(billId);
      }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white p-4 border-b border-gray-200 shadow-sm z-20 flex-shrink-0 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-2">
            <div className="bg-orange-100 p-2 rounded-lg">
                <TrendingUp className="text-orange-600" size={20} />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Analytics & Reports</h2>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
             <div className="relative flex-1 md:flex-none">
                <select 
                    value={dateRange} 
                    onChange={(e) => setDateRange(e.target.value as DateRange)}
                    className="w-full md:w-auto appearance-none bg-gray-100 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                    <option value="all">All Time</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3 text-gray-500 pointer-events-none" />
             </div>

             <button 
              onClick={downloadPDFReport}
              className="flex items-center gap-2 bg-gray-800 text-white px-3 py-2 rounded-lg hover:bg-gray-900 transition-colors shadow-sm text-xs font-bold"
            >
              <Download size={14} /> PDF
            </button>
            <button 
              onClick={downloadCSV}
              className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm text-xs font-bold"
            >
              <FileSpreadsheet size={14} /> CSV
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-gray-100 rounded-xl">
            {[
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'transactions', label: 'Transactions', icon: List },
                { id: 'menu', label: 'Menu Analysis', icon: UtensilsCrossed }
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as ReportTab)}
                    className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                        activeTab === tab.id 
                        ? 'bg-white text-orange-600 shadow-sm transform scale-[1.02]' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <tab.icon size={14} className="mr-1.5" strokeWidth={2.5} />
                    {tab.label}
                </button>
            ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* === DASHBOARD TAB === */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm col-span-2 lg:col-span-1 relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                   <TrendingUp size={64} />
                </div>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Total Revenue</p>
                <h3 className="text-3xl font-black text-gray-900 mt-1">₹{totalSales.toFixed(0)}</h3>
                <p className="text-xs text-orange-600 mt-1 font-bold bg-orange-50 inline-block px-2 py-0.5 rounded-full">{totalOrders} Orders</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                        <div className="bg-green-100 p-1.5 rounded-lg">
                            <Wallet className="text-green-700" size={16} />
                        </div>
                        <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Collected</span>
                    </div>
                    <h3 className="text-xl font-black text-gray-800">₹{paymentStats.totalReceived.toFixed(0)}</h3>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">CASH & ONLINE</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                        <div className="bg-red-100 p-1.5 rounded-lg">
                            <ArrowUpRight className="text-red-700" size={16} />
                        </div>
                        <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">Pending</span>
                    </div>
                    <h3 className="text-xl font-black text-gray-800">₹{paymentStats.udhari.toFixed(0)}</h3>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">UDHARI</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
                <div className="relative z-10">
                     <div className="flex justify-between items-start mb-2">
                        <div className="bg-blue-100 p-1.5 rounded-lg">
                            <UtensilsCrossed className="text-blue-700" size={16} />
                        </div>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">Avg</span>
                    </div>
                    <h3 className="text-xl font-black text-gray-800">₹{avgOrderValue.toFixed(0)}</h3>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">PER ORDER</p>
                </div>
            </div>
            </div>

            {/* Sales Trend Chart */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-2">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center">
                        <TrendingUp size={16} className="mr-2 text-orange-500"/> Sales Trend
                    </h3>
                </div>
                <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                    <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ea580c" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" hide={dateRange === 'today' || dateRange === 'yesterday'} tick={{fontSize: 10}} interval={0} />
                    <Tooltip 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)'}}
                        cursor={{ stroke: '#ea580c', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area type="monotone" dataKey="sales" stroke="#ea580c" strokeWidth={3} fill="url(#colorSales)" />
                    </AreaChart>
                </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Peak Hours Chart */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center mb-4">
                        <Clock size={16} className="mr-2 text-purple-500"/> Peak Hours
                    </h3>
                    <div className="h-48 w-full">
                        {peakHoursData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={peakHoursData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis dataKey="hour" tick={{fontSize: 10}} />
                                    <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px'}} />
                                    <Bar dataKey="sales" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-xs">Not enough data</div>
                        )}
                    </div>
                </div>

                {/* Category Donut */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-center">
                    <div className="h-40 w-40 relative flex-shrink-0">
                        <ResponsiveContainer>
                            <PieChart>
                            <Pie data={categoryData} innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value">
                                {categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <PieIcon size={16} className="text-gray-400" />
                        </div>
                    </div>
                    <div className="flex-1 space-y-2 w-full">
                        <h4 className="text-xs font-bold text-gray-500 uppercase border-b border-gray-100 pb-1">Top Categories</h4>
                         {categoryData.slice(0, 4).map((c, i) => (
                            <div key={c.name} className="flex justify-between items-center text-xs">
                                <span className="flex items-center text-gray-600 font-medium">
                                    <span className="w-2.5 h-2.5 rounded-full mr-2" style={{backgroundColor: COLORS[i % COLORS.length]}}></span>
                                    {c.name}
                                </span>
                                <span className="font-bold text-gray-900">₹{c.value}</span>
                            </div>
                         ))}
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* === TRANSACTIONS TAB === */}
        {activeTab === 'transactions' && (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full animate-in slide-in-from-right-2 fade-in overflow-hidden">
                {/* Filters */}
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search by ID, Customer, Table..." 
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                            value={txnSearch}
                            onChange={(e) => setTxnSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                        {(['ALL', ...Object.values(PaymentMode)] as const).map(mode => (
                             <button
                                key={mode}
                                onClick={() => setTxnFilter(mode)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                                    txnFilter === mode 
                                    ? 'bg-gray-900 text-white border-gray-900 shadow-md' 
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                             >
                                {mode === 'ALL' ? 'All' : mode}
                             </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 font-bold">Bill ID</th>
                                <th className="px-4 py-3 font-bold">Time</th>
                                <th className="px-4 py-3 font-bold">Details</th>
                                <th className="px-4 py-3 font-bold">Mode</th>
                                <th className="px-4 py-3 text-right font-bold">Total</th>
                                <th className="px-4 py-3 text-center font-bold">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {searchedTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-gray-400">
                                        <div className="flex flex-col items-center">
                                            <Search size={32} className="mb-2 opacity-20" />
                                            <p>No transactions found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                searchedTransactions.map((bill) => (
                                    <tr key={bill.id} className={`hover:bg-gray-50 transition-colors ${bill.isCanceled ? 'opacity-50 bg-gray-50' : ''}`}>
                                        <td className="px-4 py-3 font-mono text-xs text-gray-500">#{bill.id.slice(-6)}</td>
                                        <td className="px-4 py-3 text-gray-600">
                                            <div className="font-bold text-xs">{new Date(bill.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                            <div className="text-[10px] text-gray-400">{new Date(bill.timestamp).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-gray-900 text-xs">{bill.customerName || 'Walk-in'}</div>
                                            {bill.tableNo && <div className="text-[10px] text-orange-600 font-bold bg-orange-50 inline-block px-1.5 rounded mt-0.5">T-{bill.tableNo}</div>}
                                        </td>
                                        <td className="px-4 py-3">
                                            {bill.isCanceled ? (
                                                <span className="px-2 py-1 rounded bg-gray-200 text-gray-600 text-[10px] font-bold uppercase">Canceled</span>
                                            ) : (
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                                    bill.paymentMode === PaymentMode.UDHARI ? 'bg-red-100 text-red-700' :
                                                    bill.paymentMode === PaymentMode.ONLINE ? 'bg-blue-100 text-blue-700' :
                                                    'bg-green-100 text-green-700'
                                                }`}>
                                                    {bill.paymentMode === 'Online Payment' ? 'Online' : bill.paymentMode}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-black text-gray-800">
                                            ₹{bill.total.toFixed(0)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {!bill.isCanceled ? (
                                                <button 
                                                    onClick={() => confirmCancel(bill.id)}
                                                    className="text-red-500 hover:text-white hover:bg-red-500 p-2 rounded-lg transition-all"
                                                    title="Cancel Bill"
                                                >
                                                    <Ban size={16} />
                                                </button>
                                            ) : (
                                                <span className="text-[10px] text-red-500 font-bold">Refunded</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
             </div>
        )}

        {/* === MENU ANALYSIS TAB === */}
        {activeTab === 'menu' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in slide-in-from-right-2 fade-in">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-orange-50">
                    <h3 className="font-bold text-orange-900 flex items-center gap-2">
                        <UtensilsCrossed size={18} /> Item Performance
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white text-gray-500 text-xs uppercase border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3 font-bold">Rank</th>
                                <th className="px-6 py-3 font-bold">Item Name</th>
                                <th className="px-6 py-3 font-bold">Category</th>
                                <th className="px-6 py-3 text-right font-bold">Qty</th>
                                <th className="px-6 py-3 text-right font-bold">Revenue</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                             {itemPerformance.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-8 text-gray-400">No sales data for this period</td></tr>
                             ) : (
                                 itemPerformance.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-400 font-black text-xs">#{index + 1}</td>
                                        <td className="px-6 py-4 font-bold text-gray-800">{item.name}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                item.category === 'Veg' ? 'bg-green-100 text-green-700' :
                                                item.category === 'Non Veg' ? 'bg-red-100 text-red-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-gray-600">{item.qty}</td>
                                        <td className="px-6 py-4 text-right font-black text-gray-900">₹{item.revenue.toFixed(2)}</td>
                                    </tr>
                                 ))
                             )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};