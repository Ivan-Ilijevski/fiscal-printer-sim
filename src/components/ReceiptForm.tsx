'use client';

import { useState } from 'react';

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface ReceiptData {
  receiptType: string;
  storeName: string;
  address: string;
  taxNumber: string;
  vatNumber: string;
  items: ReceiptItem[];
  vatTypeA: number;
  vatTypeB: number;
  vatTypeV: number;
  vatTypeG: number;
  total: number;
  paymentMethod: string;
  receiptNumber: string;
  date: string;
}

interface ReceiptFormProps {
  initialData: ReceiptData;
  onDataChange: (data: ReceiptData) => void;
}

export default function ReceiptForm({ initialData, onDataChange }: ReceiptFormProps) {
  const [formData, setFormData] = useState(initialData);

  const updateFormData = (updates: Partial<ReceiptData>) => {
    const newData = { ...formData, ...updates };
    setFormData(newData);
    onDataChange(newData);
  };

  const updateStoreInfo = (field: string, value: string) => {
    updateFormData({ [field]: value });
  };

  const updateItem = (index: number, field: keyof ReceiptItem, value: string | number) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index] };
    
    if (field === 'name') {
      item.name = value as string;
    } else if (field === 'quantity') {
      item.quantity = Number(value);
      item.total = item.quantity * item.price;
    } else if (field === 'price') {
      item.price = Number(value);
      item.total = item.quantity * item.price;
    }
    
    newItems[index] = item;
    
    const totalAmount = newItems.reduce((sum, item) => sum + item.total, 0);
    const vatTypeA = totalAmount - (totalAmount / 1.18);
    
    updateFormData({
      items: newItems,
      vatTypeA: Number(vatTypeA.toFixed(2)),
      total: Number(totalAmount.toFixed(2))
    });
  };

  const addItem = () => {
    const newItem: ReceiptItem = {
      name: 'New Item',
      quantity: 1,
      price: 0.00,
      total: 0.00
    };
    
    const newItems = [...formData.items, newItem];
    const totalAmount = newItems.reduce((sum, item) => sum + item.total, 0);
    const vatTypeA = totalAmount - (totalAmount / 1.18);
    
    updateFormData({
      items: newItems,
      vatTypeA: Number(vatTypeA.toFixed(2)),
      total: Number(totalAmount.toFixed(2))
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    const totalAmount = newItems.reduce((sum, item) => sum + item.total, 0);
    const vatTypeA = totalAmount - (totalAmount / 1.18);
    
    updateFormData({
      items: newItems,
      vatTypeA: Number(vatTypeA.toFixed(2)),
      total: Number(totalAmount.toFixed(2))
    });
  };

  return (
    <div className="w-full max-w-md space-y-6 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold text-gray-800">Customize Receipt</h2>
      
      {/* Store Information */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-700">Store Information</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Store Name</label>
          <input
            type="text"
            value={formData.storeName}
            onChange={(e) => updateStoreInfo('storeName', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => updateStoreInfo('address', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Tax Number</label>
          <input
            type="text"
            value={formData.taxNumber}
            onChange={(e) => updateStoreInfo('taxNumber', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">VAT Number</label>
          <input
            type="text"
            value={formData.vatNumber}
            onChange={(e) => updateStoreInfo('vatNumber', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Receipt Number</label>
          <input
            type="text"
            value={formData.receiptNumber}
            onChange={(e) => updateStoreInfo('receiptNumber', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Payment Method</label>
          <select
            value={formData.paymentMethod}
            onChange={(e) => updateStoreInfo('paymentMethod', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="НА КРЕДИТ">Credit Card</option>
            <option value="ВО ГОТОВО">Cash</option>
            <option value="Debit Card">Debit Card</option>
            <option value="Mobile Payment">Mobile Payment</option>
          </select>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-gray-700">Items</h3>
          <button
            onClick={addItem}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
          >
            Add Item
          </button>
        </div>
        
        {formData.items.map((item, index) => (
          <div key={index} className="p-3 border border-gray-200 rounded space-y-2">
            <div className="flex justify-between items-start">
              <span className="font-medium text-sm text-gray-600">Item {index + 1}</span>
              {formData.items.length > 1 && (
                <button
                  onClick={() => removeItem(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              )}
            </div>
            
            <input
              type="text"
              placeholder="Item name"
              value={item.name}
              onChange={(e) => updateItem(index, 'name', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Price</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.price}
                  onChange={(e) => updateItem(index, 'price', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="text-right text-sm text-gray-600">
              Total: ${item.total.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {/* Totals Summary */}
      <div className="bg-gray-50 p-4 rounded space-y-2">
        <div className="flex justify-between text-sm">
          <span>VAT Type A (18%):</span>
          <span>${formData.vatTypeA.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>VAT Type B (5%):</span>
          <span>${formData.vatTypeB.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>VAT Type V (0%):</span>
          <span>${formData.vatTypeV.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>VAT Type G (0%):</span>
          <span>${formData.vatTypeG.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Total:</span>
          <span>${formData.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}