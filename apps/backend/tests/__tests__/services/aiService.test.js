const AIService = require('../../../src/services/aiService');

// Mock OpenAI
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: jest.fn()
          }
        }
      };
    })
  };
});

// Mock database service
jest.mock('../../../src/services/databaseService', () => ({
  getAllChannels: jest.fn()
}));

describe('AIService', () => {
  let mockOpenAICreate;
  let mockGetAllChannels;

  beforeEach(() => {
    jest.clearAllMocks();
    // Get references to mocked functions
    mockOpenAICreate = AIService.openai.chat.completions.create;
    mockGetAllChannels = require('../../../src/services/databaseService').getAllChannels;
  });

  describe('generateText', () => {
    it('should generate text using OpenAI API', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'shoot ur shot if i dont reply'
            }
          }
        ]
      };
      mockOpenAICreate.mockResolvedValueOnce(mockResponse);

      const result = await AIService.generateText(
        'system prompt',
        'user prompt',
        60
      );

      expect(mockOpenAICreate).toHaveBeenCalledWith({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'system prompt' },
          { role: 'user', content: 'user prompt' }
        ],
        temperature: 0.95,
        max_tokens: 60
      });

      expect(result).toBe('shoot ur shot if i dont reply');
    });

    it('should fallback to gpt-3.5-turbo if gpt-4o is not available', async () => {
      const modelNotFoundError = new Error('model_not_found');
      mockOpenAICreate
        .mockRejectedValueOnce(modelNotFoundError)
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: 'send me memes'
              }
            }
          ]
        });

      const result = await AIService.generateText(
        'system prompt',
        'user prompt'
      );

      expect(mockOpenAICreate).toHaveBeenCalledTimes(2);
      expect(result).toBe('send me memes');
    });

    it('should handle API errors gracefully', async () => {
      const apiError = new Error('Insufficient quota');
      apiError.message = 'insufficient_quota';
      mockOpenAICreate.mockRejectedValueOnce(apiError);

      await expect(
        AIService.generateText('system', 'user')
      ).rejects.toThrow('OpenAI account has insufficient quota');
    });

    it('should handle rate limit errors', async () => {
      const rateLimitError = new Error('429 Rate Limit');
      mockOpenAICreate.mockRejectedValueOnce(rateLimitError);

      await expect(
        AIService.generateText('system', 'user')
      ).rejects.toThrow('OpenAI rate limit exceeded');
    });
  });

  describe('obfuscate', () => {
    it('should obfuscate text with invisible characters', () => {
      const text = 'test';
      const numTags = 2;
      
      const result = AIService.obfuscate(text, numTags);
      
      // Should have original text plus invisible characters
      expect(result.length).toBeGreaterThan(text.length);
      // Should contain all original characters
      expect(result).toMatch(/t.*e.*s.*t/);
    });

    it('should use random tag characters', () => {
      const text = 'a';
      const results = new Set();
      
      // Generate multiple obfuscations
      for (let i = 0; i < 10; i++) {
        results.add(AIService.obfuscate(text, 3));
      }
      
      // Should have different results due to randomization
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe('loadChannelPrefixes', () => {
    it('should load channel prefixes from database', async () => {
      const mockChannels = [
        { name: 'Snap', prefix: 'Snαp;' },
        { name: 'Gram', prefix: 'Grαm;' },
        { name: 'OF', prefix: 'ОпIyfαns;' }
      ];
      mockGetAllChannels.mockResolvedValueOnce(mockChannels);

      await AIService.loadChannelPrefixes();

      expect(mockGetAllChannels).toHaveBeenCalled();
      expect(AIService.prefixes).toEqual({
        snap: 'Snαp;',
        gram: 'Grαm;',
        of: 'ОпIyfαns;'
      });
    });

    it('should use fallback prefixes if database fails', async () => {
      mockGetAllChannels.mockRejectedValueOnce(new Error('DB Error'));

      await AIService.loadChannelPrefixes();

      expect(AIService.prefixes).toEqual({
        snap: 'Snαp;',
        gram: 'Grαm;',
        of: 'ОпIyfαns;'
      });
    });
  });

  describe('generatePrompt', () => {
    beforeEach(() => {
      // Set up default prefixes
      AIService.prefixes = {
        snap: 'Snαp;',
        gram: 'Grαm;',
        of: 'ОпIyfαns;'
      };
    });

    it('should generate a prompt with correct format', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'shoot ur shot if i dont reply'
            }
          }
        ]
      });

      const result = await AIService.generatePrompt('Lola', 'snap', 'testuser');

      expect(result).toMatchObject({
        model: 'Lola',
        channel: 'snap',
        username: 'testuser',
        visibleText: 'shoot ur shot if i dont reply',
        obfuscatedText: 'Snαp;testuser shoot ur shot if i dont reply'
      });
      expect(result.timestamp).toBeDefined();
    });

    it('should enforce 40 character limit', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'this is a very long message that should be truncated to exactly forty characters'
            }
          }
        ]
      });

      const result = await AIService.generatePrompt('Aura', 'gram', 'user123');

      expect(result.visibleText.length).toBeLessThanOrEqual(40);
      expect(result.visibleText).toBe('this is a very long message that should');
    });

    it('should remove quotes and emojis', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: '"send me memes" 😊😉'
            }
          }
        ]
      });

      const result = await AIService.generatePrompt('Iris', 'of', 'myuser');

      expect(result.visibleText).toBe('send me memes');
      expect(result.visibleText).not.toContain('"');
      expect(result.visibleText).not.toContain('😊');
      expect(result.visibleText).not.toContain('😉');
    });

    it('should load prefixes if not already loaded', async () => {
      AIService.prefixes = {};
      mockGetAllChannels.mockResolvedValueOnce([
        { name: 'Snap', prefix: 'TestPrefix;' }
      ]);
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'test message'
            }
          }
        ]
      });

      await AIService.generatePrompt('Ciara', 'snap', 'user');

      expect(mockGetAllChannels).toHaveBeenCalled();
    });
  });

  describe('generateBios', () => {
    it('should generate multiple bios', async () => {
      const mockBiosResponse = `i'll be the reason you forget her name
you'll swipe right then never be able to swipe again
i'm not the one you settle down with`;

      mockOpenAICreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: mockBiosResponse
            }
          }
        ]
      });

      const result = await AIService.generateBios(3);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        id: 1,
        text: "i'll be the reason you forget her name",
        characterCount: 38
      });
      expect(result[1]).toMatchObject({
        id: 2,
        text: "you'll swipe right then never be able to swipe again",
        characterCount: 52
      });
      expect(result[2]).toMatchObject({
        id: 3,
        text: "i'm not the one you settle down with",
        characterCount: 36
      });

      // Check timestamps
      result.forEach(bio => {
        expect(bio.timestamp).toBeDefined();
        expect(new Date(bio.timestamp)).toBeInstanceOf(Date);
      });
    });

    it('should filter out empty bios', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: `valid bio here

              
              another valid bio`
            }
          }
        ]
      });

      const result = await AIService.generateBios(2);

      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('valid bio here');
      expect(result[1].text).toBe('another valid bio');
    });

    it('should handle single bio generation', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: "you'll meet girls after me and wonder why"
            }
          }
        ]
      });

      const result = await AIService.generateBios(1);

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe("you'll meet girls after me and wonder why");
    });
  });

  describe('API Integration Tests', () => {
    it('should generate a complete prompt workflow', async () => {
      // This tests the full workflow of generating a prompt
      AIService.prefixes = {}; // Clear prefixes to force loading
      mockGetAllChannels.mockResolvedValueOnce([
        { name: 'Snap', prefix: 'Snαp;' }
      ]);
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'incase im offline'
            }
          }
        ]
      });

      const result = await AIService.generatePrompt('Lola', 'snap', 'username123');

      // Verify the complete output
      expect(result).toEqual({
        model: 'Lola',
        channel: 'snap',
        username: 'username123',
        visibleText: 'incase im offline',
        obfuscatedText: 'Snαp;username123 incase im offline',
        timestamp: expect.any(String)
      });

      // Verify the output format
      expect(result.obfuscatedText).toMatch(/^Snαp;username123 /);
      expect(result.visibleText.length).toBeLessThanOrEqual(40);
    });
  });
});