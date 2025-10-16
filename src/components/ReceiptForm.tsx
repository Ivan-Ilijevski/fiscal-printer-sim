'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ReceiptData, ReceiptItem } from '@/types/receipt';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ReceiptFormProps {
  initialData: ReceiptData;
  onDataChange: (data: ReceiptData) => void;
}

export default function ReceiptForm({ initialData, onDataChange }: ReceiptFormProps) {
  const [formData, setFormData] = useState(initialData);
  const t = useTranslations();

  const updateFormData = (updates: Partial<ReceiptData>) => {
    const newData = { ...formData, ...updates };
    setFormData(newData);
    onDataChange(newData);
  };

  const updateStoreInfo = (field: string, value: string) => {
    // Convert numeric fields to numbers
    const numericFields = ['datamatrixSize', 'fiscalLogoSize', 'headerFontSize', 'headerFontSpacing', 'bodyFontSize', 'bodyFontSpacing'];
    const processedValue = numericFields.includes(field) ? Number(value) : value;
    updateFormData({ [field]: processedValue });
  };

  const updateItem = (index: number, field: keyof ReceiptItem, value: string | number | boolean) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index] };
    
    if (field === 'name') {
      item.name = value as string;
    } else if (field === 'quantity') {
      item.quantity = Number(value);
    } else if (field === 'price') {
      item.price = Number(value);
    } else if (field === 'vatType') {
      item.vatType = value as 'A' | 'B' | 'V' | 'G';
    } else if (field === 'isDomestic') {
      item.isDomestic = value as boolean;
    }

    newItems[index] = item;
    
    const totalAmount = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    updateFormData({
      items: newItems,
      total: Number(totalAmount.toFixed(2))
    });
  };

  const addItem = () => {
    const newItem: ReceiptItem = {
      name: 'New Item',
      quantity: 1,
      price: 0.00,
      vatType: 'A',
      isDomestic: false
    };
    
    const newItems = [...formData.items, newItem];
    const totalAmount = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    updateFormData({
      items: newItems,
      total: Number(totalAmount.toFixed(2))
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    const totalAmount = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    updateFormData({
      items: newItems,
      total: Number(totalAmount.toFixed(2))
    });
  };

  const paymentMethodOptions = [
    { value: "НА КРЕДИТ", label: t('paymentMethods.creditCard') },
    { value: "ВО ГОТОВО", label: t('paymentMethods.cash') },
    { value: "Debit Card", label: t('paymentMethods.debitCard') },
    { value: "Mobile Payment", label: t('paymentMethods.mobilePayment') }
  ];

  return (
    <div className="w-full max-w-2xl space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-800/90 mb-2">{t('customizeReceipt')}</h2>
        <p className="text-gray-600/80 font-medium text-sm">Configure your receipt details and items</p>
      </div>
      
      {/* Store Information */}
      <div className="relative group">
        {/* Chromatic aberration layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/3 to-purple-500/3 rounded-[22px] translate-x-[1.5px] translate-y-[1.5px] blur-[0.5px]" />
        <div className="absolute inset-0 bg-gradient-to-tl from-pink-500/3 to-cyan-500/3 rounded-[22px] -translate-x-[1.5px] -translate-y-[1.5px] blur-[0.5px]" />

        <div className="relative backdrop-blur-2xl bg-white/35 border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.06)] rounded-[22px] overflow-hidden transition-all duration-300 hover:bg-white/40 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
          {/* Inner highlight for depth */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

          <div className="bg-gradient-to-b from-white/20 to-white/5 px-6 py-4 border-b border-white/30">
            <h3 className="text-lg font-semibold text-gray-800/90">{t('storeInformation')}</h3>
          </div>
          <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="storeName" className="text-gray-700/90 font-medium text-xs">{t('storeName')}</Label>
              <Input
                id="storeName"
                type="text"
                value={formData.storeName}
                onChange={(e) => updateStoreInfo('storeName', e.target.value)}
                className="backdrop-blur-xl bg-white/30 border border-white/40 text-gray-800 placeholder:text-gray-500/60 h-11 rounded-xl focus:bg-white/40 focus:border-white/60 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-gray-700/90 font-medium text-xs">{t('address')}</Label>
              <Input
                id="address"
                type="text"
                value={formData.address}
                onChange={(e) => updateStoreInfo('address', e.target.value)}
                className="backdrop-blur-xl bg-white/30 border border-white/40 text-gray-800 placeholder:text-gray-500/60 h-11 rounded-xl focus:bg-white/40 focus:border-white/60 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxNumber" className="text-gray-700/90 font-medium text-xs">{t('taxNumber')}</Label>
              <Input
                id="taxNumber"
                type="text"
                value={formData.taxNumber}
                onChange={(e) => updateStoreInfo('taxNumber', e.target.value)}
                className="backdrop-blur-xl bg-white/30 border border-white/40 text-gray-800 placeholder:text-gray-500/60 h-11 rounded-xl focus:bg-white/40 focus:border-white/60 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vatNumber" className="text-gray-700/90 font-medium text-xs">{t('vatNumber')}</Label>
              <Input
                id="vatNumber"
                type="text"
                value={formData.vatNumber}
                onChange={(e) => updateStoreInfo('vatNumber', e.target.value)}
                className="backdrop-blur-xl bg-white/30 border border-white/40 text-gray-800 placeholder:text-gray-500/60 h-11 rounded-xl focus:bg-white/40 focus:border-white/60 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="receiptNumber" className="text-gray-700/90 font-medium text-xs">{t('receiptNumber')}</Label>
              <Input
                id="receiptNumber"
                type="text"
                value={formData.receiptNumber}
                onChange={(e) => updateStoreInfo('receiptNumber', e.target.value)}
                className="backdrop-blur-xl bg-white/30 border border-white/40 text-gray-800 placeholder:text-gray-500/60 h-11 rounded-xl focus:bg-white/40 focus:border-white/60 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod" className="text-gray-700/90 font-medium text-xs">{t('paymentMethod')}</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => updateStoreInfo('paymentMethod', value)}
              >
                <SelectTrigger className="backdrop-blur-xl bg-white/30 border border-white/40 text-gray-800 h-11 rounded-xl focus:bg-white/40 focus:border-white/60 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-2xl bg-white/85 border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-xl">
                  {paymentMethodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-gray-800 rounded-lg focus:bg-white/40">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="datamatrixCode" className="text-gray-700/90 font-medium text-xs">Datamatrix Code</Label>
              <Input
                id="datamatrixCode"
                type="text"
                value={formData.datamatrixCode}
                onChange={(e) => updateStoreInfo('datamatrixCode', e.target.value)}
                placeholder="Enter text for datamatrix"
                className="backdrop-blur-xl bg-white/30 border border-white/40 text-gray-800 placeholder:text-gray-500/60 h-11 rounded-xl focus:bg-white/40 focus:border-white/60 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="datamatrixSize" className="text-gray-700/90 font-medium text-xs">Datamatrix Size (px)</Label>
              <div className="flex items-center gap-3">
                <input
                  id="datamatrixSize"
                  type="range"
                  min="50"
                  max="300"
                  step="10"
                  value={formData.datamatrixSize}
                  onChange={(e) => updateStoreInfo('datamatrixSize', e.target.value)}
                  className="flex-1 h-2 bg-white/30 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <Input
                  type="number"
                  min="50"
                  max="300"
                  value={formData.datamatrixSize}
                  onChange={(e) => updateStoreInfo('datamatrixSize', e.target.value)}
                  className="w-20 backdrop-blur-xl bg-white/30 border border-white/40 text-gray-800 h-11 rounded-xl focus:bg-white/40 focus:border-white/60 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fiscalLogoSize" className="text-gray-700/90 font-medium text-xs">Fiscal Logo Size (px)</Label>
              <div className="flex items-center gap-3">
                <input
                  id="fiscalLogoSize"
                  type="range"
                  min="50"
                  max="384"
                  step="10"
                  value={formData.fiscalLogoSize}
                  onChange={(e) => updateStoreInfo('fiscalLogoSize', e.target.value)}
                  className="flex-1 h-2 bg-white/30 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <Input
                  type="number"
                  min="50"
                  max="384"
                  value={formData.fiscalLogoSize}
                  onChange={(e) => updateStoreInfo('fiscalLogoSize', e.target.value)}
                  className="w-20 backdrop-blur-xl bg-white/30 border border-white/40 text-gray-800 h-11 rounded-xl focus:bg-white/40 focus:border-white/60 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="headerFontSize" className="text-gray-700/90 font-medium text-xs">Header Font Size (px)</Label>
              <div className="flex items-center gap-3">
                <input
                  id="headerFontSize"
                  type="range"
                  min="10"
                  max="50"
                  step="1"
                  value={formData.headerFontSize}
                  onChange={(e) => updateStoreInfo('headerFontSize', e.target.value)}
                  className="flex-1 h-2 bg-white/30 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <Input
                  type="number"
                  min="10"
                  max="50"
                  value={formData.headerFontSize}
                  onChange={(e) => updateStoreInfo('headerFontSize', e.target.value)}
                  className="w-20 backdrop-blur-xl bg-white/30 border border-white/40 text-gray-800 h-11 rounded-xl focus:bg-white/40 focus:border-white/60 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="headerFontSpacing" className="text-gray-700/90 font-medium text-xs">Header Line Spacing (px)</Label>
              <div className="flex items-center gap-3">
                <input
                  id="headerFontSpacing"
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={formData.headerFontSpacing}
                  onChange={(e) => updateStoreInfo('headerFontSpacing', e.target.value)}
                  className="flex-1 h-2 bg-white/30 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <Input
                  type="number"
                  min="5"
                  max="50"
                  value={formData.headerFontSpacing}
                  onChange={(e) => updateStoreInfo('headerFontSpacing', e.target.value)}
                  className="w-20 backdrop-blur-xl bg-white/30 border border-white/40 text-gray-800 h-11 rounded-xl focus:bg-white/40 focus:border-white/60 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bodyFontSize" className="text-gray-700/90 font-medium text-xs">Body Font Size (px)</Label>
              <div className="flex items-center gap-3">
                <input
                  id="bodyFontSize"
                  type="range"
                  min="10"
                  max="50"
                  step="1"
                  value={formData.bodyFontSize}
                  onChange={(e) => updateStoreInfo('bodyFontSize', e.target.value)}
                  className="flex-1 h-2 bg-white/30 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <Input
                  type="number"
                  min="10"
                  max="50"
                  value={formData.bodyFontSize}
                  onChange={(e) => updateStoreInfo('bodyFontSize', e.target.value)}
                  className="w-20 backdrop-blur-xl bg-white/30 border border-white/40 text-gray-800 h-11 rounded-xl focus:bg-white/40 focus:border-white/60 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bodyFontSpacing" className="text-gray-700/90 font-medium text-xs">Body Line Spacing (px)</Label>
              <div className="flex items-center gap-3">
                <input
                  id="bodyFontSpacing"
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={formData.bodyFontSpacing}
                  onChange={(e) => updateStoreInfo('bodyFontSpacing', e.target.value)}
                  className="flex-1 h-2 bg-white/30 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <Input
                  type="number"
                  min="5"
                  max="50"
                  value={formData.bodyFontSpacing}
                  onChange={(e) => updateStoreInfo('bodyFontSpacing', e.target.value)}
                  className="w-20 backdrop-blur-xl bg-white/30 border border-white/40 text-gray-800 h-11 rounded-xl focus:bg-white/40 focus:border-white/60 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date" className="text-gray-700/90 font-medium text-xs">Date</Label>
              <Input
                id="date"
                type="text"
                value={formData.date}
                onChange={(e) => updateStoreInfo('date', e.target.value)}
                className="backdrop-blur-xl bg-white/30 border border-white/40 text-gray-800 placeholder:text-gray-500/60 h-11 rounded-xl focus:bg-white/40 focus:border-white/60 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time" className="text-gray-700/90 font-medium text-xs">Time</Label>
              <Input
                id="time"
                type="text"
                value={formData.time}
                onChange={(e) => updateStoreInfo('time', e.target.value)}
                placeholder="HH:MM:SS"
                className="backdrop-blur-xl bg-white/30 border border-white/40 text-gray-800 placeholder:text-gray-500/60 h-11 rounded-xl focus:bg-white/40 focus:border-white/60 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateTextFlag" className="text-gray-700/90 font-medium text-xs">Show &quot;ДАТУМ&quot; Label</Label>
              <div className="flex items-center h-11">
                <input
                  id="dateTextFlag"
                  type="checkbox"
                  checked={formData.dateTextFlag}
                  onChange={(e) => updateFormData({ dateTextFlag: e.target.checked })}
                  className="w-5 h-5 rounded border-white/40 bg-white/30 text-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Items */}
      <div className="backdrop-blur-lg bg-white/15 border border-white/25 shadow-lg rounded-3xl overflow-hidden hover:scale-[1.005] transition-transform duration-300">
        <div className="bg-white/10 p-8 border-b border-white/20">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-light text-slate-700">{t('items')}</h3>
            <Button onClick={addItem} size="sm" className="backdrop-blur-md bg-white/15 border border-white/25 text-slate-700 hover:bg-white/20 hover:border-white/30 h-10 px-6 transition-all duration-200">
              + {t('addItem')}
            </Button>
          </div>
        </div>
        <div className="p-8">
          <div className="space-y-6">
            {formData.items.map((item, index) => (
              <div key={index} className="backdrop-blur-md bg-white/10 border border-white/20 shadow-md rounded-2xl p-6 hover:scale-[1.005] transition-transform duration-300">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-lg font-light text-slate-700">{t('item')} {index + 1}</h4>
                  {formData.items.length > 1 && (
                    <Button
                      onClick={() => removeItem(index)}
                      variant="destructive"
                      size="sm"
                      className="backdrop-blur-md bg-red-500/15 border border-red-500/25 text-red-600 hover:bg-red-500/25 hover:border-red-500/35 h-9 transition-all duration-200"
                    >
                      {t('remove')}
                    </Button>
                  )}
                </div>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor={`itemName-${index}`} className="text-slate-600 font-light text-sm">{t('itemName')}</Label>
                    <textarea
                      id={`itemName-${index}`}
                      placeholder={t('itemName')}
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                      rows={3}
                      className="w-full backdrop-blur-md bg-white/10 border border-white/20 text-slate-700 placeholder:text-slate-500 px-3 py-2 rounded-md focus:bg-white/15 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 resize-y"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor={`quantity-${index}`} className="text-slate-600 font-light text-sm">{t('quantity')}</Label>
                      <Input
                        id={`quantity-${index}`}
                        type="number"
                        min="1"
                        value={item.quantity.toString()}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        className="backdrop-blur-md bg-white/10 border border-white/20 text-slate-700 h-12 focus:bg-white/15 focus:border-white/30 transition-all duration-200"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor={`unitPrice-${index}`} className="text-slate-600 font-light text-sm">{t('unitPrice')}</Label>
                      <Input
                        id={`unitPrice-${index}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.price.toString()}
                        onChange={(e) => updateItem(index, 'price', e.target.value)}
                        className="backdrop-blur-md bg-white/10 border border-white/20 text-slate-700 h-12 focus:bg-white/15 focus:border-white/30 transition-all duration-200"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor={`total-${index}`} className="text-slate-600 font-light text-sm">{t('totalIncVat')}</Label>
                      <Input
                        id={`total-${index}`}
                        type="number"
                        step="0.01"
                        value={(item.price * item.quantity).toFixed(2)}
                        readOnly
                        className="backdrop-blur-md bg-white/5 border border-white/15 text-slate-500 h-12"
                      />
                    </div>
                    <div className='grid grid-cols-2'>
                    <div className="space-y-3">
                      <Label htmlFor={`vatType-${index}`} className="text-slate-600 font-light text-sm">{t('vatType')}</Label>
                      <Select
                        value={item.vatType}
                        onValueChange={(value) => updateItem(index, 'vatType', value)}
                      >
                        <SelectTrigger className="backdrop-blur-md bg-white/10 border border-white/20 text-slate-700 h-12 focus:bg-white/15 focus:border-white/30 transition-all duration-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="backdrop-blur-lg bg-white/90 border border-white/30 shadow-xl">
                          <SelectItem value="A" className="text-slate-700 hover:bg-white/20">A (18%)</SelectItem>
                          <SelectItem value="B" className="text-slate-700 hover:bg-white/20">B (5%)</SelectItem>
                          <SelectItem value="V" className="text-slate-700 hover:bg-white/20">V (0%)</SelectItem>
                          <SelectItem value="G" className="text-slate-700 hover:bg-white/20">G (0%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor={`isDomestic-${index}`} className="text-slate-600 font-light text-sm">{t('domesticProduct')}</Label>
                      <div className="flex items-center h-12">
                        <input
                          id={`isDomestic-${index}`}
                          type="checkbox"
                          checked={item.isDomestic}
                          onChange={(e) => updateItem(index, 'isDomestic', e.target.checked)}
                          className="w-5 h-5 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0 cursor-pointer"
                        />
                      </div>
                    </div>

                    </div>
                    
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Totals Summary */}
      <div className="backdrop-blur-lg bg-white/15 border border-white/25 shadow-lg rounded-3xl overflow-hidden hover:scale-[1.005] transition-transform duration-300">
        <div className="bg-white/10 p-8 border-b border-white/20">
          <h3 className="text-xl font-light text-slate-700">Summary</h3>
        </div>
        <div className="p-8">
          <div className="backdrop-blur-md bg-white/10 border border-white/20 shadow-md rounded-2xl p-8">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-light">{t('vatTypeA')} {formData.vatTypeA}%:</span>
                    <span className="font-medium text-slate-700">${formData.vatTypeA.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-light">{t('vatTypeB')} {formData.vatTypeB}%:</span>
                    <span className="font-medium text-slate-700">${formData.vatTypeB.toFixed(2)}</span>
                  </div>
                
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-light">{t('vatTypeV')} {formData.vatTypeV}%:</span>
                    <span className="font-medium text-slate-700">${formData.vatTypeV.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-light">{t('vatTypeG')} {formData.vatTypeG}%:</span>
                    <span className="font-medium text-slate-700">${formData.vatTypeG.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-white/20 pt-6">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-light text-slate-700">{t('total')}:</span>
                  <span className="text-3xl font-light text-slate-800 tracking-tight">
                    ${formData.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}