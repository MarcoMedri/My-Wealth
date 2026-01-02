/**
 * i18n Validation Script
 * 
 * Detects missing translation keys between locale files.
 * Run with: npx ts-node scripts/validate-i18n.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const LOCALES_DIR = path.join(__dirname, '../src/renderer/src/locales');

interface TranslationObject {
    [key: string]: string | TranslationObject;
}

function loadJson(filePath: string): TranslationObject {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
}

function getAllKeys(obj: TranslationObject, prefix = ''): string[] {
    const keys: string[] = [];
    
    for (const key of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];
        
        if (typeof value === 'object' && value !== null) {
            keys.push(...getAllKeys(value as TranslationObject, fullKey));
        } else {
            keys.push(fullKey);
        }
    }
    
    return keys;
}

function findMissingKeys(sourceKeys: string[], targetKeys: string[]): string[] {
    const targetSet = new Set(targetKeys);
    return sourceKeys.filter(key => !targetSet.has(key));
}

function main() {
    console.log('🌍 i18n Validation Script\n');
    console.log('Checking locale files in:', LOCALES_DIR);
    console.log('─'.repeat(50));

    const enPath = path.join(LOCALES_DIR, 'en.json');
    const itPath = path.join(LOCALES_DIR, 'it.json');

    if (!fs.existsSync(enPath)) {
        console.error('❌ en.json not found');
        process.exit(1);
    }
    if (!fs.existsSync(itPath)) {
        console.error('❌ it.json not found');
        process.exit(1);
    }

    const en = loadJson(enPath);
    const it = loadJson(itPath);

    const enKeys = getAllKeys(en);
    const itKeys = getAllKeys(it);

    console.log(`\n📊 Statistics:`);
    console.log(`   EN keys: ${enKeys.length}`);
    console.log(`   IT keys: ${itKeys.length}`);

    const missingInIt = findMissingKeys(enKeys, itKeys);
    const missingInEn = findMissingKeys(itKeys, enKeys);

    if (missingInIt.length > 0) {
        console.log(`\n⚠️  Missing in IT (${missingInIt.length} keys):`);
        missingInIt.slice(0, 20).forEach(key => console.log(`   - ${key}`));
        if (missingInIt.length > 20) {
            console.log(`   ... and ${missingInIt.length - 20} more`);
        }
    } else {
        console.log('\n✅ No keys missing in IT');
    }

    if (missingInEn.length > 0) {
        console.log(`\n⚠️  Missing in EN (${missingInEn.length} keys):`);
        missingInEn.slice(0, 20).forEach(key => console.log(`   - ${key}`));
        if (missingInEn.length > 20) {
            console.log(`   ... and ${missingInEn.length - 20} more`);
        }
    } else {
        console.log('\n✅ No keys missing in EN');
    }

    console.log('\n─'.repeat(50));

    if (missingInIt.length === 0 && missingInEn.length === 0) {
        console.log('🎉 All translations are in sync!');
        process.exit(0);
    } else {
        console.log('⚠️  Translation mismatches found. Please review and fix.');
        process.exit(1);
    }
}

main();
