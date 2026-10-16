import { v } from 'convex/values';
import { internalAction, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { logger } from '../lib/logger';
import { generateAIText, getActiveAIConfig } from './aiClient';

// Internal query to check for cached analysis
export const getCachedAnalysis = internalQuery({
  args: {
    movementId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const analysis = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_movement', (q) => q.eq('movementId', args.movementId))
      .order('desc')
      .first();

    if (!analysis) return null;

    const isValid = analysis.expiresAt > now;
    return isValid ? analysis : null;
  },
});

// Internal action to generate AI analysis using Gemini or Claude
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const generateAnalysis: any = internalAction({
  args: {
    movementId: v.string(),
    eventId: v.string(),
    title: v.string(),
    category: v.optional(v.string()),
    currentValue: v.number(),
    previousValue: v.number(),
    seismoScore: v.number(),
    marketQuestion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const config = getActiveAIConfig();
    if (!config) {
      logger.error(
        'No AI provider configured (GEMINI_API_KEY or ANTHROPIC_API_KEY required)'
      );
      return {
        success: false,
        error:
          'AI API key not configured (set GEMINI_API_KEY or ANTHROPIC_API_KEY)',
      };
    }

    try {
      // Check if we already have a valid cached analysis
      const existingAnalysis = await ctx.runQuery(
        internal.aiActions.getCachedAnalysis,
        {
          movementId: args.movementId,
        }
      );

      if (existingAnalysis) {
        logger.debug(`Using cached analysis for movement ${args.movementId}`);
        return { success: true, cached: true, analysis: existingAnalysis };
      }

      logger.debug(
        `Generating AI analysis for ${args.movementId} using ${config.provider} (${config.model})`
      );

      // Extract key terms for better search targeting
      const titleKeywords = args.title
        .toLowerCase()
        .replace(/\b(will|the|be|in|at|on|to|for|of|and|or)\b/gi, ' ')
        .split(/\s+/)
        .filter((word) => word.length > 3)
        .slice(0, 3)
        .join(' ');

      const sanitizedTitle = args.title.replace(/[<>]/g, '');
      const sanitizedQuestion = args.marketQuestion?.replace(/[<>]/g, '');

      // Prompt focused on what smart money is anticipating
      const analysisPrompt = `
        A prediction market just moved BEFORE mainstream news:
        
        <market_title>${sanitizedTitle}</market_title>
        ${sanitizedQuestion ? `<market_question>${sanitizedQuestion}</market_question>` : ''}
        Category: ${args.category || 'general'}
        Movement: ${args.previousValue}% → ${args.currentValue}% (${Math.abs(args.currentValue - args.previousValue).toFixed(1)}% shift)
        Intensity Score: ${args.seismoScore.toFixed(1)}/10 (indicating ${args.seismoScore >= 7.5 ? 'extreme' : args.seismoScore >= 5 ? 'high' : 'moderate'} trading activity)
        
        Search keywords: ${titleKeywords}
        
        Remember: Prediction markets move BEFORE news breaks. Smart money is betting on what WILL happen.
        
        Provide a clear 2-3 sentence explanation of what traders appear to be anticipating:
        - Focus on what smart money might know that others don't yet
        - Use language like "traders appear to be positioning for", "market is pricing in", "anticipating", "ahead of expected"
        - Emphasize this is predictive/anticipatory movement, not reactive
        - Mention if this looks like insider positioning vs. sentiment shift
        
        Important: Frame this as markets moving AHEAD of news, not reacting to it. Traders are betting on future events.
        Complete all sentences - do not cut off mid-thought.
      `;

      const response = await generateAIText({
        prompt: analysisPrompt,
        temperature: 0.7,
        maxTokens: 500,
      });

      // Check if we got a valid response
      if (!response.content || response.content.trim() === '') {
        logger.error(`Empty response from ${config.provider} API`);
        throw new Error('AI service returned empty response');
      }

      const sourcesUsed = response.sourcesUsed || 0;
      const baseConfidence = Math.min(
        95,
        Math.max(40, args.seismoScore * 8 + Math.min(30, sourcesUsed * 3))
      );

      const allCitations = response.citations || [];

      // Store the analysis in the database
      const now = Date.now();
      const ONE_HOUR = 60 * 60 * 1000;

      await ctx.runMutation(internal.aiService.storeAnalysis, {
        movementId: args.movementId,
        eventId: args.eventId,
        explanation: response.content,
        sources: allCitations,
        confidence: Math.round(baseConfidence),
        category: args.category,
        generatedAt: now,
        expiresAt: now + ONE_HOUR,
        sourcesUsed: sourcesUsed,
      });

      return {
        success: true,
        analysis: {
          explanation: response.content,
          sources: allCitations,
          confidence: Math.round(baseConfidence),
          isValid: true,
          provider: response.provider,
          model: response.model,
        },
      };
    } catch (error) {
      logger.error('Failed to generate AI analysis:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});
