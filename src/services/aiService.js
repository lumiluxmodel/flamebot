const { OpenAI } = require('openai');
const config = require('../config');

class AIService {
    constructor() {
        // Initialize OpenAI client
        this.openai = new OpenAI({
            apiKey: config.openai.apiKey
        });
        
        // Caracteres invisibles para ofuscación
        this.tagChars = [
            '\u{E0308}', '\u{E0309}', '\u{E030A}', '\u{E030B}',
            '\u{E030C}', '\u{E030D}', '\u{E030E}', '\u{E030F}'
        ];
        
        this.prefixes = {
            snap: 'Snαp;',
            gram: 'Grαm;'
        };
    }

    /**
     * Generate text using OpenAI
     * @param {string} systemPrompt - System prompt for AI
     * @param {string} userPrompt - User prompt for AI
     * @returns {Promise<string>} Generated text
     */
    async generateText(systemPrompt, userPrompt, maxTokens = 80) {
        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.85,
                max_tokens: maxTokens
            });

            return response.choices[0].message.content.trim();
        } catch (error) {
            console.error('❌ OpenAI API error:', error.message);
            throw new Error('Failed to generate text with AI');
        }
    }

    /**
     * Obfuscate text with invisible characters
     * @param {string} text - Text to obfuscate
     * @param {number} numTags - Number of invisible tags per character
     * @returns {string} Obfuscated text
     */
    obfuscate(text, numTags) {
        let result = '';
        for (const char of text) {
            // Shuffle tag characters
            const shuffled = this.tagChars
                .sort(() => Math.random() - 0.5)
                .slice(0, numTags)
                .join('');
            result += char + shuffled;
        }
        return result;
    }

    /**
     * Generate a short Tinder prompt
     * @param {string} model - Model name (Aura, Lola, Iris)
     * @param {string} channel - Channel type (snap/gram)
     * @param {string} username - Username to include
     * @returns {Promise<Object>} Generated prompt data
     */
    async generatePrompt(model, channel, username) {
        // System prompt for short Tinder-style lines
        const systemPrompt = (
            "You are writing short, catchy Tinder profile prompts for a young girl. All responses must be lowercase, casual, and direct. " +
            "Tone should be flirty, teasing, and playful. Never robotic or poetic. These are meant to get guys to message her. " +
            "Keep punctuation light. No emojis. Just straight to the point. " +
            "Make sure the line is under 40 visible characters. Short is better. Must feel natural and like a real girl typed it."
        );

        // User prompt with examples
        const userPrompt = (
            "generate one line for a tinder profile prompt, lowercase casual tone. flirty. inviting. real. " +
            "It is HIGHLY important that the output is under 40 characters MAX. This is a HARD LIMIT and must never be exceeded.\n\n" +
            "examples:\n" +
            "shoot ur shot if ur the one\n" +
            "dont be shy i bite\n" +
            "shooters gon shoot\n" +
            "give it a shot and see\n" +
            "say hi i dont bite\n" +
            "do what u have to do\n" +
            "take me out tn pls\n" +
            "say hey mayb i say yes\n" +
            "there u go ur turn\n" +
            "balls in your court now"
        );

        // Generate AI text
        let aiText = await this.generateText(systemPrompt, userPrompt);
        
        // Enforce strict 40-char limit
        aiText = aiText.substring(0, 40).trim();

        // Create obfuscated output
        const prefixBlock = this.prefixes[channel] + username + " ";
        const obfPrefix = this.obfuscate(prefixBlock, 4);
        const obfBio = this.obfuscate(aiText, 1);
        const finalOutput = obfPrefix + obfBio;

        return {
            model,
            channel,
            username,
            visibleText: aiText,
            obfuscatedText: finalOutput,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Generate multiple Tinder bios with different personas
     * @param {number} count - Number of bios to generate
     * @returns {Promise<Array>} Array of generated bios
     */
    async generateBios(count = 1) {
        const systemPrompt = `
# 🔮 SYSTEM PROMPT: TINDER BIO AI — PSYCHOLOGY-BASED ENGAGEMENT GENERATOR

You are a Tinder bio copywriting AI trained to generate **emotionally compelling, curiosity-triggering bios** for female models. These bios are designed to drive users to **scroll the profile and discover a hidden CTA** (such as an Instagram or Snapchat prompt) located in the middle of the profile — **without breaking any platform rules** or explicitly naming outside platforms.

Your writing style mimics the voice of a **real girl texting her friend**: lowercase, vulnerable, messy, impulsive, emotional, soft, or chaotic — but always real. Every bio reads like the start of a personal story. The goal is to build **emotional connection + curiosity** in under 400 characters.

## 🎭 PERSONAS (auto-randomized per bio)
Each bio uses a different **vibe or persona**, including but not limited to:
- sad girl who just got dumped  
- impulsive baddie who makes chaotic choices  
- soft clingy girl new in town  
- mysterious loner who disappears  
- romantic with bad taste in men  
- spoiled sugar baby with a soft core  
- unbothered baddie with hidden loneliness  
- sweet girl masking pain with flirting  
- attention-seeking ex recovering from drama  
- too-much girl who knows it and leans in

## 🧠 CONVERSION PSYCHOLOGY TRIGGERS
Each bio incorporates psychological triggers like:
- Curiosity Gap
- Emotional Projection
- Validation Loop
- Relatability Hook
- Ego Challenge
- Reverse Psychology
- Scarcity/Urgency
- Vulnerability Bait

## ✏️ WRITING STYLE RULES
- All **lowercase**
- No hashtags, links, usernames, or platform names
- Uses casual slang: lol, idk, kinda, lowkey, fr, tbh, ngl
- Light emoji use (max 1 per bio, optional)
- No symbols (—, ~, etc.)
- Must **feel human**, not like a marketing tool

## 📏 OUTPUT FORMAT RULES
- Each bio must be **300 to 400 characters**
- Each bio must be **100% unique**
- Must include a **soft CTA** like:
  - "if u scroll a little…"
  - "there might be more down there"
  - "maybe u'll find something"
  - "look around a bit"
  - "middle of my profile"
  - "if u're curious, keep going"`;

        const userPrompt = `Generate ${count} unique Tinder bios. Each bio should:
- Be between 300-400 characters
- Use a different emotional angle and persona
- Include a subtle CTA to explore the profile
- Feel authentic and human
- All lowercase, casual tone

Only output the bios in plain text format (no numbers or bullets), separated by double line breaks.`;

        const response = await this.generateText(systemPrompt, userPrompt, 500 * count);
        
        // Split bios by double line breaks
        const bios = response.split(/\n\n+/).filter(bio => bio.trim().length > 0);
        
        return bios.map((bio, index) => ({
            id: index + 1,
            text: bio.trim(),
            characterCount: bio.trim().length,
            timestamp: new Date().toISOString()
        }));
    }
}

module.exports = new AIService();