import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { AlertCircle, HelpCircle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'default';
    isLoading?: boolean;
}

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText,
    cancelText,
    variant = 'default',
    isLoading = false
}: ConfirmationModalProps) {
    const { t } = useTranslation();

    const handleConfirm = () => {
        onConfirm();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="">
            <div className="flex flex-col items-center text-center p-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${variant === 'danger' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                    {variant === 'danger' ? <AlertCircle size={24} /> : <HelpCircle size={24} />}
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-foreground-muted mb-6 text-sm max-w-sm">
                    {description}
                </p>

                <div className="flex gap-3 w-full">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground bg-background hover:bg-background-muted transition-colors disabled:opacity-50"
                    >
                        {cancelText || t('common.cancel')}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors shadow-sm disabled:opacity-50 ${variant === 'danger'
                                ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
                                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                            }`}
                    >
                        {isLoading ? '...' : (confirmText || t('common.confirm'))}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
