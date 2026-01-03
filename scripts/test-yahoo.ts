
import YahooFinance from 'yahoo-finance2';

async function test() {
    console.log('Testing Yahoo Finance Search...');
    try {
        const yahooFinance = new YahooFinance();
        const query = 'VWCE';
        console.log(`Searching for "${query}"...`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results = await yahooFinance.search(query) as any;
        console.log('Results found:', results.quotes ? results.quotes.length : 0);
        if (results.quotes && results.quotes.length > 0) {
            console.log('First result:', JSON.stringify(results.quotes[0], null, 2));
        } else {
             console.log('Full result:', JSON.stringify(results, null, 2));
        }
    } catch (e) {
        console.error('Test Failed:', e);
    }
}

test();
