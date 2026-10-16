import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getActiveAIConfig } from '../convex/aiClient';

describe('AI Client Provider Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.AI_PROVIDER;
    delete process.env.GEMINI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CLAUDE_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns null if no AI API key is configured', () => {
    expect(getActiveAIConfig()).toBeNull();
  });

  it('detects Gemini if GEMINI_API_KEY is present', () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    const config = getActiveAIConfig();
    expect(config).not.toBeNull();
    expect(config?.provider).toBe('gemini');
    expect(config?.apiKey).toBe('test-gemini-key');
    expect(config?.model).toBe('gemini-2.5-flash');
  });

  it('detects Claude if ANTHROPIC_API_KEY is present', () => {
    process.env.ANTHROPIC_API_KEY = 'test-claude-key';
    const config = getActiveAIConfig();
    expect(config).not.toBeNull();
    expect(config?.provider).toBe('claude');
    expect(config?.apiKey).toBe('test-claude-key');
    expect(config?.model).toBe('claude-3-7-sonnet-latest');
  });

  it('honors AI_PROVIDER override when both keys are present', () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.ANTHROPIC_API_KEY = 'test-claude-key';

    process.env.AI_PROVIDER = 'claude';
    expect(getActiveAIConfig()?.provider).toBe('claude');

    process.env.AI_PROVIDER = 'gemini';
    expect(getActiveAIConfig()?.provider).toBe('gemini');
  });
});
