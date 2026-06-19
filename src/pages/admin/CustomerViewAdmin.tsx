import React, { useState } from 'react';
import FindParking from '../customer/FindParking';
import MySessions from '../customer/MySessions';
import CustomerHistory from '../customer/CustomerHistory';
import { MapPin, Clock, Car } from 'lucide-react';

type Tab = 'find' | 'sessions' | 'history';

export default function CustomerViewAdmin() {
  const [tab, setTab] = useState<Tab>('find');
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'find', label: 'Find Parking', icon: <MapPin className="w-4 h-4" /> },
    { id: 'sessions', label: 'Active Sessions', icon: <Clock className="w-4 h-4" /> },
    { id: 'history', label: 'History', icon: <Car className="w-4 h-4" /> },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Customer View</h1>
        <p className="text-gray-500 mt-1">Preview the customer-facing parking experience</p>
      </div>
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${tab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>
      <div className="-mx-8 -mb-8">
        {tab === 'find' && <FindParking />}
        {tab === 'sessions' && <MySessions />}
        {tab === 'history' && <CustomerHistory />}
      </div>
    </div>
  );
}
