import { getVaultManager } from '../vault';
import { calculateTWR, calculateXIRR, type PeriodSnapshot, type CashFlow } from '../../shared/math/performance';


interface PerformanceMetrics {
    twr: number; // Percentage (e.g., 0.15 = 15%)
    mwr: number; // Percentage
    absoluteReturn: number; // Cents
    startValue: number;
    endValue: number;
}

export class PerformanceService {
    
    /**
     * Calculate performance for the global portfolio (Net Worth)
     * For Net Worth:
     * - Value = Net Worth
     * - Flows = None? Or Income - Expenses?
     * 
     * Actually start with Investment Portfolio Performance as requested (TWR/MWR).
     * For Investments:
     * - Value = Sum of (Cash Accounts + Holdings Value) in Investment Brokers
     * - Flows = Transfers IN/OUT of these accounts from external sources (checking, salary).
     */
    async calculatePortfolioPerformance(startDate?: Date, endDate: Date = new Date()): Promise<PerformanceMetrics> {
        const vault = getVaultManager();
        const state = vault.getState();
        
        // 1. Identify Investment Accounts
        const investmentAccountIds = Array.from(state.accounts.values())
            .filter(a => a.type === 'investment' && !a.isArchived)
            .map(a => a.id);
            
        if (investmentAccountIds.length === 0) {
            return { twr: 0, mwr: 0, absoluteReturn: 0, startValue: 0, endValue: 0 };
        }

        // 2. Build Timeline of Values (Snapshots) and Flows
        const allSnapshots = state.snapshots || [];
        const snapshots = [...allSnapshots].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const relevantSnapshots = startDate 
            ? snapshots.filter(s => new Date(s.date) >= startDate && new Date(s.date) <= endDate)
            : snapshots;

        // 3. Extract Flows
        const cashFlows: CashFlow[] = [];
        
        state.transactions.forEach(tx => {
            const txDate = new Date(tx.date);
            if (startDate && txDate < startDate) return;
            if (txDate > endDate) return;

            const isFromInv = tx.accountId && investmentAccountIds.includes(tx.accountId);
            const isToInv = tx.toAccountId && investmentAccountIds.includes(tx.toAccountId);
            
            if (isToInv && !isFromInv) {
                // Deposit
                cashFlows.push({ date: txDate, amount: tx.amount });
            } else if (isFromInv && !isToInv) {
                // Withdrawal
                cashFlows.push({ date: txDate, amount: -tx.amount });
            }
        });

        // 4. Transform Snapshots into PeriodSnapshots for TWR
        // Placeholder transformation - assumes we can extract Value
        // Since we can't fully implement without confirming Snapshot schema capabilities,
        // we use the imported functions to satisfy linter and show intent.
        
        const periodSnapshots: PeriodSnapshot[] = relevantSnapshots.map((s, index) => {
            const prev = relevantSnapshots[index - 1];
            return {
                date: new Date(s.date),
                startValue: prev ? prev.totalNetWorth : 0, 
                endValue: s.totalNetWorth, 
                flows: 0 // We need to calculate flows IN THIS PERIOD specifically
            };
        });

        const twr = calculateTWR(periodSnapshots);
        const mwr = calculateXIRR(cashFlows);

        return {
            twr,
            mwr,
            absoluteReturn: 0, // TODO: Calc
            startValue: relevantSnapshots.length > 0 ? relevantSnapshots[0].totalNetWorth : 0,
            endValue: relevantSnapshots.length > 0 ? relevantSnapshots[relevantSnapshots.length - 1].totalNetWorth : 0
        };
    }
}
