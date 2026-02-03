
import React from 'react';
import { Delete, ArrowRight } from 'lucide-react';

interface KeypadProps {
  onKeyPress: (key: string) => void;
  onClear: () => void;
  onDelete: () => void;
  onNext: () => void;
}

const Keypad: React.FC<KeypadProps> = ({ onKeyPress, onClear, onDelete, onNext }) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.'];

  return (
    <div className="grid grid-cols-3 gap-2 bg-white p-4 rounded-3xl shadow-xl border border-slate-200">
      {keys.map((key) => (
        <button
          key={key}
          onClick={() => onKeyPress(key)}
          className="h-14 flex items-center justify-center text-2xl font-black bg-slate-50 hover:bg-slate-100 active:bg-slate-200 rounded-2xl transition-all border border-slate-100"
        >
          {key}
        </button>
      ))}
      <button
        onClick={onDelete}
        className="h-14 flex items-center justify-center bg-orange-50 hover:bg-orange-100 active:bg-orange-200 text-orange-600 rounded-2xl border border-orange-100"
      >
        <Delete className="w-7 h-7" />
      </button>
      
      <button
        onClick={onClear}
        className="h-14 flex items-center justify-center font-bold bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 rounded-2xl border border-red-100"
      >
        TOZALASH
      </button>
      
      <button
        onClick={onNext}
        className="col-span-2 h-14 flex items-center justify-center font-black text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-2xl gap-2 shadow-lg shadow-indigo-100 transition-all"
      >
        KEYINGI <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Keypad;
