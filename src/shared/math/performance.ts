export interface CashFlow {
    date: Date;
    amount: number; // Positive = Deposit, Negative = Withdrawal
}

export interface PeriodSnapshot {
    date: Date;
    startValue: number;
    endValue: number;
    flows: number; // Net flows during this period
}

/**
 * Calculates Time-Weighted Return (TWR)
 * TWR measures the compound rate of growth of the portfolio, eliminating the distorting effects of inflows and outflows.
 * Formula: TWR = (1 + r1) * (1 + r2) * ... * (1 + rn) - 1
 * where rn = (EndValue - CashFlow) / StartValue - 1
 */
export function calculateTWR(snapshots: PeriodSnapshot[]): number {
    if (snapshots.length === 0) return 0;

    let cumulativeReturn = 1;

    for (const period of snapshots) {
        // We assume flows happen at the START of the period for TWR simplicity in this model, 
        // or we use the Modified Dietz if strictly daily data isn't available.
        // However, standard TWR for daily snapshots:
        // Return = (EndValue - Flows) / StartValue - 1 
        // Note: This assumes Flows happened at the END of the day contribution? 
        // Actually, precise daily TWR:
        // r = (EndValue) / (StartValue + Flows) - 1 (If flows happen at start)
        // r = (EndValue - Flows) / StartValue - 1 (If flows happen at end)
        
        // Let's use the standard approximation where flows are adjusted.
        // If startValue is 0, we treat it as infinite return? No, we skip or handle start.
        if (period.startValue === 0) {
            // Initial funding period
            continue; 
        }
        
        // HPR (Holding Period Return)
        // Assuming flows occur at the end of the day usually (snapshot is EOD).
        // So base value for the day's gain was the start value.
        // Gain = End - Start - Flows
        // Return = Gain / Start
        const gain = period.endValue - period.startValue - period.flows;
        const periodReturn = gain / period.startValue;

        cumulativeReturn *= (1 + periodReturn);
    }

    return cumulativeReturn - 1;
}

/**
 * Calculates Money-Weighted Return (MWR) using XIRR (Extended Internal Rate of Return)
 * MWR measures the actual return on the invested capital.
 * solved for rate r where: sum( flow_i / (1+r)^((d_i - d_0)/365) ) = 0
 */
export function calculateXIRR(flows: CashFlow[], guess = 0.1): number {
    if (flows.length < 2) return 0;

    // Filter out 0 amounts
    const cleanFlows = flows.filter(f => f.amount !== 0);
    if (cleanFlows.length < 2) return 0;
    
    // Check if we have both positive and negative flows (valid investment requires at least one flow IN and one current Value/flow OUT)
    const hasPositive = cleanFlows.some(f => f.amount > 0);
    const hasNegative = cleanFlows.some(f => f.amount < 0);
    if (!hasPositive || !hasNegative) return 0;

    const x0 = cleanFlows[0];
    const startDate = x0.date.getTime();

    function flowFunction(rate: number): number {
        return cleanFlows.reduce((sum, flow) => {
            const timeInYears = (flow.date.getTime() - startDate) / (1000 * 60 * 60 * 24 * 365.25);
            return sum + flow.amount / Math.pow(1 + rate, timeInYears);
        }, 0);
    }

    function flowDerivative(rate: number): number {
        return cleanFlows.reduce((sum, flow) => {
            const timeInYears = (flow.date.getTime() - startDate) / (1000 * 60 * 60 * 24 * 365.25);
            return sum - (timeInYears * flow.amount) / Math.pow(1 + rate, timeInYears + 1);
        }, 0);
    }

    // Newton-Raphson method
    let rate = guess;
    const maxIterations = 100;
    const tolerance = 1e-6;

    for (let i = 0; i < maxIterations; i++) {
        const y = flowFunction(rate);
        const dy = flowDerivative(rate);

        const nextRate = rate - y / dy;

        if (Math.abs(nextRate - rate) < tolerance) {
            return nextRate;
        }

        rate = nextRate;
        
        // Safety check for divergence or invalid rates
        if (!isFinite(rate) || isNaN(rate)) return 0; 
    }

    return rate;
}
