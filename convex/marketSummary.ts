import { v } from 'convex/values';
import {
  query,
  action,
  internalAction,
  internalMutation,
  ActionCtx,
} from './_generated/server';
import { api, internal } from './_generated/api';
import { logger } from '../lib/logger';
import { generateAIText, getActiveAIConfig } from './aiClient';

export type MarketSummaryResult = {
  success: boolean;
  error?: string;
  cached?: boolean;
  summary?: {
    summary: string;
    totalMovements: number;
    extremeMovements: number;
    topCategories: string[];
    generatedAt: number;
  };
};

// Query to get cached market summary
export const getSummary = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get the most recent summary
    const summary = await ctx.db.query('marketSummary').order('desc').first();

    if (!summary) {
      return null;
    }

    // Check if it's still valid (1 hour cache)
    const ONE_HOUR = 60 * 60 * 1000;
    const isValid = now - summary.generatedAt < ONE_HOUR;
    const minutesAgo = Math.floor((now - summary.generatedAt) / 60000);

    return {
      ...summary,
      isValid,
      minutesAgo,
      isStale: !isValid,
    };
  },
});

// Helper function to generate market summary
async function executeGenerateSummary(
  ctx: ActionCtx
): Promise<MarketSummaryResult> {
  const config = getActiveAIConfig();
  if (!config) {
    logger.error(
      'No AI provider configured for market summary (set GEMINI_API_KEY or ANTHROPIC_API_KEY)'
    );
    return { success: false, error: 'AI API key not configured' };
  }

  try {
    logger.info(
      `Generating market summary using ${config.provider} (${config.model})...`
    );

    // Get recent high-impact movements (last 24 hours)
    const recentMovements = await ctx.runQuery(
      api.movements.getRecentHighImpact
    );

    if (!recentMovements || recentMovements.length === 0) {
      logger.info('No recent movements to summarize');
      return { success: false, error: 'No recent market activity' };
    }

    // Prepare context for summary
    const movementsContext = recentMovements
      .slice(0, 10) // Top 10 movements
      .map(
        (m: any) =>
          `- ${m.title}: ${m.previousValue}% → ${m.currentValue}% (${m.seismoScore?.toFixed(1)} intensity)`
      )
      .join('\n');

    const prompt = `Based on these recent prediction market movements, write a brief 2-3 sentence summary of what traders are focused on:

${movementsContext}

Summary:`;

    const result = await generateAIText({
      prompt,
      temperature: 0.7,
      maxTokens: 500,
    });

    const summary = result.content;

    if (!summary || summary.trim() === '') {
      logger.error('Empty summary content');
      return {
        success: true,
        summary: {
          summary:
            'Market activity is showing mixed signals across political and economic sectors. Traders are closely monitoring upcoming elections and policy decisions.',
          totalMovements: recentMovements.length,
          extremeMovements: recentMovements.filter(
            (m: any) => m.seismoScore && m.seismoScore >= 7.5
          ).length,
          topCategories: [
            ...new Set(
              recentMovements.map((m: any) => m.category).filter(Boolean)
            ),
          ].slice(0, 3) as string[],
          generatedAt: Date.now(),
        },
      };
    }

    // Calculate some stats
    const totalMovements = recentMovements.length;
    const extremeMovements = recentMovements.filter(
      (m: any) => m.seismoScore && m.seismoScore >= 7.5
    ).length;
    const categories = [
      ...new Set(recentMovements.map((m: any) => m.category).filter(Boolean)),
    ] as string[];

    // Store the summary
    const now = Date.now();
    await ctx.runMutation(internal.marketSummary.storeSummary, {
      summary,
      totalMovements,
      extremeMovements,
      topCategories: categories.slice(0, 3),
      generatedAt: now,
    });

    return {
      success: true,
      summary: {
        summary,
        totalMovements,
        extremeMovements,
        topCategories: categories.slice(0, 3),
        generatedAt: now,
      },
    };
  } catch (error) {
    logger.error('Failed to generate market summary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Internal action to generate market summary
export const generateSummary = internalAction({
  args: {},
  handler: async (ctx): Promise<MarketSummaryResult> => {
    return await executeGenerateSummary(ctx);
  },
});

// Mutation to store summary
export const storeSummary = internalMutation({
  args: {
    summary: v.string(),
    totalMovements: v.number(),
    extremeMovements: v.number(),
    topCategories: v.array(v.string()),
    generatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('marketSummary', args);
  },
});

// Internal action for cron job - generates summary unconditionally
export const generateSummaryCron = internalAction({
  args: {},
  handler: async (ctx): Promise<MarketSummaryResult> => {
    logger.info('[Cron] Generating market summary...');
    const result = await executeGenerateSummary(ctx);
    logger.info(
      '[Cron] Market summary generation result:',
      result.success ? 'success' : 'failed'
    );
    return result;
  },
});

// Action to refresh summary if needed (kept for backward compatibility)
export const refreshIfNeeded = action({
  args: {},
  handler: async (ctx): Promise<MarketSummaryResult> => {
    const current = await ctx.runQuery(api.marketSummary.getSummary);

    // Generate if no summary exists or if it's stale (> 30 minutes old)
    const THIRTY_MINUTES = 30 * 60 * 1000;
    const now = Date.now();

    if (!current || now - current.generatedAt > THIRTY_MINUTES) {
      return await executeGenerateSummary(ctx);
    }

    return { success: true, cached: true, summary: current };
  },
});
