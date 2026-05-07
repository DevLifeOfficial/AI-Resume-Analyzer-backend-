import {
  AnalysisResponse,
  AnalyzeResumeInput,
  CreateResumeInput,
} from 'src/generated/models';
import OpenAI from 'openai';
import { InjectModel } from '@nestjs/mongoose';
import { Resume, ResumeDocument } from './resume.schema';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ResumeService {
  private openai: OpenAI;

  constructor(
    @InjectModel(Resume.name)
    private resumeModel: Model<ResumeDocument>,
  ) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY missing');
    }
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async create(
    createResumeInput: CreateResumeInput,
    userId: string,
  ): Promise<ResumeDocument> {
    const { fileBase64, filename, mimetype } = createResumeInput;

    const allowedMimetypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedMimetypes.includes(mimetype)) {
      throw new BadRequestException('Only PDF and DOCX files are supported');
    }

    const buffer = Buffer.from(fileBase64, 'base64');

    if (buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestException('File too large');
    }

    let rawText = '';

    if (mimetype === 'application/pdf') {
      const pdfParse = require('pdf-parse');
      try {
        const data = await pdfParse(buffer);
        rawText = data.text;
      } catch {
        throw new BadRequestException('Invalid PDF');
      }
    } else {
      const mammoth = await import('mammoth');
      const result = await mammoth.default.extractRawText({ buffer });
      rawText = result.value;
    }

    const resume = new this.resumeModel({
      userId,
      filename,
      rawText: rawText.trim(),
    });

    return resume.save();
  }

  async analyze(
    analyzeResumeInput: AnalyzeResumeInput,
  ): Promise<AnalysisResponse> {
    const { resumeId, jobDescription } = analyzeResumeInput;
    const resume = await this.resumeModel.findById(resumeId);

    if (!resume) {
      throw new BadRequestException('Resume not found');
    }

    const prompt = `Analyze the following resume and provide an ATS score, keywords, suggestions for improvement, and strengths.${
      jobDescription
        ? ` Also, consider the following job description: ${jobDescription}`
        : ''
    }\n\nResume Text:\n${resume.rawText}

Provide the response in the following JSON format only, with no extra text:
{
  "atsScore": number (0-100),
  "keywords": [array of strings],
  "suggestions": [array of strings],
  "strengths": [array of strings],
  "confidence": number (0-1)
}`;

    // FIX: Use a real, valid OpenAI model name
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert resume analyzer. Always respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 600,
    });

    const raw = completion.choices[0]?.message?.content || '{}';

    // FIX: Safely parse JSON — strip markdown fences if model wraps in ```json
    let analysis: any = {};
    try {
      const cleaned = raw.replace(/```json|```/g, '').trim();
      analysis = JSON.parse(cleaned);
    } catch {
      throw new BadRequestException(
        'Failed to parse AI analysis response. Please try again.',
      );
    }

    // FIX: await the save so errors are not silently swallowed
    resume.analyses.push({
      analysisId: uuidv4(),
      atsScore: analysis.atsScore || 0,
      keywords: analysis.keywords || [],
      suggestions: analysis.suggestions || [],
      strengths: analysis.strengths || [],
      createdAt: new Date(),
    });

    await resume.save();

    return {
      atsScore: analysis.atsScore || 0,
      keywords: analysis.keywords || [],
      suggestions: analysis.suggestions || [],
      strengths: analysis.strengths || [],
      confidence: analysis.confidence || 0,
    };
  }

  async findAllByUser(userId: string): Promise<ResumeDocument[]> {
    return this.resumeModel.find({ userId }).sort({ createdAt: -1 });
  }

  async findOne(id: string, userId: string): Promise<ResumeDocument | null> {
    return this.resumeModel.findById(id, null, { userId });
  }

  async remove(id: string, userId: string): Promise<boolean> {
    await this.resumeModel.findByIdAndDelete(id, { userId });
    return true;
  }
}
