
import React from 'react';
import { SavedOrder, OrderItem } from '../types';

interface ReceiptProps {
  order: SavedOrder | null;
}

const Receipt: React.FC<ReceiptProps> = ({ order }) => {
  if (!order) return null;

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString('uz-UZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  type GroupedData = { items: OrderItem[]; area: number; price: number };

  const grouped = order.items.reduce((acc, item) => {
    const key = item.glassType.name;
    if (!acc[key]) acc[key] = { items: [], area: 0, price: 0 };
    acc[key].items.push(item);
    acc[key].area += item.areaM2;
    acc[key].price += item.totalPrice;
    return acc;
  }, {} as Record<string, GroupedData>);

  const baseArea = order.items.reduce((a, b) => a + b.areaM2, 0);
  const wasteArea = baseArea * (order.wastePercent / 100);

  return (
    <div id="receipt-to-print" className="print-only text-black font-mono leading-none">
      <div className="flex justify-between border-b border-black pb-1 mb-2 text-sm font-black uppercase">
        <span>MIJOZ: {order.customerName || '-'}</span>
        <span className="text-[10px]">Sana: {formatDate(order.timestamp)}</span>
      </div>

      <div className="w-full text-[10px] mb-1 flex font-black border-b border-black pb-0.5 bg-gray-100 px-1 uppercase">
        <span className="w-[35%]">O'lcham (shuk)</span>
        <span className="w-[25%] border-x border-black text-center">Izoh</span>
        <span className="w-[15%] border-r border-black text-center">Yuza</span>
        <span className="w-[25%] text-right">Narxi</span>
      </div>

      {(Object.entries(grouped) as [string, GroupedData][]).map(([name, data]) => (
        <div key={name} className="mb-2">
          <h2 className="text-[10px] font-black mb-1 uppercase px-1 bg-gray-200">{name}</h2>
          <div className="space-y-0.5">
            {data.items.map((it, idx) => (
              <div key={idx} className="flex items-center text-[10px] font-bold border-b border-gray-300 border-dashed pb-0.5">
                <span className="w-[35%] font-black">{it.width}×{it.height} = {it.quantity}</span>
                <span className="w-[25%] border-x border-gray-400 h-4 bg-transparent"></span>
                <span className="w-[15%] border-r border-gray-400 text-center">{it.areaM2.toFixed(3)}</span>
                <span className="w-[25%] text-right font-black">{Math.round(it.totalPrice).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="border-t-2 border-black pt-2 mt-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-0.5">
            <div className="flex justify-between text-[9px] font-bold">
              <span>Sof: {baseArea.toFixed(3)} m²</span>
            </div>
            <div className="flex justify-between text-[11px] font-black border-t border-black pt-0.5">
              <span>JAMI: {order.totalArea.toFixed(3)} m²</span>
            </div>
          </div>
          
          <div className="text-right flex flex-col justify-center">
            <div className="text-[22px] font-black tracking-tighter tabular-nums leading-none">
              {Math.round(order.totalAmount).toLocaleString()}
            </div>
            <div className="text-[10px] font-black uppercase">SO'M</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Receipt;
