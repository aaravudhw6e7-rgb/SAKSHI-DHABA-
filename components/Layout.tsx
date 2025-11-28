import React from 'react';
import { ViewState } from '../types';
import { LayoutGrid, Users, BarChart3, UtensilsCrossed } from 'lucide-react';

interface LayoutProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentView, onChangeView, children }) => {
  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => (
    <button
      onClick={() => onChangeView(view)}
      className={`flex flex-col items-center justify-center w-full py-3 space-y-1 transition-all duration-300 relative ${
        currentView === view
          ? 'text-orange-600'
          : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      <div className={`p-1 rounded-full transition-all ${currentView === view ? 'bg-orange-50 transform scale-110' : ''}`}>
        <Icon size={22} strokeWidth={currentView === view ? 2.5 : 2} />
      </div>
      <span className={`text-[10px] font-bold tracking-wide ${currentView === view ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
      
      {currentView === view && (
          <div className="absolute top-0 w-8 h-1 bg-orange-600 rounded-b-full"></div>
      )}
    </button>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-100 no-print font-sans">
      {/* Header */}
      <header className="bg-white text-gray-900 shadow-sm z-20 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-orange-600 p-1.5 rounded-lg">
                <UtensilsCrossed size={20} className="text-white" />
            </div>
            <h1 className="text-lg font-black tracking-tight text-gray-900">SAKSHI DHABA</h1>
          </div>
          <div className="text-gray-500 text-xs font-bold bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>

      {/* Bottom Navigation (Mobile First) */}
      <nav className="bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-20 pb-safe">
        <div className="flex justify-around max-w-7xl mx-auto">
          <NavItem view="POS" icon={LayoutGrid} label="POS" />
          <NavItem view="UDHARI" icon={Users} label="UDHARI" />
          <NavItem view="REPORTS" icon={BarChart3} label="REPORTS" />
          <NavItem view="MENU" icon={UtensilsCrossed} label="MENU" />
        </div>
      </nav>
    </div>
  );
};