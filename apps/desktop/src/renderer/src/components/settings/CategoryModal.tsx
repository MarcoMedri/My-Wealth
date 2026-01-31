import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useVaultStore } from '../../store/useVaultStore';
import Modal from '../Modal';
import { IconPicker, ICON_MAP } from './IconPicker';
import type { Category, CategoryType } from '../../@my-wealth/shared/schemas';
import { cn } from '../../lib/utils';
import { Loader2, Tag } from 'lucide-react';

interface CategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    category?: Category | null;
}

const COLORS = [
    '#6366f1', // Indigo
    '#3b82f6', // Blue
    '#06b6d4', // Cyan
    '#14b8a6', // Teal
    '#10b981', // Emerald
    '#84cc16', // Lime
    '#eab308', // Yellow
    '#f97316', // Orange
    '#ef4444', // Red
    '#ec4899', // Pink
    '#d946ef', // Fuchsia
    '#8b5cf6', // Violet
    '#64748b', // Slate
    '#000000', // Black
];

export function CategoryModal({ isOpen, onClose, category }: CategoryModalProps) {
    const { t } = useTranslation();
    const { addCategory, updateCategory } = useVaultStore();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        type: 'expense' as CategoryType,
        icon: 'tag',
        color: '#6366f1'
    });

    useEffect(() => {
        if (category) {
            setFormData({
                name: category.name,
                type: category.type,
                icon: category.icon,
                color: category.color
            });
        } else {
            setFormData({
                name: '',
                type: 'expense',
                icon: 'tag',
                color: '#6366f1'
            });
        }
    }, [category, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const cat = await window.api.saveCategory({
                id: category?.id,
                name: formData.name,
                type: formData.type,
                icon: formData.icon,
                color: formData.color,
                parentId: null,
                sortOrder: category?.sortOrder ?? 0
            });

            if (category) {
                updateCategory(cat);
            } else {
                addCategory(cat);
            }
            onClose();
        } catch (err) {
            setError('Failed to save category');
        } finally {
            setIsLoading(false);
        }
    };

    const SelectedIcon = ICON_MAP[formData.icon as keyof typeof ICON_MAP] || Tag;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={category ? t('settings.editCategory') : t('settings.addCategory')}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
                        {error}
                    </div>
                )}

                {/* Type Selection */}
                <div className="flex p-1 bg-background-subtle rounded-lg border border-border">
                    {(['income', 'expense'] as const).map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setFormData({ ...formData, type })}
                            className={cn(
                                "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors capitalize",
                                formData.type === type
                                    ? "bg-background-muted text-foreground shadow"
                                    : "text-foreground-muted hover:text-foreground"
                            )}
                        >
                            {t(`common.${type}`)}
                        </button>
                    ))}
                </div>

                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-1">
                        {t('common.name')}
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SelectedIcon className="h-5 w-5" style={{ color: formData.color }} />
                        </div>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full pl-10 pr-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. Groceries"
                        />
                    </div>
                </div>

                {/* Color Picker */}
                <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-2">
                        {t('settings.color')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {COLORS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setFormData({ ...formData, color: c })}
                                className={cn(
                                    "w-8 h-8 rounded-full border-2 transition-all",
                                    formData.color === c
                                        ? "border-foreground scale-110"
                                        : "border-transparent hover:scale-105"
                                )}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>

                {/* Icon Picker */}
                <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-2">
                        {t('settings.icon')}
                    </label>
                    <IconPicker
                        value={formData.icon}
                        onChange={(icon) => setFormData({ ...formData, icon })}
                        color={formData.color}
                    />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-foreground-muted hover:text-foreground transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn btn-primary"
                    >
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {t('common.save')}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
