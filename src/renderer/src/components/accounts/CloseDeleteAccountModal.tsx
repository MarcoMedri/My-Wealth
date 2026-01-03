
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Archive, Trash2 } from 'lucide-react';
import Modal from '../Modal';

interface CloseDeleteAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCloseAccount: () => void;
    onDeleteAccount: () => void;
    accountName: string;
    hasTransactions: boolean;
}

export const CloseDeleteAccountModal = ({
    isOpen,
    onClose,
    onCloseAccount,
    onDeleteAccount,
    accountName,
    hasTransactions
}: CloseDeleteAccountModalProps) => {
    const { t } = useTranslation();

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('accounts.manageAccount', 'Gestisci Conto')}>
            <div className="space-y-6">
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-medium text-amber-500 mb-1">
                            {t('accounts.attention', 'Attenzione')}
                        </h4>
                        <p className="text-sm text-foreground-muted leading-relaxed">
                            {t('accounts.deleteWarning', 'Stai per rimuovere il conto "{{name}}". Scegli come procedere:', { name: accountName })}
                        </p>
                    </div>
                </div>

                <div className="grid gap-4">
                    {/* Option 1: Close/Archive */}
                    <button
                        onClick={onCloseAccount}
                        className="flex items-start gap-4 p-4 rounded-xl border border-border bg-background-card hover:bg-background-subtle hover:border-primary/50 transition-all text-left"
                    >
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
                            <Archive size={20} />
                        </div>
                        <div>
                            <h3 className="font-medium text-foreground mb-1">
                                {t('accounts.closeAccount', 'Chiudi Conto')}
                            </h3>
                            <p className="text-sm text-foreground-muted">
                                {t('accounts.closeAccountDesc', 'Il conto verrà archiviato. Lo storico delle transazioni verrà mantenuto e incluso nel calcolo del patrimonio, ma il conto non sarà più attivo.')}
                            </p>
                        </div>
                    </button>

                    {/* Option 2: Delete */}
                    <button
                        onClick={onDeleteAccount}
                        className="flex items-start gap-4 p-4 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/40 transition-all text-left group"
                    >
                        <div className="p-2 rounded-lg bg-red-500/10 text-red-500 shrink-0 group-hover:bg-red-500/20">
                            <Trash2 size={20} />
                        </div>
                        <div>
                            <h3 className="font-medium text-foreground mb-1 group-hover:text-red-500">
                                {t('accounts.deleteAccount', 'Elimina Conto')}
                            </h3>
                            <p className="text-sm text-foreground-muted">
                                {hasTransactions
                                    ? t('accounts.deleteAccountWarning', 'ATTENZIONE: Verranno eliminate permanentemente tutte le transazioni associate. Lo storico andrà perso per sempre.')
                                    : t('accounts.deleteAccountDesc', 'Il conto verrà eliminato definitivamente.')}
                            </p>
                        </div>
                    </button>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-foreground-muted hover:text-foreground transition-colors"
                    >
                        {t('common.cancel', 'Annulla')}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
