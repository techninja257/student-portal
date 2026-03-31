import { useEffect } from 'react';

export default function Modal({ title, onClose, children }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 sm:mx-0 p-8 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-headline font-bold text-lg text-on-surface">{title}</h3>
          <button
            onClick={onClose}
            className="text-outline hover:text-on-surface text-xl leading-none transition"
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
