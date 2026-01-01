import { useState } from 'react';
import {
    Briefcase, Laptop, TrendingUp, Utensils, Home, Zap, Car, Tv, ShoppingBag,
    HeartPulse, Coffee, Plane, Music, Book, GraduationCap, Github, Gamepad2,
    Dumbbell, Gift, Smartphone, Wifi, Anchor, Camera, Hammer, Wrench,
    Scissors, CreditCard, Banknote, Landmark, PiggyBank, Bitcoin, Wallet,
    Baby, Dog, Cat, Flower2, TreeDeciduous, Palmtree, Sun, Moon,
    Umbrella, Ticket, Map, Globe, Flag, Star, Heart, Smile
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

// Map of icon names to components
export const ICON_MAP = {
    'briefcase': Briefcase,
    'laptop': Laptop,
    'trending-up': TrendingUp,
    'utensils': Utensils,
    'home': Home,
    'zap': Zap,
    'car': Car,
    'tv': Tv,
    'shopping-bag': ShoppingBag,
    'heart-pulse': HeartPulse,
    'coffee': Coffee,
    'plane': Plane,
    'music': Music,
    'book': Book,
    'graduation-cap': GraduationCap,
    'github': Github,
    'gamepad-2': Gamepad2,
    'dumbbell': Dumbbell,
    'gift': Gift,
    'smartphone': Smartphone,
    'wifi': Wifi,
    'anchor': Anchor,
    'camera': Camera,
    'hammer': Hammer,
    'wrench': Wrench,
    'scissors': Scissors,
    'credit-card': CreditCard,
    'banknote': Banknote,
    'landmark': Landmark,
    'piggy-bank': PiggyBank,
    'bitcoin': Bitcoin,
    'wallet': Wallet,
    'baby': Baby,
    'dog': Dog,
    'cat': Cat,
    'flower-2': Flower2,
    'tree-deciduous': TreeDeciduous,
    'palmtree': Palmtree,
    'sun': Sun,
    'moon': Moon,
    'umbrella': Umbrella,
    'ticket': Ticket,
    'map': Map,
    'globe': Globe,
    'flag': Flag,
    'star': Star,
    'heart': Heart,
    'smile': Smile
};

export type IconName = keyof typeof ICON_MAP;

interface IconPickerProps {
    value: string;
    onChange: (icon: string) => void;
    color?: string;
}

export function IconPicker({ value, onChange, color = 'currentColor' }: IconPickerProps) {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');

    const filteredIcons = Object.keys(ICON_MAP).filter(name =>
        name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-3">
            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('settings.searchIcons')}
                className="w-full px-3 py-2 text-sm bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-indigo-500 outline-none"
            />

            <div className="grid grid-cols-6 gap-2 max-h-[200px] overflow-y-auto p-1">
                {filteredIcons.map((name) => {
                    const Icon = ICON_MAP[name as IconName];
                    const isSelected = value === name;

                    return (
                        <button
                            key={name}
                            type="button"
                            onClick={() => onChange(name)}
                            className={cn(
                                "aspect-square flex items-center justify-center rounded-lg transition-all",
                                isSelected
                                    ? "bg-indigo-50 dark:bg-indigo-900/40 ring-2 ring-indigo-500"
                                    : "hover:bg-background-muted text-foreground-muted hover:text-foreground"
                            )}
                            title={name}
                        >
                            <Icon
                                className="w-5 h-5"
                                style={{ color: isSelected ? color : undefined }}
                            />
                        </button>
                    );
                })}
            </div>
            {filteredIcons.length === 0 && (
                <div className="text-center text-sm text-foreground-muted py-4">
                    {t('common.noResults')}
                </div>
            )}
        </div>
    );
}
