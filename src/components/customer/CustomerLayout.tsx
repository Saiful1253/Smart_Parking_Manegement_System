import React from 'react';
import { Car, MapPin, Clock, User, LogOut, Map } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

type CustomerPage = 'find' | 'map' | 'sessions' | 'history' | 'profile';

const navItems: { id: CustomerPage; label: string; icon: React.ReactNode }[] = [
  { id: 'find', label: 'Find Parking', icon: <MapPin className="w-5 h-5" /> },
  { id: 'map', label: 'Map View', icon: <Map className="w-5 h-5" /> },
  { id: 'sessions', label: 'My Sessions', icon: <Clock className="w-5 h-5" /> },
  { id: 'history', label: 'History', icon: <Car className="w-5 h-5" /> },
  { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
];

type Props = {
  activePage: CustomerPage;
  onNavigate: (page: CustomerPage) => void;
  children: React.ReactNode;
};

export default function CustomerLayout({ activePage, onNavigate, children }: Props) {
  const { profile, signOut } = useAuth();

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-slate-900 flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center shadow-md">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-base leading-none">SmartPark</p>
              <p className="text-slate-400 text-xs uppercase tracking-widest mt-0.5">Customer</p>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-slate-700/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-slate-400" />
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{profile?.full_name || 'Customer'}</p>
              <p className="text-slate-400 text-xs truncate">{profile?.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activePage === item.id
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
