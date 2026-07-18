import { useState, useCallback } from 'react';

export function useAlert() {
  const [alert, setAlert] = useState({ isOpen: false, type: 'info', title: '', message: '' });

  const showAlert = useCallback((type, title, message) => {
    setAlert({ isOpen: true, type, title, message });
  }, []);

  const closeAlert = useCallback(() => {
    setAlert(prev => ({ ...prev, isOpen: false }));
  }, []);

  return { alert, showAlert, closeAlert };
}
