/**
 * Base Repository
 * 
 * Abstract class for file-based data persistence.
 * Handles common I/O operations with Zod validation.
 */

import fs from 'fs-extra';
import path from 'path';
import { z } from 'zod';

export interface RepositoryOptions {
    vaultPath: string;
    fileName: string;
}

export abstract class BaseRepository<T extends { id: string }> {
    protected vaultPath: string;
    protected fileName: string;
    protected schema: z.ZodTypeAny;
    protected data: T[] = [];

    constructor(options: RepositoryOptions, schema: z.ZodTypeAny) {
        this.vaultPath = options.vaultPath;
        this.fileName = options.fileName;
        this.schema = schema;
    }

    protected get filePath(): string {
        return path.join(this.vaultPath, this.fileName);
    }

    /**
     * Load data from file with validation
     */
    async load(): Promise<T[]> {
        try {
            if (await fs.pathExists(this.filePath)) {
                const content = await fs.readJson(this.filePath);
                const items = this.extractItems(content);
                
                // Validate each item
                this.data = items.map(item => this.schema.parse(item));
                return this.data;
            }
            return [];
        } catch (error) {
            console.error(`[${this.constructor.name}] Load failed:`, error);
            return [];
        }
    }

    /**
     * Save all data to file
     */
    async saveAll(): Promise<void> {
        const content = this.wrapItems(this.data);
        await this.atomicWrite(content);
    }

    /**
     * Save a single item (upsert)
     */
    async save(item: T): Promise<T> {
        const validated = this.schema.parse(item);
        const id = this.getId(validated);
        const index = this.data.findIndex(i => this.getId(i) === id);
        
        if (index >= 0) {
            this.data[index] = validated;
        } else {
            this.data.push(validated);
        }
        
        await this.saveAll();
        return validated;
    }

    /**
     * Delete an item by ID
     */
    async delete(id: string): Promise<boolean> {
        const initialLength = this.data.length;
        this.data = this.data.filter(item => this.getId(item) !== id);
        
        if (this.data.length < initialLength) {
            await this.saveAll();
            return true;
        }
        return false;
    }

    /**
     * Find item by ID
     */
    findById(id: string): T | undefined {
        return this.data.find(item => this.getId(item) === id);
    }

    /**
     * Get all items
     */
    getAll(): T[] {
        return [...this.data];
    }

    /**
     * Atomic write using temp file
     */
    protected async atomicWrite(content: object): Promise<void> {
        const tempPath = `${this.filePath}.tmp`;
        await fs.writeJson(tempPath, content, { spaces: 2 });
        await fs.rename(tempPath, this.filePath);
    }

    /**
     * Abstract: Extract items array from file content
     */
    protected abstract extractItems(content: unknown): unknown[];

    /**
     * Abstract: Wrap items array for file content
     */
    protected abstract wrapItems(items: T[]): object;

    /**
     * Abstract: Get ID from item
     */
    protected abstract getId(item: T): string;
}
