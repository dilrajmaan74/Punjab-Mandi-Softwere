import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type ToastType =
  | 'save-success'
  | 'update-success'
  | 'delete-success'
  | 'duplicate-warning'
  | 'error'
  | 'warning'
  | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  titleEn: string;
  titlePa: string;
  messageEn?: string;
  messagePa?: string;
  details?: string;
  duration?: number; // ms
  createdAt: number;
}

export interface ConfirmationItemDetail {
  labelEn: string;
  labelPa: string;
  value: string;
}

export interface ConfirmationOptions {
  titleEn: string;
  titlePa: string;
  messageEn: string;
  messagePa: string;
  itemDetails?: ConfirmationItemDetail[];
  confirmTextEn?: string;
  confirmTextPa?: string;
  cancelTextEn?: string;
  cancelTextPa?: string;
  type?: 'delete' | 'warning' | 'info';
  onConfirm: () => Promise<void> | void;
  onCancel?: () => void;
}

interface NotificationContextType {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id' | 'createdAt'>) => string;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;

  // Pre-configured bilingual notification helpers
  notifySaveSuccess: (options?: {
    titleEn?: string;
    titlePa?: string;
    messageEn?: string;
    messagePa?: string;
    details?: string;
    duration?: number;
  }) => string;

  notifyUpdateSuccess: (options?: {
    titleEn?: string;
    titlePa?: string;
    messageEn?: string;
    messagePa?: string;
    details?: string;
    duration?: number;
  }) => string;

  notifyDeleteSuccess: (options?: {
    titleEn?: string;
    titlePa?: string;
    messageEn?: string;
    messagePa?: string;
    details?: string;
    duration?: number;
  }) => string;

  notifyDuplicateWarning: (options?: {
    titleEn?: string;
    titlePa?: string;
    messageEn?: string;
    messagePa?: string;
    details?: string;
    duration?: number;
  }) => string;

  notifyError: (options?: {
    titleEn?: string;
    titlePa?: string;
    messageEn?: string;
    messagePa?: string;
    details?: string;
    duration?: number;
  }) => string;

  notifyWarning: (options?: {
    titleEn?: string;
    titlePa?: string;
    messageEn?: string;
    messagePa?: string;
    details?: string;
    duration?: number;
  }) => string;

  notifyInfo: (options: {
    titleEn: string;
    titlePa: string;
    messageEn?: string;
    messagePa?: string;
    details?: string;
    duration?: number;
  }) => string;

