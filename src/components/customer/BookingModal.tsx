import React, { useState } from 'react';
import { X, MapPin, Clock, Car, CreditCard, Check, Phone } from 'lucide-react';
import { supabase, ParkingZone } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const vehicleTypes = ['car', 'suv', 'motorcycle', 'truck'] as const;

const ADMIN_BKASH_NUMBER = '018411673';

type Props = {
  zone: ParkingZone;
  onClose: () => void;
  onSuccess: () => void;
};

export default function BookingModal({ zone, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<'form' | 'duration' | 'payment' | 'success'>('form');
  const [form, setForm] = useState({
    vehicle_plate: '',
    vehicle_type: 'car' as typeof vehicleTypes[number],
  });
  const [duration, setDuration] = useState(1);
  const [customerBkashNumber, setCustomerBkashNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const freeSpots = zone.total_spots - zone.occupied_spots;
  const totalAmount = zone.hourly_rate * duration;

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vehicle_plate.trim()) { setError('Vehicle plate is required'); return; }
    setError('');
    setStep('duration');
  }

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerBkashNumber.trim()) { setError('Your bKash number is required'); return; }
    if (customerBkashNumber.trim().length < 10) { setError('Enter a valid bKash number'); return; }
    if (!transactionId.trim()) { setError('Transaction ID is required'); return; }
    await processBooking();
  }

  async function processBooking() {
    if (zone.occupied_spots >= zone.total_spots) { setError('This zone is now full'); return; }

    setLoading(true);
    setError('');

    const { error: err } = await supabase.from('parking_sessions').insert({
      user_id: user?.id,
      vehicle_plate: form.vehicle_plate.toUpperCase(),
      vehicle_type: form.vehicle_type,
      zone_id: zone.id,
      spot_number: `S${Math.floor(Math.random() * 900) + 100}`,
      amount_paid: totalAmount,
    });

    if (err) { setError(err.message); setLoading(false); return; }

    await supabase
      .from('parking_zones')
      .update({ occupied_spots: zone.occupied_spots + 1 })
      .eq('id', zone.id);

    setLoading(false);
    setStep('success');
    setTimeout(() => onSuccess(), 2500);
  }

  const stepIndex = { form: 0, duration: 1, payment: 2, success: 2 };
  const currentStep = stepIndex[step];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="relative bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{zone.name}</h2>
              <p className="text-white/80 text-sm">{zone.location}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <span className="text-white/90">৳{zone.hourly_rate}/hour</span>
            <span className="text-white/80">•</span>
            <span className="text-white/90">{freeSpots} spots available</span>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-3 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            {['Vehicle', 'Duration', 'Payment'].map((label, i) => (
              <React.Fragment key={label}>
                <div className={`flex items-center gap-2 ${currentStep === i ? 'text-blue-600' : currentStep > i ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    currentStep > i ? 'bg-green-500 text-white' :
                    currentStep === i ? 'bg-blue-500 text-white' :
                    'bg-gray-200 text-gray-400'
                  }`}>
                    {currentStep > i ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  <span className="text-xs font-medium">{label}</span>
                </div>
                {i < 2 && <div className="flex-1 h-0.5 bg-gray-200 mx-2" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step 1 — Vehicle */}
        {step === 'form' && (
          <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Vehicle Plate Number</label>
              <div className="relative">
                <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={form.vehicle_plate}
                  onChange={e => setForm(f => ({ ...f, vehicle_plate: e.target.value.toUpperCase() }))}
                  placeholder="e.g. ABC-1234"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase tracking-wide"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Vehicle Type</label>
              <select
                value={form.vehicle_type}
                onChange={e => setForm(f => ({ ...f, vehicle_type: e.target.value as any }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
              >
                {vehicleTypes.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">{error}</div>}

            <button type="submit" className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/20">
              Continue
            </button>
          </form>
        )}

        {/* Step 2 — Duration */}
        {step === 'duration' && (
          <div className="p-6">
            <div className="text-center mb-6">
              <Clock className="w-12 h-12 text-blue-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900">Select Duration</h3>
              <p className="text-sm text-gray-500 mt-1">How long do you need parking?</p>
            </div>

            <div className="flex items-center justify-center gap-6 mb-6">
              <button
                type="button"
                onClick={() => setDuration(d => Math.max(1, d - 1))}
                className="w-11 h-11 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-2xl font-bold transition-colors"
              >
                -
              </button>
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-900">{duration}</div>
                <div className="text-sm text-gray-500">{duration === 1 ? 'hour' : 'hours'}</div>
              </div>
              <button
                type="button"
                onClick={() => setDuration(d => Math.min(24, d + 1))}
                className="w-11 h-11 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-2xl font-bold transition-colors"
              >
                +
              </button>
            </div>

            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl mb-6">
              <span className="text-gray-600 font-medium">Total Amount</span>
              <span className="text-2xl font-bold text-blue-600">৳{totalAmount}</span>
            </div>

            <button
              onClick={() => setStep('payment')}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
            >
              Proceed to Payment
            </button>
            <button onClick={() => setStep('form')} className="w-full py-2.5 mt-2 text-gray-600 text-sm font-medium hover:text-gray-800 transition-colors">
              Back
            </button>
          </div>
        )}

        {/* Step 3 — Payment */}
        {step === 'payment' && (
          <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="w-6 h-6 text-pink-500" />
              <h3 className="text-base font-bold text-gray-900">bKash Payment</h3>
            </div>

            {/* Admin bKash number — send to this */}
            <div className="bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 rounded-xl p-4">
              <p className="text-gray-700 text-sm mb-2 text-center">
                Send <span className="font-bold text-pink-600">৳{totalAmount}</span> to this bKash number
              </p>
              <div className="flex items-center justify-center gap-2 bg-white px-4 py-2.5 rounded-lg mb-3">
                <Phone className="w-4 h-4 text-pink-500" />
                <p className="text-2xl font-bold text-pink-600 tracking-wider">{ADMIN_BKASH_NUMBER}</p>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <p>1. Open bKash app or dial *247#</p>
                <p>2. Select "Send Money"</p>
                <p>3. Enter the number: <strong>{ADMIN_BKASH_NUMBER}</strong></p>
                <p>4. Enter amount: ৳{totalAmount}</p>
                <p>5. Use reference: "<strong>{form.vehicle_plate}</strong>"</p>
              </div>
            </div>

            {/* Customer's own bKash number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Your bKash Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={customerBkashNumber}
                  onChange={e => setCustomerBkashNumber(e.target.value)}
                  placeholder="e.g. 01XXXXXXXXX"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                  required
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">The number you sent money from</p>
            </div>

            {/* Transaction ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                bKash Transaction ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={transactionId}
                onChange={e => setTransactionId(e.target.value)}
                placeholder="e.g. 8G7H6F5D4S"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 tracking-wide"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Found in your bKash transaction history</p>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1.5">
                <span>Vehicle</span>
                <span className="font-medium text-gray-900">{form.vehicle_plate}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-1.5">
                <span>Duration</span>
                <span className="font-medium text-gray-900">{duration} hour{duration > 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-1.5">
                <span>Rate</span>
                <span className="font-medium text-gray-900">৳{zone.hourly_rate}/hr</span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-xl text-blue-600">৳{totalAmount}</span>
              </div>
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-pink-500/20 disabled:opacity-50"
            >
              {loading ? 'Processing...' : `Confirm Payment — ৳${totalAmount}`}
            </button>
            <button
              type="button"
              onClick={() => setStep('duration')}
              className="w-full py-2.5 text-gray-600 text-sm font-medium hover:text-gray-800 transition-colors"
            >
              Back
            </button>
          </form>
        )}

        {/* Success */}
        {step === 'success' && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Booking Confirmed!</h3>
            <p className="text-gray-500 text-sm mb-4">
              Your parking spot has been reserved at {zone.name}
            </p>
            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Vehicle</span>
                <span className="font-bold text-gray-900">{form.vehicle_plate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Duration</span>
                <span className="font-medium text-gray-900">{duration} hour{duration > 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Amount Paid</span>
                <span className="font-bold text-green-600">৳{totalAmount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Your bKash No.</span>
                <span className="font-medium text-gray-900">{customerBkashNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Transaction ID</span>
                <span className="font-medium text-gray-900 font-mono">{transactionId}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
