import { Request, Response, NextFunction } from 'express';
import { extractTextFromBuffer } from '../services/fileParser.service.ts';
import { sanitizeText, redactSensitivePII } from '../services/sanitizer.service.ts';
import { performAIAnalysis } from '../services/aiAnalysis.service.ts';
import { Analysis } from '../models/analysis.model.ts';
import { logger } from '../utils/logger.ts';
import { isDatabaseConnected } from '../config/db.ts';

export async function analyzeResume(req: Request, res: Response, next: NextFunction) {
  try {
    const file = req.file!;
    const rawJobDescription = req.body.jobDescription as string;
    const sessionId = (req.body.sessionId as string) || 'default-session';

    // 1. Extract plain text from in-memory buffer
    const parsedDocument = await extractTextFromBuffer(
      file.buffer,
      file.mimetype,
      file.originalname
    );

    // 2. Sanitize inputs (PII safety & length clamping)
    const sanitizedResume = redactSensitivePII(sanitizeText(parsedDocument.text, 10000));
    const sanitizedJD = sanitizeText(rawJobDescription, 8000);

    // 3. Call AI Analysis (Google Gemini AI)
    const aiResult = await performAIAnalysis(sanitizedResume, sanitizedJD);

    // 4. Save metadata to database (NEVER the raw resume text or file)
    let savedRecord: Analysis | null = null;
    try {
      savedRecord = await Analysis.create({
        session_id: sessionId,
        match_percentage: aiResult.matchPercentage,
        scoring_breakdown: aiResult.scoringBreakdown,
        matched_skills: aiResult.matchedSkills,
        missing_skills: aiResult.missingSkills,
        summary: aiResult.summary,
        interview_questions: aiResult.interviewQuestions,
        resume_text_hash: parsedDocument.hash,
      });
    } catch (dbErr: any) {
      logger.warn('Could not persist analysis record to database (continuing):', dbErr.message);
    }

    // 5. Return structured analysis result
    return res.status(200).json({
      success: true,
      data: {
        id: savedRecord ? savedRecord.id : 'temp-' + Date.now(),
        matchPercentage: aiResult.matchPercentage,
        scoringBreakdown: aiResult.scoringBreakdown,
        matchedSkills: aiResult.matchedSkills,
        missingSkills: aiResult.missingSkills,
        summary: aiResult.summary,
        interviewQuestions: aiResult.interviewQuestions,
        modelUsed: aiResult.modelUsed,
        createdAt: savedRecord ? savedRecord.created_at : new Date().toISOString(),
        fileName: file.originalname,
      },
    });
  } catch (error: any) {
    next(error);
  }
}

export async function getRecentAnalyses(req: Request, res: Response, next: NextFunction) {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required.' });
    }

    const analyses = await Analysis.findAll({
      where: { session_id: sessionId },
      order: [['created_at', 'DESC']],
      limit: 10,
      attributes: [
        'id',
        'session_id',
        'match_percentage',
        'scoring_breakdown',
        'matched_skills',
        'missing_skills',
        'summary',
        'interview_questions',
        'created_at',
      ],
    });

    return res.status(200).json({
      success: true,
      data: analyses.map((a) => ({
        id: a.id,
        sessionId: a.session_id,
        matchPercentage: a.match_percentage,
        scoringBreakdown: a.scoring_breakdown,
        matchedSkills: a.matched_skills,
        missingSkills: a.missing_skills,
        summary: a.summary,
        interviewQuestions: a.interview_questions,
        createdAt: a.created_at,
      })),
    });
  } catch (error: any) {
    next(error);
  }
}

export async function getAnalysisById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const analysis = await Analysis.findByPk(id);

    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Analysis record not found.' });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: analysis.id,
        sessionId: analysis.session_id,
        matchPercentage: analysis.match_percentage,
        scoringBreakdown: analysis.scoring_breakdown,
        matchedSkills: analysis.matched_skills,
        missingSkills: analysis.missing_skills,
        summary: analysis.summary,
        interviewQuestions: analysis.interview_questions,
        createdAt: analysis.created_at,
      },
    });
  } catch (error: any) {
    next(error);
  }
}

export async function healthCheck(req: Request, res: Response) {
  const dbStatus = isDatabaseConnected() ? 'mysql-connected' : 'memory-session-ready';

  return res.status(200).json({
    status: 'ok',
    service: 'AI Resume Analyzer Backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
}
