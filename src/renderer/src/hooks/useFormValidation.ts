import { useState, useCallback } from 'react';

export interface ValidationRule<T> {
    validate: (value: T) => boolean;
    message: string;
}

export interface FieldConfig<T> {
    initialValue: T;
    rules?: ValidationRule<T>[];
    required?: boolean;
    requiredMessage?: string;
}

export interface FieldState<T> {
    value: T;
    error: string | null;
    touched: boolean;
}

export interface UseFormValidationReturn<T extends Record<string, unknown>> {
    values: T;
    errors: Record<keyof T, string | null>;
    touched: Record<keyof T, boolean>;
    isValid: boolean;
    isDirty: boolean;
    setValue: <K extends keyof T>(field: K, value: T[K]) => void;
    setTouched: (field: keyof T) => void;
    validate: () => boolean;
    validateField: (field: keyof T) => string | null;
    reset: () => void;
    getFieldProps: (field: keyof T) => {
        value: T[keyof T];
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
        onBlur: () => void;
    };
}

/**
 * useFormValidation - Comprehensive form validation hook
 * 
 * @example
 * const form = useFormValidation({
 *   email: { initialValue: '', required: true, rules: [{ validate: v => v.includes('@'), message: 'Invalid email' }] },
 *   name: { initialValue: '', required: true }
 * });
 */
export function useFormValidation<T extends Record<string, unknown>>(
    config: { [K in keyof T]: FieldConfig<T[K]> }
): UseFormValidationReturn<T> {
    // Initialize state from config
    const getInitialValues = (): T => {
        const values = {} as T;
        for (const key in config) {
            values[key] = config[key].initialValue;
        }
        return values;
    };

    const getInitialErrors = (): Record<keyof T, string | null> => {
        const errors = {} as Record<keyof T, string | null>;
        for (const key in config) {
            errors[key] = null;
        }
        return errors;
    };

    const getInitialTouched = (): Record<keyof T, boolean> => {
        const touched = {} as Record<keyof T, boolean>;
        for (const key in config) {
            touched[key] = false;
        }
        return touched;
    };

    const [values, setValues] = useState<T>(getInitialValues);
    const [errors, setErrors] = useState<Record<keyof T, string | null>>(getInitialErrors);
    const [touched, setTouchedState] = useState<Record<keyof T, boolean>>(getInitialTouched);
    const [initialValues] = useState<T>(getInitialValues);

    const validateField = useCallback((field: keyof T): string | null => {
        const fieldConfig = config[field];
        const value = values[field];

        // Check required
        if (fieldConfig.required) {
            const isEmpty = value === '' || value === null || value === undefined;
            if (isEmpty) {
                return fieldConfig.requiredMessage || 'This field is required';
            }
        }

        // Check custom rules
        if (fieldConfig.rules) {
            for (const rule of fieldConfig.rules) {
                if (!rule.validate(value)) {
                    return rule.message;
                }
            }
        }

        return null;
    }, [config, values]);

    const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
        setValues(prev => ({ ...prev, [field]: value }));
        // Clear error when user types
        setErrors(prev => ({ ...prev, [field]: null }));
    }, []);

    const setTouched = useCallback((field: keyof T) => {
        setTouchedState(prev => ({ ...prev, [field]: true }));
        // Validate on blur
        const error = validateField(field);
        setErrors(prev => ({ ...prev, [field]: error }));
    }, [validateField]);

    const validate = useCallback((): boolean => {
        const newErrors = {} as Record<keyof T, string | null>;
        let isValid = true;

        for (const field in config) {
            const error = validateField(field);
            newErrors[field] = error;
            if (error) isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    }, [config, validateField]);

    const reset = useCallback(() => {
        setValues(getInitialValues());
        setErrors(getInitialErrors());
        setTouchedState(getInitialTouched());
    }, []);

    const getFieldProps = useCallback((field: keyof T) => ({
        value: values[field],
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
            setValue(field, e.target.value as T[keyof T]);
        },
        onBlur: () => setTouched(field)
    }), [values, setValue, setTouched]);

    const isValid = Object.values(errors).every(e => e === null);
    const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);

    return {
        values,
        errors,
        touched,
        isValid,
        isDirty,
        setValue,
        setTouched,
        validate,
        validateField,
        reset,
        getFieldProps
    };
}
