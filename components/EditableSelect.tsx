import React, { useState, useRef, useEffect } from 'react';

interface EditableSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}

const EditableSelect: React.FC<EditableSelectProps> = ({ value, onChange, options, placeholder, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative">
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} onFocus={() => setIsOpen(true)} placeholder={placeholder} className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:ring-2 focus:ring-indigo-200 outline-none pr-8 transition-shadow" />
        <button type="button" onClick={() => setIsOpen(!isOpen)} className="absolute right-0 top-0 h-full px-2 text-gray-400 hover:text-indigo-600 transition-colors">
          <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
        </button>
      </div>
      {isOpen && (
        <div className="absolute z-[300] left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map((opt) => (
            <button key={opt} type="button" onClick={() => { onChange(opt); setIsOpen(false); }} className={`w-full text-left px-3 py-2 text-sm transition-colors ${value === opt ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-gray-50 text-gray-700'}`}>{opt}</button>
          ))}
        </div>
      )}
    </div>
  );
};

export default EditableSelect;