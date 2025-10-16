'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import ReceiptRenderer from '@/components/ReceiptRenderer';
import ReceiptForm from '@/components/ReceiptForm';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { ReceiptData } from '@/types/receipt';

const defaultReceiptData: ReceiptData = {
  receiptType: 'ФИСКАЛНА СМЕТКА',
  storeName: 'ГРАНДПРОМ - ЗУР Д.О.О.Е.Л.',
  address: 'УЛИЦА 7 260 СКОПЈЕ',
  taxNumber: '(555) 123-4567',
  vatNumber: '(555) 765-4321',
  items: [
    { name: 'Coffee', quantity: 2, price: 3.50, vatType: 'A' as const, isDomestic: false },
    { name: 'Sandwich', quantity: 1, price: 8.99, vatType: 'A' as const, isDomestic: false },
    { name: 'Pastry', quantity: 3, price: 2.25, vatType: 'B' as const, isDomestic: false }
  ],
  vatTypeA: 18.00,
  vatTypeB: 5.00,
  vatTypeV: 0.00,
  vatTypeG: 0.00,
  total: 24.79,
  paymentMethod: 'ВО ГОТОВО',
  receiptNumber: '0012',
  date: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
  dateTextFlag: false,
  time: new Date().toLocaleTimeString('mk-MK', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  datamatrixCode: 'AC455104813AC455104813AC00217425hffhjfhjkhdjkdfhjkdfhdfjklhfdjkfjkdfhdfjklhdfdjfkdfhjklfhkidfgkloptrjkhrjkghkjghgkhgkfhghgkhgfhjkgdfjkghfjkghfgjkdfhgjkhggkjhfgkjfhgkhgdfkjh',
  datamatrixSize: 150,
  fiscalLogoSize: 200,
  headerFontSize: 37,
  headerFontSpacing: 35,
  bodyFontSize: 22,
  bodyFontSpacing: 25
};

export default function Home() {
  const [receiptData, setReceiptData] = useState(defaultReceiptData);
  const t = useTranslations();

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* iOS-style liquid glass gradient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Multi-layer gradient mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 via-purple-400/30 to-pink-400/30" />
        <div className="absolute inset-0 bg-gradient-to-tl from-cyan-300/20 via-indigo-300/20 to-violet-300/20" />
        <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-300/15 via-rose-300/15 to-amber-300/15" />

        {/* Large gradient orbs for depth */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-br from-blue-400/40 to-cyan-400/40 blur-3xl" />
        <div className="absolute top-1/4 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-purple-400/40 to-pink-400/40 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-violet-400/35 to-fuchsia-400/35 blur-3xl" />
      </div>
      
      <div className="container mx-auto p-8 relative z-10">
        <header className="mb-12">
          <div className="flex justify-between items-start mb-10">
            <div className="flex-1" />
            <div className="text-center">
              <h1 className="text-5xl font-semibold mb-3 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent tracking-tight">
                {t('title')}
              </h1>
              <p className="text-lg text-gray-600/90 font-medium">
                {t('subtitle')}
              </p>
            </div>
            <div className="flex-1 flex justify-end">
              <LanguageSwitcher />
            </div>
          </div>
        </header>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          {/* Form Section */}
          <div className="order-1 xl:order-1">
            <ReceiptForm
              initialData={defaultReceiptData}
              onDataChange={setReceiptData}
            />
          </div>

          {/* Preview Section */}
          <div className="order-2 xl:order-2 flex flex-col">
            <div className="sticky top-8">
              <h2 className="text-xl font-semibold mb-6 text-gray-800/90">{t('livePreview')}</h2>
              <div className="relative group">
                {/* Chromatic aberration effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-pink-500/5 rounded-[28px] translate-x-[2px] translate-y-[2px] blur-sm" />
                <div className="absolute inset-0 bg-gradient-to-tl from-blue-500/5 to-purple-500/5 rounded-[28px] -translate-x-[2px] -translate-y-[2px] blur-sm" />

                {/* Main glass card with 3D effect */}
                <div className="relative backdrop-blur-xl bg-white/40 border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-10 rounded-[28px] transition-all duration-300 hover:shadow-[0_12px_48px_rgba(0,0,0,0.12)] hover:bg-white/45 hover:scale-[1.002]">
                  {/* Inner shadow for depth */}
                  <div className="absolute inset-0 rounded-[28px] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]" />
                  <div className="relative max-h-[calc(100vh-12rem)] overflow-y-auto">
                    <ReceiptRenderer receiptData={receiptData} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
