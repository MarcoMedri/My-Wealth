import {
    Wallet,
    Building2,
    CandlestickChart,
    Bitcoin,
    Landmark,
    Banknote,
    PiggyBank,
    Briefcase
} from 'lucide-react';

// Icon mapping for Broker icons
export const ICON_MAP: Record<string, React.ElementType> = {
    'wallet': Wallet,
    'building-2': Building2,
    'candlestick-chart': CandlestickChart,
    'bitcoin': Bitcoin,
    'landmark': Landmark, // Bank
    'banknote': Banknote, // Cash
    'piggy-bank': PiggyBank, // Savings
    'briefcase': Briefcase, // Portfolio
};
