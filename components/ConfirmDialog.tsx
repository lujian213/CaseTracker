import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  isDestructive?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "确认", isDestructive = false }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[500] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs overflow-hidden border border-gray-100">
        <div className="p-5"><h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3><p className="text-gray-600 text-sm leading-relaxed">{message}</p></div>
        <div className="flex justify-end gap-2 p-4 bg-gray-50 border-t border-gray-100">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-200 rounded-lg transition-colors">取消</button>
          <button onClick={() => { onConfirm(); onCancel(); }} className={`px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm ${isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;