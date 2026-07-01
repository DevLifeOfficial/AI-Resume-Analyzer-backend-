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
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ResumeService {
  private openai: OpenAI;

  constructor(
    @InjectModel(Resume.name)
    private resumeModel: Model<ResumeDocument>,
    private configService: ConfigService,
  ) {
    if (!this.configService.get('OPENAI_API_KEY')) {
      throw new Error('OPENAI_API_KEY missing');
    }
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
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

    // DEBUG: confirm what actually arrived server-side. Remove once the
    // upload issue is resolved.
    console.log('[ResumeService.create] received file', {
      filename,
      mimetype,
      base64Length: fileBase64.length,
      bufferLength: buffer.length,
      header: buffer.subarray(0, 8).toString('ascii'),
    });

    if (buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestException('File too large');
    }

    if (buffer.length === 0) {
      throw new BadRequestException(
        'Received an empty file. The upload may have failed before reaching the server.',
      );
    }

    let rawText = '';

    if (mimetype === 'application/pdf') {
      // A real PDF always starts with the literal bytes "%PDF-". If this
      // check fails, the base64 payload was corrupted/truncated/malformed
      // before it got here (frontend encoding bug, body-size limit, etc.)
      // rather than a genuine "unparseable PDF" issue.
      if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
        console.error(
          '[ResumeService.create] buffer does not start with %PDF- header',
          { header: buffer.subarray(0, 20).toString('hex') },
        );
        throw new BadRequestException(
          'The uploaded file does not look like a valid PDF (missing %PDF header). ' +
            'This usually means the file data was corrupted or truncated before reaching the server — ' +
            'check the fileBase64 value being sent from the client.',
        );
      }

      const pdfParseModule = require('pdf-parse');
      const pdfParse =
        typeof pdfParseModule === 'function'
          ? pdfParseModule
          : pdfParseModule.default;

      if (typeof pdfParse !== 'function') {
        console.error(
          '[ResumeService.create] pdf-parse module did not resolve to a function',
          { keys: Object.keys(pdfParseModule) },
        );
        throw new BadRequestException(
          'PDF parser is misconfigured on the server. Please contact support.',
        );
      }

      try {
        const data = await pdfParse(buffer);
        rawText = data.text;
      } catch (err) {
        console.error('[ResumeService.create] pdf-parse threw', err);
        throw new BadRequestException(
          'Could not parse this PDF. It may be encrypted, scanned/image-only, or corrupted.',
        );
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
    return this.resumeModel.findOne({ _id: id, userId });
  }

  async remove(id: string, userId: string): Promise<boolean> {
    const result = await this.resumeModel.findOneAndDelete({
      _id: id,
      userId,
    });
    return !!result;
  }
}