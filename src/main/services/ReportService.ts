/**
 * Report Export Service
 * 
 * Generate PDF and CSV reports for financial data.
 */

import { formatMoney } from '../../shared/schemas';

export interface ReportOptions {
    title: string;
    period: {
        start: string;
        end: string;
    };
    currency: string;
    includeCharts: boolean;
}

export interface FinancialSummary {
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    savingsRate: number;
}

export interface ReportData {
    summary: FinancialSummary;
    assetsByCategory: Array<{ category: string; value: number; percentage: number }>;
    monthlyTrend: Array<{ month: string; netWorth: number; income: number; expenses: number }>;
    topExpenses: Array<{ category: string; amount: number }>;
    topIncome: Array<{ category: string; amount: number }>;
}

/**
 * Generate CSV content from data
 */
export function generateCSV(data: ReportData, currency: string): string {
    const lines: string[] = [];
    
    // Summary section
    lines.push('Financial Summary');
    lines.push(`Total Assets,${formatMoney(data.summary.totalAssets, currency)}`);
    lines.push(`Total Liabilities,${formatMoney(data.summary.totalLiabilities, currency)}`);
    lines.push(`Net Worth,${formatMoney(data.summary.netWorth, currency)}`);
    lines.push(`Monthly Income,${formatMoney(data.summary.monthlyIncome, currency)}`);
    lines.push(`Monthly Expenses,${formatMoney(data.summary.monthlyExpenses, currency)}`);
    lines.push(`Savings Rate,${data.summary.savingsRate.toFixed(1)}%`);
    lines.push('');
    
    // Assets by category
    lines.push('Assets by Category');
    lines.push('Category,Value,Percentage');
    for (const item of data.assetsByCategory) {
        lines.push(`${item.category},${formatMoney(item.value, currency)},${item.percentage.toFixed(1)}%`);
    }
    lines.push('');
    
    // Monthly trend
    lines.push('Monthly Trend');
    lines.push('Month,Net Worth,Income,Expenses');
    for (const item of data.monthlyTrend) {
        lines.push(`${item.month},${formatMoney(item.netWorth, currency)},${formatMoney(item.income, currency)},${formatMoney(item.expenses, currency)}`);
    }
    lines.push('');
    
    // Top expenses
    lines.push('Top Expenses');
    lines.push('Category,Amount');
    for (const item of data.topExpenses) {
        lines.push(`${item.category},${formatMoney(item.amount, currency)}`);
    }
    
    return lines.join('\n');
}

/**
 * Generate HTML content for PDF conversion
 */
export function generateHTMLReport(data: ReportData, options: ReportOptions): string {
    const { title, period, currency } = options;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; }
        h1 { color: #1f2937; margin-bottom: 8px; }
        .period { color: #6b7280; margin-bottom: 32px; }
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
        .summary-card { background: #f9fafb; padding: 16px; border-radius: 8px; }
        .summary-label { color: #6b7280; font-size: 14px; }
        .summary-value { font-size: 24px; font-weight: 600; color: #1f2937; }
        .summary-value.positive { color: #059669; }
        .summary-value.negative { color: #dc2626; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: 600; }
        .text-right { text-align: right; }
        .section-title { font-size: 18px; font-weight: 600; margin: 24px 0 16px; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <p class="period">${period.start} - ${period.end}</p>
    
    <div class="summary-grid">
        <div class="summary-card">
            <div class="summary-label">Net Worth</div>
            <div class="summary-value ${data.summary.netWorth >= 0 ? 'positive' : 'negative'}">
                ${formatMoney(data.summary.netWorth, currency)}
            </div>
        </div>
        <div class="summary-card">
            <div class="summary-label">Monthly Income</div>
            <div class="summary-value positive">${formatMoney(data.summary.monthlyIncome, currency)}</div>
        </div>
        <div class="summary-card">
            <div class="summary-label">Monthly Expenses</div>
            <div class="summary-value negative">${formatMoney(data.summary.monthlyExpenses, currency)}</div>
        </div>
    </div>
    
    <h2 class="section-title">Assets by Category</h2>
    <table>
        <thead>
            <tr>
                <th>Category</th>
                <th class="text-right">Value</th>
                <th class="text-right">%</th>
            </tr>
        </thead>
        <tbody>
            ${data.assetsByCategory.map(item => `
                <tr>
                    <td>${item.category}</td>
                    <td class="text-right">${formatMoney(item.value, currency)}</td>
                    <td class="text-right">${item.percentage.toFixed(1)}%</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <h2 class="section-title">Top Expenses</h2>
    <table>
        <thead>
            <tr>
                <th>Category</th>
                <th class="text-right">Amount</th>
            </tr>
        </thead>
        <tbody>
            ${data.topExpenses.map(item => `
                <tr>
                    <td>${item.category}</td>
                    <td class="text-right">${formatMoney(item.amount, currency)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>
    `;
}

/**
 * Export report to file
 */
export async function exportReport(
    data: ReportData,
    options: ReportOptions,
    format: 'csv' | 'html'
): Promise<string> {
    if (format === 'csv') {
        return generateCSV(data, options.currency);
    } else {
        return generateHTMLReport(data, options);
    }
}
