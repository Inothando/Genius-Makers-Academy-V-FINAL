import React, { useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface PayfastCheckoutProps {
  amount: number;
  itemName: string;
  customStr1?: string;
  customStr2?: string;
  buttonText?: string;
  className?: string;
}

export function PayFastCheckout({
  amount,
  itemName,
  customStr1,
  customStr2,
  buttonText = 'Pay Now',
  className = ''
}: PayfastCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [payfastParams, setPayfastParams] = useState<Record<string, string> | null>(null);
  const [payfastUrl, setPayfastUrl] = useState<string>('');

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/payfast/generate-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount.toString(),
          item_name: itemName,
          custom_str1: customStr1,
          custom_str2: customStr2
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to generate payment signature');
      }

      setPayfastParams(data.payload);
      setPayfastUrl(data.payfast_url);

      // We need a short timeout to allow React to render the hidden form with new params
      setTimeout(() => {
        if (formRef.current) {
          formRef.current.submit();
        }
      }, 100);

    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'Error processing payment request');
      setLoading(false);
    }
  };

  return (
    <div className="inline-block">
      <button
        onClick={handleCheckout}
        disabled={loading}
        className={`px-6 py-3 bg-[var(--color-lux-green-500)] hover:bg-[var(--color-lux-green-800)] text-lux-text font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${className} disabled:opacity-70 disabled:cursor-not-allowed`}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          buttonText
        )}
      </button>

      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}

      {/* Hidden PayFast Form */}
      {payfastParams && payfastUrl && (
        <form
          ref={formRef}
          action={payfastUrl}
          method="POST"
          style={{ display: 'none' }}
        >
          {Object.entries(payfastParams).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value as string} />
          ))}
        </form>
      )}
    </div>
  );
}
