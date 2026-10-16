import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Sync Kalshi events and markets every 1 minute
crons.interval(
  'sync kalshi events',
  { minutes: 1 },
  internal.kalshiActions.syncKalshiEvents
);

// Update materialized scores every 1 minute
crons.interval(
  'update scores_lite',
  { minutes: 1 },
  internal.scoring.updateScoresLite
);

// Update market sync priorities every 5 minutes
crons.interval(
  'update market priorities',
  { minutes: 5 },
  internal.prioritization.updateAllPriorities
);

// Clean up old data daily at 2 AM UTC
crons.daily(
  'cleanup old data',
  { hourUTC: 2, minuteUTC: 0 },
  internal.cleanup.cleanupOldData
);

// Generate market summary every 30 minutes
crons.interval(
  'generate market summary',
  { minutes: 30 },
  internal.marketSummary.generateSummaryCron
);

export default crons;
