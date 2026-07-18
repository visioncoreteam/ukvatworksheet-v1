import { useEffect } from 'react';

function AlertModal({ isOpen, type = 'info', title, message, onClose }) {
  useEffect(() => {
    if (isOpen) {
      const handler = (e) => e.key === 'Escape' && onClose();
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const styles = {
    success: { icon: '✅', border: 'border-green-500', title: 'text-green-400', btn: 'bg-green-600 hover:bg-green-700' },
    error:   { icon: '❌', border: 'border-red-500',   title: 'text-red-400',   btn: 'bg-red-600 hover:bg-red-700'   },
    warning: { icon: '⚠️', border: 'border-yellow-500',title: 'text-yellow-400',btn: 'bg-yellow-600 hover:bg-yellow-700'},
    info:    { icon: 'ℹ️', border: 'border-blue-500',  title: 'text-blue-400',  btn: 'bg-blue-600 hover:bg-blue-700'  },
  };

  const s = styles[type] || styles.info;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`bg-gray-800 border ${s.border} rounded-xl shadow-2xl w-full max-w-md mx-4 p-6`}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{s.icon}</span>
          <h2 className={`text-lg font-bold ${s.title}`}>{title}</h2>
        </div>
        <p className="text-gray-300 text-sm mb-6 leading-relaxed">{message}</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className={`px-5 py-2 rounded-lg text-white text-sm font-medium transition-colors ${s.btn}`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export default AlertModal;