  // Confirmation Modal State & Triggers
  confirmationState: (ConfirmationOptions & { isOpen: boolean; isProcessing?: boolean }) | null;
  confirmAction: (options: ConfirmationOptions) => void;
  confirmDelete: (options: {
    recordNameEn: string;
    recordNamePa?: string;
    recordId?: string;
    itemDetails?: ConfirmationItemDetail[];
    onConfirm: () => Promise<void> | void;
  }) => void;
  closeConfirmation: () => void;
  proceedConfirmation: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmationState, setConfirmationState] = useState<
    (ConfirmationOptions & { isOpen: boolean; isProcessing?: boolean }) | null
  >(null);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastItem, 'id' | 'createdAt'>): string => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const duration = toast.duration ?? 4500; // 4.5 seconds default

      const newToast: ToastItem = {
        ...toast,
        id,
        duration,
        createdAt: Date.now()
      };

      setToasts((prev) => [newToast, ...prev.slice(0, 4)]); // max 5 simultaneous toasts

      return id;
    },
    []
  );

  // 1. New Entry Saved Successfully
  const notifySaveSuccess = useCallback(
    (options?: {
      titleEn?: string;
      titlePa?: string;
      messageEn?: string;
      messagePa?: string;
      details?: string;
      duration?: number;
    }) => {
      return showToast({
        type: 'save-success',
        titleEn: options?.titleEn || 'Entry Saved Successfully',
        titlePa: options?.titlePa || 'ਐਂਟਰੀ ਸਫਲਤਾਪੂਰਵਕ ਸੇਵ ਹੋ ਗਈ ਹੈ।',
        messageEn: options?.messageEn,
        messagePa: options?.messagePa,
        details: options?.details,
        duration: options?.duration ?? 4500
      });
    },
    [showToast]
  );

  // 2. Changes Updated Successfully
  const notifyUpdateSuccess = useCallback(
    (options?: {
      titleEn?: string;
      titlePa?: string;
      messageEn?: string;
      messagePa?: string;
      details?: string;
      duration?: number;
    }) => {
      return showToast({
        type: 'update-success',
        titleEn: options?.titleEn || 'Changes Updated Successfully',
        titlePa: options?.titlePa || 'ਤਬਦੀਲੀਆਂ ਸਫਲਤਾਪੂਰਵਕ ਅੱਪਡੇਟ ਹੋ ਗਈਆਂ ਹਨ।',
        messageEn: options?.messageEn,
        messagePa: options?.messagePa,
        details: options?.details,
        duration: options?.duration ?? 4500
      });
    },
    [showToast]
  );

  // 3. Record Deleted Successfully
  const notifyDeleteSuccess = useCallback(
    (options?: {
      titleEn?: string;
      titlePa?: string;
      messageEn?: string;
      messagePa?: string;
      details?: string;
      duration?: number;
    }) => {
      return showToast({
        type: 'delete-success',
        titleEn: options?.titleEn || 'Record Deleted Successfully',
        titlePa: options?.titlePa || 'ਰਿਕਾਰਡ ਸਫਲਤਾਪੂਰਵਕ ਮਿਟਾ ਦਿੱਤਾ ਗਿਆ ਹੈ।',
        messageEn: options?.messageEn,
        messagePa: options?.messagePa,
        details: options?.details,
        duration: options?.duration ?? 4500
      });
    },
    [showToast]
  );

  // 4. Duplicate Entry Warning
  const notifyDuplicateWarning = useCallback(
    (options?: {
      titleEn?: string;
      titlePa?: string;
      messageEn?: string;
      messagePa?: string;
      details?: string;
      duration?: number;
    }) => {
      return showToast({
        type: 'duplicate-warning',
        titleEn: options?.titleEn || 'Duplicate Entry Detected',
        titlePa: options?.titlePa || 'ਇਹ ਰਿਕਾਰਡ ਪਹਿਲਾਂ ਤੋਂ ਮੌਜੂਦ ਹੈ!',
        messageEn: options?.messageEn || 'A farmer with these details is already registered.',
        messagePa: options?.messagePa || 'ਇਸ ਵੇਰਵੇ ਨਾਲ ਕਿਸਾਨ ਪਹਿਲਾਂ ਹੀ ਰਜਿਸਟਰਡ ਹੈ।',
        details: options?.details,
        duration: options?.duration ?? 5500
      });
    },
    [showToast]
  );

  // 5. Error Notification
  const notifyError = useCallback(
    (options?: {
      titleEn?: string;
      titlePa?: string;
      messageEn?: string;
      messagePa?: string;
      details?: string;
      duration?: number;
    }) => {
      return showToast({
        type: 'error',
        titleEn: options?.titleEn || 'Operation Failed',
        titlePa: options?.titlePa || 'ਕਾਰਵਾਈ ਅਸਫਲ ਰਹੀ',
        messageEn: options?.messageEn || 'Please check the required fields and try again.',
        messagePa: options?.messagePa || 'ਕਿਰਪਾ ਕਰਕੇ ਸਾਰੇ ਲੋੜੀਂਦੇ ਖਾਨੇ ਚੈੱਕ ਕਰੋ ਅਤੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
        details: options?.details,
        duration: options?.duration ?? 5000
      });
    },
    [showToast]
  );

  // 6. Generic Warning
  const notifyWarning = useCallback(
    (options?: {
      titleEn?: string;
      titlePa?: string;
      messageEn?: string;
      messagePa?: string;
      details?: string;
      duration?: number;
    }) => {
      return showToast({
        type: 'warning',
        titleEn: options?.titleEn || 'Attention Required',
        titlePa: options?.titlePa || 'ਧਿਆਨ ਦਿਓ',
        messageEn: options?.messageEn,
        messagePa: options?.messagePa,
        details: options?.details,
        duration: options?.duration ?? 4500
      });
    },
    [showToast]
  );

  // 7. Info Notification
  const notifyInfo = useCallback(
    (options: {
      titleEn: string;
      titlePa: string;
      messageEn?: string;
      messagePa?: string;
      details?: string;
      duration?: number;
    }) => {
      return showToast({
        type: 'info',
        titleEn: options.titleEn,
        titlePa: options.titlePa,
        messageEn: options.messageEn,
        messagePa: options.messagePa,
        details: options.details,
        duration: options.duration ?? 4000
      });
    },
    [showToast]
  );

  // Confirmation actions
  const confirmAction = useCallback((options: ConfirmationOptions) => {
    setConfirmationState({
      ...options,
      isOpen: true,
      isProcessing: false
    });
  }, []);

  const confirmDelete = useCallback(
    (options: {
      recordNameEn: string;
      recordNamePa?: string;
      recordId?: string;
      itemDetails?: ConfirmationItemDetail[];
      onConfirm: () => Promise<void> | void;
    }) => {
      const details: ConfirmationItemDetail[] = options.itemDetails || [];
      if (options.recordId && !details.some((d) => d.labelEn === 'ID')) {
        details.unshift({
          labelEn: 'ID',
          labelPa: 'ਆਈ.ਡੀ',
          value: options.recordId
        });
      }

      setConfirmationState({
        isOpen: true,
        type: 'delete',
        titleEn: 'Confirm Deletion',
        titlePa: 'ਮਿਟਾਉਣ ਦੀ ਪੁਸ਼ਟੀ ਕਰੋ',
        messageEn: `Are you sure you want to delete "${options.recordNameEn}"? This action cannot be undone.`,
        messagePa: `ਕੀ ਤੁਸੀਂ ਵਾਕਈ "${options.recordNamePa || options.recordNameEn}" ਦਾ ਰਿਕਾਰਡ ਮਿਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ? ਇਹ ਕਾਰਵਾਈ ਵਾਪਸ ਨਹੀਂ ਹੋ ਸਕਦੀ।`,
        itemDetails: details,
        confirmTextEn: 'Delete Record',
        confirmTextPa: 'ਹਾਂ, ਰਿਕਾਰਡ ਮਿਟਾਓ',
        cancelTextEn: 'Cancel',
        cancelTextPa: 'ਰੱਦ ਕਰੋ',
        onConfirm: options.onConfirm
      });
    },
    []
  );

  const closeConfirmation = useCallback(() => {
    if (confirmationState?.onCancel) {
      confirmationState.onCancel();
    }
    setConfirmationState(null);
  }, [confirmationState]);

  const proceedConfirmation = useCallback(async () => {
    if (!confirmationState) return;
    try {
      setConfirmationState((prev) => (prev ? { ...prev, isProcessing: true } : null));
      await confirmationState.onConfirm();
      setConfirmationState(null);
    } catch (err) {
      console.error('Error during confirmation action:', err);
      setConfirmationState((prev) => (prev ? { ...prev, isProcessing: false } : null));
    }
  }, [confirmationState]);

  return (
    <NotificationContext.Provider
      value={{
        toasts,
        showToast,
        dismissToast,
        clearAllToasts,
        notifySaveSuccess,
        notifyUpdateSuccess,
        notifyDeleteSuccess,
        notifyDuplicateWarning,
        notifyError,
        notifyWarning,
        notifyInfo,
        confirmationState,
        confirmAction,
        confirmDelete,
        closeConfirmation,
        proceedConfirmation
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
