import { db } from '../config/database';
import { env } from '../config/env';
import crypto from 'crypto';

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

// In-Memory state for mock mode, seeded with competitive content (Inhalt)
const mockMaterials = new Map<string, Material>();

const seedMockMaterials = () => {
  if (mockMaterials.size > 0) return;
  
  const defaultMaterials: Material[] = [
    {
      id: 'material-ausbildung-guide',
      title: 'Gateway to Future - Ausbildung Germany Guide (2026)',
      description: 'Our flagship 50-page guide detailing Ausbildung requirements, vocational schools, salary expectations, and top target sectors (Nursing, IT, Mechatronics). Outperforms generic brochures.',
      type: 'PDF',
      url: 'https://gatewaytofuture.com/resources/Ausbildung_Germany_Complete_Guide_2026.pdf',
      level: 'ALL',
      created_at: new Date(),
    },
    {
      id: 'material-cv-template',
      title: 'German Standard CV (Europass / Lebenslauf) Template',
      description: 'Fully formatted, German-compliant resume template. Essential layout for securing Ausbildung contracts and direct interviews.',
      type: 'PDF',
      url: 'https://gatewaytofuture.com/resources/Lebenslauf_German_Standard_Template.pdf',
      level: 'ALL',
      created_at: new Date(),
    },
    {
      id: 'material-a1-vocab',
      title: 'Goethe A1 German Vocabulary Prep Sheets',
      description: 'Curated 650 words with English translations and usage examples. Essential study guide to guarantee passing your Goethe-Zertifikat A1.',
      type: 'PDF',
      url: 'https://gatewaytofuture.com/resources/Goethe_A1_Vocabulary_Premium_Sheets.pdf',
      level: 'A1',
      created_at: new Date(),
    },
    {
      id: 'material-b1-video',
      title: 'How to Ace B1 Speaking Exam - Mock Simulation Video',
      description: 'Step-by-step review of the B1 verbal exam. Learn common phrases, accent tips, and structural guidelines to impress Telc/Goethe examiners.',
      type: 'VIDEO',
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder video URL (using embed link)
      level: 'B1',
      created_at: new Date(),
    },
    {
      id: 'material-visa-guide',
      title: 'Sperrkonto (Blocked Account) & APS Verification Roadmap',
      description: 'Detailed instructions on setting up block accounts (Expatrio, Fintiba) and obtaining the mandatory APS certificate from India. Avoid visa rejections with this checklist.',
      type: 'PDF',
      url: 'https://gatewaytofuture.com/resources/Sperrkonto_APS_Visa_Checklist_2026.pdf',
      level: 'ALL',
      created_at: new Date(),
    }
  ];

  for (const m of defaultMaterials) {
    mockMaterials.set(m.id, m);
  }
};

// Seed automatically
seedMockMaterials();

export class MaterialRepository {
  static async findAll(levelFilter?: string): Promise<Material[]> {
    if (env.DB_MOCK) {
      seedMockMaterials();
      const list = Array.from(mockMaterials.values());
      if (levelFilter && levelFilter !== 'admin') {
        // Students see materials matching their level, plus general 'ALL' level materials
        return list
          .filter(m => m.level === 'ALL' || m.level === levelFilter)
          .map(m => ({ ...m }));
      }
      return list.map(m => ({ ...m }));
    }

    let queryStr = 'SELECT id, title, description, type, url, level, created_by, created_at FROM materials';
    const params: any[] = [];

    if (levelFilter && levelFilter !== 'admin') {
      queryStr += ' WHERE level = $1 OR level = \'ALL\'';
      params.push(levelFilter);
    }
    
    queryStr += ' ORDER BY created_at DESC';

    const result = await db.query(queryStr, params);
    return result.rows.map(row => ({
      ...row,
      created_at: new Date(row.created_at),
    }));
  }

  static async create(material: Omit<Material, 'id' | 'created_at'>): Promise<Material> {
    if (env.DB_MOCK) {
      const newMaterial: Material = {
        ...material,
        id: crypto.randomUUID(),
        created_at: new Date(),
      };
      mockMaterials.set(newMaterial.id, newMaterial);
      return { ...newMaterial };
    }

    const result = await db.query(
      `INSERT INTO materials (title, description, type, url, level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, description, type, url, level, created_by, created_at`,
      [
        material.title,
        material.description,
        material.type,
        material.url,
        material.level,
        material.created_by || null,
      ]
    );

    const row = result.rows[0];
    return {
      ...row,
      created_at: new Date(row.created_at),
    };
  }

  static async clearMockData(): Promise<void> {
    mockMaterials.clear();
    seedMockMaterials();
  }
}
