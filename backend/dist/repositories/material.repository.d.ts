export interface Material {
    id: string;
    title: string;
    description: string;
    type: 'PDF' | 'VIDEO';
    url: string;
    level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'ALL';
    created_by?: string;
    created_at: Date;
}
export declare class MaterialRepository {
    static findAll(levelFilter?: string): Promise<Material[]>;
    static create(material: Omit<Material, 'id' | 'created_at'>): Promise<Material>;
    static clearMockData(): Promise<void>;
}
