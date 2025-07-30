/**
 * 🧪 TEST MANUAL PARA VER OUTPUT DE PROMPTS
 * 
 * Este test te permite ver exactamente qué genera la función de prompts
 * sin mocks - usando datos reales (pero controlados)
 */

const AIService = require('../../../src/services/aiService');

// Mock OpenAI para controlar la respuesta pero ver el proceso real
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: 'shoot ur shot if i dont reply'
                  }
                }
              ]
            })
          }
        }
      };
    })
  };
});

// Mock database service
jest.mock('../../../src/services/databaseService', () => ({
  getAllChannels: jest.fn().mockResolvedValue([
    { name: 'Snap', prefix: 'Snαp;' },
    { name: 'Gram', prefix: 'Grαm;' },
    { name: 'OF', prefix: 'ОпIyfαns;' }
  ])
}));

describe('🔍 PROMPT OUTPUT INSPECTION', () => {
  
  beforeEach(() => {
    // Limpiar console para que se vean nuestros logs
    console.log = jest.fn();
    console.error = jest.fn();
  });

  it('📝 EXAMPLE 1: Generate Gram prompt for Lola', async () => {
    const result = await AIService.generatePrompt('Lola', 'gram', 'beautifulgirl123');
    
    // Mostrar el resultado completo
    console.log('\n🎯 === PROMPT GENERATION RESULT ===');
    console.log('📥 INPUT:');
    console.log('   Model: Lola');
    console.log('   Channel: gram'); 
    console.log('   Username: beautifulgirl123');
    console.log('\n📤 OUTPUT:');
    console.log('   Model:', result.model);
    console.log('   Channel:', result.channel);
    console.log('   Username:', result.username);
    console.log('   Visible Text:', result.visibleText);
    console.log('   Obfuscated Text:', result.obfuscatedText);
    console.log('   Timestamp:', result.timestamp);
    console.log('   Character Count:', result.visibleText.length);
    console.log('=================================\n');

    // Verificaciones
    expect(result.model).toBe('Lola');
    expect(result.channel).toBe('gram');
    expect(result.username).toBe('beautifulgirl123');
    expect(result.visibleText).toBe('shoot ur shot if i dont reply');
    expect(result.obfuscatedText).toBe('Grαm;beautifulgirl123 shoot ur shot if i dont reply');
    expect(result.visibleText.length).toBeLessThanOrEqual(40);
  });

  it('📝 EXAMPLE 2: Generate Snap prompt for Aura', async () => {
    const result = await AIService.generatePrompt('Aura', 'snap', 'hotgirl456');
    
    console.log('\n🎯 === SNAP PROMPT FOR AURA ===');
    console.log('📥 INPUT: Aura + snap + hotgirl456');
    console.log('📤 FINAL OUTPUT:', result.obfuscatedText);
    console.log('📝 VISIBLE PART:', result.visibleText);
    console.log('🔤 LENGTH:', result.visibleText.length, 'characters');
    console.log('===========================\n');

    expect(result.obfuscatedText).toContain('Snαp;hotgirl456');
    expect(result.obfuscatedText).toContain(result.visibleText);
  });

  it('📝 EXAMPLE 3: Generate OF prompt for Iris', async () => {
    const result = await AIService.generatePrompt('Iris', 'of', 'goddess789');
    
    console.log('\n🎯 === ONLYFANS PROMPT FOR IRIS ===');
    console.log('📥 INPUT: Iris + of + goddess789');
    console.log('📤 COMPLETE TEXT:', result.obfuscatedText);
    console.log('🔍 PREFIX USED: ОпIyfαns;');
    console.log('💬 AI GENERATED:', result.visibleText);
    console.log('===============================\n');

    expect(result.obfuscatedText).toStartWith('ОпIyfαns;goddess789');
    expect(result.channel).toBe('of');
  });

  it('📝 EXAMPLE 4: Test character limit enforcement', async () => {
    // Mock una respuesta muy larga de OpenAI
    const mockOpenAI = AIService.openai;
    mockOpenAI.chat.completions.create.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: 'this is a super long message that definitely exceeds forty characters and should be truncated'
          }
        }
      ]
    });

    const result = await AIService.generatePrompt('Ciara', 'gram', 'testuser');
    
    console.log('\n🎯 === CHARACTER LIMIT TEST ===');
    console.log('📥 LONG INPUT: "this is a super long message that definitely exceeds forty characters and should be truncated"');
    console.log('📏 ORIGINAL LENGTH: 94 characters');
    console.log('✂️  TRUNCATED TO:', result.visibleText);
    console.log('📏 FINAL LENGTH:', result.visibleText.length, 'characters');
    console.log('✅ WITHIN LIMIT:', result.visibleText.length <= 40 ? 'YES' : 'NO');
    console.log('===============================\n');

    expect(result.visibleText.length).toBeLessThanOrEqual(40);
    expect(result.visibleText).toBe('this is a super long message that defini');
  });

  it('📝 EXAMPLE 5: Test emoji and quote removal', async () => {
    // Mock respuesta con emojis y comillas
    const mockOpenAI = AIService.openai;
    mockOpenAI.chat.completions.create.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: '"send me memes" 😊😉🔥💕'
          }
        }
      ]
    });

    const result = await AIService.generatePrompt('Lola', 'snap', 'cleanuser');
    
    console.log('\n🎯 === CLEANING TEST ===');
    console.log('📥 DIRTY INPUT: "send me memes" 😊😉🔥💕');
    console.log('🧹 CLEANED OUTPUT:', result.visibleText);
    console.log('❌ REMOVED: quotes, emojis');
    console.log('✅ FINAL RESULT:', result.obfuscatedText);
    console.log('=======================\n');

    expect(result.visibleText).toBe('send me memes');
    expect(result.visibleText).not.toContain('"');
    expect(result.visibleText).not.toContain('😊');
    expect(result.visibleText).not.toContain('🔥');
  });

});