import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, RefreshCw, X } from 'lucide-react';

interface SnapshotConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (shouldRefresh: boolean, rememberChoice: boolean) => void;
}

export function SnapshotConfirmationModal({ isOpen, onClose, onConfirm }: SnapshotConfirmationModalProps) {
    const { t } = useTranslation();
    const [rememberChoice, setRememberChoice] = useState(false);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-background-card border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-background-subtle/50">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-full">
                            <Camera className="w-5 h-5 text-primary" />
                        </div>
                        <h2 className="text-lg font-semibold text-text-primary">
                            {t('dashboard.snapshotConfirmation.title')}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-background-hover rounded-full transition-colors text-text-secondary"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    <p className="text-text-secondary">
                        {t('dashboard.snapshotConfirmation.description')}
                    </p>

                    <div className="flex items-center gap-3 p-3 bg-background-subtle rounded-lg border border-border/50">
                        <input
                            type="checkbox"
                            id="rememberChoice"
                            checked={rememberChoice}
                            onChange={(e) => setRememberChoice(e.target.checked)}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 bg-background-input"
                        />
                        <label htmlFor="rememberChoice" className="text-sm text-text-secondary cursor-pointer select-none">
                            {t('dashboard.snapshotConfirmation.rememberChoice')}
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex flex-col sm:flex-row gap-3 p-4 bg-background-subtle/30 border-t border-border">
                    <button
                        onClick={() => onConfirm(false, rememberChoice)}
                        className="flex-1 px-4 py-2 text-sm font-medium text-text-primary bg-background-element hover:bg-background-hover border border-border rounded-lg transition-colors"
                    >
                        {t('dashboard.snapshotConfirmation.snapshotOnly')}
                    </button>
                    <button
                        onClick={() => onConfirm(true, rememberChoice)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all hover:shadow-md"
                    >
                        <RefreshCw className="w-4 h-4" />
                        {t('dashboard.snapshotConfirmation.updateAndSnapshot')}
                    </button>
                </div>
            </div>
        </div>
    );
}
