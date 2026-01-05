/**
 * BackupPanel Component
 * 
 * Displays list of backups with restore and delete functionality
 */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Clock, Trash2, RotateCcw, Loader2, HardDrive } from 'lucide-react';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import type { BackupInfo } from '../../../../shared/types';

export function BackupPanel() {
    const { t } = useTranslation();
    const [backups, setBackups] = useState<BackupInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRestoring, setIsRestoring] = useState(false);
    const [backupToDelete, setBackupToDelete] = useState<string | null>(null);
    const [backupToRestore, setBackupToRestore] = useState<string | null>(null);

    const loadBackups = async () => {
        setIsLoading(true);
        try {
            const list = await window.api.listBackups();
            setBackups(list);
        } catch (error) {
            console.error('Failed to load backups:', error);
            toast.error(t('backups.loadError', 'Failed to load backups'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadBackups();
    }, []);

    const handleRestore = async (backupId: string) => {
        setIsRestoring(true);
        try {
            await window.api.restoreBackup(backupId);
            toast.success(t('backups.restoreSuccess', 'Backup restored successfully'));

            // Reload page to reflect restored data
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            console.error('Failed to restore backup:', error);
            toast.error(t('backups.restoreError', 'Failed to restore backup'));
        } finally {
            setIsRestoring(false);
            setBackupToRestore(null);
        }
    };

    const handleDelete = async (backupId: string) => {
        try {
            await window.api.deleteBackup(backupId);
            toast.success(t('backups.deleteSuccess', 'Backup deleted'));
            await loadBackups();
        } catch (error) {
            console.error('Failed to delete backup:', error);
            toast.error(t('backups.deleteError', 'Failed to delete backup'));
        } finally {
            setBackupToDelete(null);
        }
    };

    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-foreground-muted" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">
                        {t('backups.title', 'Backups')}
                    </h3>
                    <p className="text-sm text-foreground-muted mt-1">
                        {t('backups.description', 'Automatic backups every 30 minutes. Last 10 backups are kept.')}
                    </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground-muted">
                    <HardDrive className="w-4 h-4" />
                    <span>{backups.length} / 10</span>
                </div>
            </div>

            {/* Backups List */}
            {backups.length === 0 ? (
                <div className="text-center py-12 border border-border rounded-lg bg-background-subtle">
                    <HardDrive className="w-12 h-12 mx-auto text-foreground-muted mb-3" />
                    <p className="text-foreground-muted">
                        {t('backups.noBackups', 'No backups yet')}
                    </p>
                    <p className="text-sm text-foreground-subtle mt-1">
                        {t('backups.noBackupsHint', 'Backups are created automatically when you save data')}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {backups.map((backup) => (
                        <div
                            key={backup.id}
                            className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-background-subtle transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-foreground-muted" />
                                <div>
                                    <p className="text-sm font-medium text-foreground">
                                        {formatDate(backup.timestamp)}
                                    </p>
                                    <p className="text-xs text-foreground-muted">
                                        {formatSize(backup.size)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setBackupToRestore(backup.id)}
                                    disabled={isRestoring}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    {t('backups.restore', 'Restore')}
                                </button>

                                <button
                                    onClick={() => setBackupToDelete(backup.id)}
                                    disabled={isRestoring}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    {t('common.delete', 'Delete')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Restore Confirmation Modal */}
            <ConfirmationModal
                isOpen={backupToRestore !== null}
                onClose={() => setBackupToRestore(null)}
                onConfirm={() => backupToRestore && handleRestore(backupToRestore)}
                title={t('backups.restoreConfirmTitle', 'Restore Backup?')}
                description={t(
                    'backups.restoreConfirmDescription',
                    'This will replace all current data with the backup. Current data will be backed up first. This action cannot be undone.'
                )}
                confirmText={t('backups.restore', 'Restore')}
                variant="danger"
            />

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={backupToDelete !== null}
                onClose={() => setBackupToDelete(null)}
                onConfirm={() => backupToDelete && handleDelete(backupToDelete)}
                title={t('backups.deleteConfirmTitle', 'Delete Backup?')}
                description={t(
                    'backups.deleteConfirmDescription',
                    'This backup will be permanently deleted. This action cannot be undone.'
                )}
                confirmText={t('common.delete', 'Delete')}
                variant="danger"
            />
        </div>
    );
}
