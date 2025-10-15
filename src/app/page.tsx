'use client';

import { useState } from 'react';
import ReceiptRenderer from '@/components/ReceiptRenderer';
import ReceiptForm from '@/components/ReceiptForm';
import { ReceiptData } from '@/types/receipt';

const defaultReceiptData: ReceiptData = {
  receiptType: 'ФИСКАЛНА СМЕТКА',
  storeName: 'Sample Store',
  address: '123 Main St, City, ST 12345',
  taxNumber: '(555) 123-4567',
  vatNumber: '(555) 765-4321',
  items: [
    { name: 'Coffee', quantity: 2, price: 3.50, vatType: 'A' as const },
    { name: 'Sandwich', quantity: 1, price: 8.99, vatType: 'A' as const },
    { name: 'Pastry', quantity: 3, price: 2.25, vatType: 'B' as const }
  ],
  vatTypeA: 18.00,
  vatTypeB: 5.00,
  vatTypeV: 0.00,
  vatTypeG: 0.00,
  total: 24.79,
  paymentMethod: 'Credit Card',
  receiptNumber: '0012',
  date: new Date().toLocaleDateString()
};

export default function Home() {
  const [receiptData, setReceiptData] = useState(defaultReceiptData);

  return (
    <div className="font-sans min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Fiscal Printer Simulator</h1>
          <p className="text-lg text-gray-600">
            Generate and download thermal receipt images (384px width)
          </p>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="flex justify-center">
            <ReceiptForm
              initialData={defaultReceiptData}
              onDataChange={setReceiptData}
            />
          </div>
          
          {/* Preview Section */}
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Live Preview</h2>
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <ReceiptRenderer receiptData={receiptData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
