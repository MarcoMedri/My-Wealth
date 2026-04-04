import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useVaultStore } from '../../store/useVaultStore';
import { CategoryModal } from './CategoryModal';
import { ICON_MAP } from './IconPicker';
import { Plus, Pencil, Trash2, Tag, Loader2, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Category } from '../../../@my-wealth/shared/schemas';
import { useCategoryName } from '../../hooks/useCategoryName';

export function CategoryManager() {
    const { t } = useTranslation();
    const { getCategoryName } = useCategoryName();
    const { categories, getCategoriesByType, deleteCategory } = useVaultStore(); // Note: addCategory used for seeding defaults
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [activeTab, setActiveTab] = useState<'income' | 'expense'>('expense');
    const [isLoading, setIsLoading] = useState(false);

    const categoriesList = getCategoriesByType(activeTab);

    const handleEdit = (category: Category) => {
        setSelectedCategory(category);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setSelectedCategory(null);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('common.confirmDelete'))) return;

        try {
            await window.api.deleteCategory(id);
            deleteCategory(id);
        } catch (error) {
            console.error('Failed to delete category:', error);
            alert('Failed to delete category');
        }
    };

    const handleSeedDefaults = async () => {
        if (!confirm(t('settings.confirmResetDefaults'))) return;
        setIsLoading(true);
        try {
            await window.api.generateDemoData();
            // Reload vault data to reflect changes
            await window.api.getVaultData();
            // Manually sync store (or just reload window)
            // Ideally useVaultStore has a sync method, but for now we'll reload window or just rely on IPC?
            // Actually, generateDemoData returns counts.
            // Let's force a reload of the app or just call window.location.reload() for simplicity
            // or re-fetch vault data.
            window.location.reload();
        } catch (error) {
            console.error('Failed to seed defaults:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex justify-between items-center">
                <div className="flex bg-background-subtle rounded-lg p-1 border border-border">
                    <button
                        onClick={() => setActiveTab('expense')}
                        className={cn(
                            "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                            activeTab === 'expense'
                                ? "bg-background-card text-foreground shadow-sm"
                                : "text-foreground-muted hover:text-foreground"
                        )}
                    >
                        {t('common.expense')}
                    </button>
                    <button
                        onClick={() => setActiveTab('income')}
                        className={cn(
                            "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                            activeTab === 'income'
                                ? "bg-background-card text-foreground shadow-sm"
                                : "text-foreground-muted hover:text-foreground"
                        )}
                    >
                        {t('common.income')}
                    </button>
                </div>

                <div className="flex gap-2">
                    {categories.length === 0 && (
                        <button
                            onClick={handleSeedDefaults}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground-muted hover:text-foreground border border-border rounded-lg hover:bg-background-subtle transition-colors"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                            {t('settings.loadDefaults')}
                        </button>
                    )}
                    <button
                        onClick={handleAdd}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        {t('common.add')}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[300px] border border-border rounded-xl bg-background-subtle">
                {categoriesList.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-foreground-muted gap-2">
                        <Tag className="w-8 h-8 opacity-50" />
                        <p className="text-sm">{t('common.noData')}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {categoriesList.map((category) => {
                            const Icon = ICON_MAP[category.icon as keyof typeof ICON_MAP] || Tag;
                            return (
                                <div key={category.id} className="flex items-center justify-between p-3 hover:bg-background-card transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm"
                                            style={{ backgroundColor: category.color }}
                                        >
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <span className="font-medium text-foreground">{getCategoryName(category.name)}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleEdit(category)}
                                            className="p-2 text-foreground-muted hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(category.id)}
                                            className="p-2 text-foreground-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <CategoryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                category={selectedCategory}
            />
        </div>
    );
}
