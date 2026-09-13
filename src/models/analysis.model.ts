import crypto from 'crypto';
import { getSequelize, isDatabaseConnected } from '../config/db.js';

// Local type utility to replace sequelize's Optional<T, K> — avoids static import of sequelize
type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export interface ScoringBreakdown {
  coreTechScore: number;
  architectureScopeScore: number;
  experienceLevelScore: number;
  domainMethodologyScore: number;
}

export interface InterviewQuestionItem {
  question: string;
  category?: string;
  rationale?: string;
  suggestedAnswer?: string;
  suggestedAnswerPoints?: string[];
  pitfallsToAvoid?: string[];
}

export interface AnalysisAttributes {
  id: string;
  session_id: string;
  match_percentage: number;
  scoring_breakdown?: ScoringBreakdown;
  matched_skills: string[];
  missing_skills: string[];
  summary: string;
  interview_questions: InterviewQuestionItem[];
  resume_text_hash: string;
  created_at: Date;
}

export interface AnalysisCreationAttributes
  extends MakeOptional<AnalysisAttributes, 'id' | 'created_at'> {}

// In-memory analyses cache (RAM only; no SQLite or disk db_storage required)
const inMemoryStore: AnalysisAttributes[] = [];

function readLocalAnalyses(): AnalysisAttributes[] {
  return [...inMemoryStore];
}

function writeLocalAnalyses(items: AnalysisAttributes[]) {
  inMemoryStore.length = 0;
  inMemoryStore.push(...items);
}

export class Analysis {
  public id: string;
  public session_id: string;
  public match_percentage: number;
  public scoring_breakdown?: ScoringBreakdown;
  public matched_skills: string[];
  public missing_skills: string[];
  public summary: string;
  public interview_questions: InterviewQuestionItem[];
  public resume_text_hash: string;
  public created_at: Date;

  constructor(data: AnalysisAttributes) {
    this.id = data.id;
    this.session_id = data.session_id;
    this.match_percentage = data.match_percentage;
    this.scoring_breakdown = data.scoring_breakdown;
    this.matched_skills = data.matched_skills;
    this.missing_skills = data.missing_skills;
    this.summary = data.summary;
    this.interview_questions = data.interview_questions;
    this.resume_text_hash = data.resume_text_hash;
    this.created_at = data.created_at instanceof Date ? data.created_at : new Date(data.created_at);
  }

  static async create(attrs: AnalysisCreationAttributes): Promise<Analysis> {
    const item: AnalysisAttributes = {
      id: attrs.id || crypto.randomUUID(),
      session_id: attrs.session_id,
      match_percentage: attrs.match_percentage,
      scoring_breakdown: attrs.scoring_breakdown,
      matched_skills: attrs.matched_skills || [],
      missing_skills: attrs.missing_skills || [],
      summary: attrs.summary,
      interview_questions: attrs.interview_questions || [],
      resume_text_hash: attrs.resume_text_hash,
      created_at: attrs.created_at || new Date(),
    };

    const seq = getSequelize();
    if (isDatabaseConnected() && seq) {
      try {
        const sqlModel = await getSequelizeModel();
        if (sqlModel) {
          const res = await sqlModel.create(item as any);
          return new Analysis(res.toJSON() as any);
        }
      } catch (err) {
        // Fall back to in-memory
      }
    }

    // In-memory fallback
    const all = readLocalAnalyses();
    all.unshift(item);
    writeLocalAnalyses(all.slice(0, 100)); // keep last 100
    return new Analysis(item);
  }

  static async findAll(options?: {
    where?: { session_id?: string };
    order?: any;
    limit?: number;
    attributes?: string[];
  }): Promise<Analysis[]> {
    const seq = getSequelize();
    if (isDatabaseConnected() && seq) {
      try {
        const sqlModel = await getSequelizeModel();
        if (sqlModel) {
          const results = await sqlModel.findAll(options as any);
          return results.map((r: any) => new Analysis(r.toJSON() as any));
        }
      } catch (err) {
        // Fall back to in-memory
      }
    }

    let all = readLocalAnalyses();
    if (options?.where?.session_id) {
      all = all.filter((a) => a.session_id === options.where!.session_id);
    }
    all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (options?.limit) {
      all = all.slice(0, options.limit);
    }
    return all.map((a) => new Analysis(a));
  }

  static async findByPk(id: string): Promise<Analysis | null> {
    const seq = getSequelize();
    if (isDatabaseConnected() && seq) {
      try {
        const sqlModel = await getSequelizeModel();
        if (sqlModel) {
          const res = await sqlModel.findByPk(id);
          return res ? new Analysis(res.toJSON() as any) : null;
        }
      } catch (err) {
        // Fall back to in-memory
      }
    }

    const all = readLocalAnalyses();
    const found = all.find((a) => a.id === id);
    return found ? new Analysis(found) : null;
  }
}

// Lazy Sequelize model definition — only created when MySQL is connected
let SeqAnalysisModel: any = null;

async function getSequelizeModel() {
  const seq = getSequelize();
  if (!seq || !isDatabaseConnected()) return null;
  if (!SeqAnalysisModel) {
    // Dynamic import — DataTypes is only needed when DB is connected.
    // This prevents the entire sequelize package from loading at cold-start.
    const { DataTypes } = await import('sequelize');
    SeqAnalysisModel = seq.define('Analysis', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      session_id: { type: DataTypes.STRING(64), allowNull: false },
      match_percentage: { type: DataTypes.INTEGER, allowNull: false },
      scoring_breakdown: { type: DataTypes.JSON, allowNull: true },
      matched_skills: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
      missing_skills: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
      summary: { type: DataTypes.TEXT, allowNull: false },
      interview_questions: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
      resume_text_hash: { type: DataTypes.STRING(64), allowNull: false },
    }, {
      tableName: 'analyses',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    });
  }
  return SeqAnalysisModel;
}
