import { useState, useEffect, useCallback } from 'react';

export interface FormDraftOptions<T> {
  formKey: string;
  initialValues: T;
}

/**
 * Universal Auto-Save Draft Hook
 * Automatically persists form data to localStorage on every change.
 * Preserves data across back navigation, route changes, refresh, or accidental closing.
 * Clears draft only when explicitly instructed (i.e. on successful save).
 */
export function useFormDraft<T>(
  draftKeyOrOptions: string | FormDraftOptions<T>,
  maybeInitialData?: T
) {
  const draftKey = typeof draftKeyOrOptions === 'string' ? draftKeyOrOptions : draftKeyOrOptions.formKey;
  const initialData = typeof draftKeyOrOptions === 'string' ? (maybeInitialData as T) : draftKeyOrOptions.initialValues;

  const [data, setData] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...initialData, ...parsed };
      }
    } catch (e) {
      console.warn(`Failed to read draft for ${draftKey}:`, e);
    }
    return initialData;
  });

  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem(draftKey);
    } catch {
      return false;
    }
  });

  // Save to localStorage whenever data changes
  useEffect(() => {
    try {
      if (data !== undefined && data !== null) {
        localStorage.setItem(draftKey, JSON.stringify(data));
        setHasDraft(true);
      }
    } catch (e) {
      console.warn(`Failed to auto-save draft for ${draftKey}:`, e);
    }
  }, [draftKey, data]);

  // Clear draft from localStorage (to be called only after successful save)
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
      setHasDraft(false);
    } catch (e) {
      console.warn(`Failed to clear draft for ${draftKey}:`, e);
    }
  }, [draftKey]);

  // Reset to initialData and remove draft
  const resetForm = useCallback(() => {
    clearDraft();
    setData(initialData);
  }, [clearDraft, initialData]);

  return {
    data,
    draft: data,
    setData,
    saveDraft: setData,
    hasDraft,
    clearDraft,
    resetForm
  };
}
