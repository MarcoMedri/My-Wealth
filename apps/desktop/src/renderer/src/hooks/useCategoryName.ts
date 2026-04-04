import { useTranslation } from 'react-i18next';

// Mapping of standard category names (from seed.ts) to translation keys
// Key = original English name from seed
// Value = i18n key suffix (e.g. 'groceries' for 'categories.groceries')
export const STANDARD_CATEGORIES_MAP: Record<string, string> = {
  // Income
  'Salary': 'salary',
  'Freelance': 'freelance',
  'Investments': 'investments',
  'Gifts': 'gifts',
  'Dividends': 'dividends',

  // Expenses - Housing
  'Rent': 'rent',
  'Mortgage': 'mortgage',
  'Utilities': 'utilities',
  'Internet & Phone': 'internetPhone',
  'Maintenance': 'maintenance',

  // Expenses - Food
  'Groceries': 'groceries',
  'Dining Out': 'diningOut',
  'Coffee': 'coffee',

  // Expenses - Transport
  'Transportation': 'transportation',
  'Fuel': 'fuel',

  // Expenses - Lifestyle
  'Entertainment': 'entertainment',
  'Shopping': 'shopping',
  'Travel': 'travel',
  'Subscription': 'subscription',
  'Hobbies': 'hobbies',
  'Gaming': 'gaming',

  // Expenses - Health
  'Healthcare': 'healthcare',
  'Fitness': 'fitness',
  'Personal Care': 'personalCare',
  'Education': 'education',

  // Expenses - Family
  'Kids': 'kids',
  'Pets': 'pets',
};

/**
 * Hook to get the localized name of a category.
 * If the category name matches a standard one, it returns the translation.
 * Otherwise, it returns the original name.
 */
export function useCategoryName() {
  const { t } = useTranslation();

  const getCategoryName = (originalName: string) => {
    const key = STANDARD_CATEGORIES_MAP[originalName];
    if (key) {
      return t(`categories.${key}`);
    }
    return originalName;
  };

  return { getCategoryName };
}
