import React from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ title, onClose, children, footer }) => (
  <div
    className="fixed inset-0 bg-[#1a1209]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    onClick={(e) => e.target === e.currentTarget && onClose()}
  >
    <div className="bg-[#f5f0e8] rounded-lg border border-[#cfc4aa] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2d9c4]">
        <h2 style={{fontFamily:'Playfair Display, serif'}} className="text-xl font-bold text-[#1a1209]">{title}</h2>
        <button onClick={onClose} className="text-[#7a6a52] hover:text-[#1a1209] hover:bg-[#e2d9c4] rounded px-2 py-1 transition-colors text-lg">✕</button>
      </div>
      <div className="px-6 py-5">{children}</div>
      {footer && <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#e2d9c4]">{footer}</div>}
    </div>
  </div>
);

export default Modal;