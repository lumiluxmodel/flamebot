const { OpenAI } = require('openai');
const config = require('../config');

class AIService {
    constructor() {
        // Validate OpenAI API key on initialization
        if (!config.openai.apiKey) {
            console.error('⚠️  Warning: OpenAI API key not configured');
        }
        
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
            snap: 'Sn\u{03B1}p;',  // α griega
            gram: 'Gr\u{03B1}m;',  // α griega
            of: '\u{041E}\u{043F}Iyf\u{03B1}ns;'  // Matching Python: ОпIyfαns;
        };
    }

    /**
     * Generate text using OpenAI
     * @param {string} systemPrompt - System prompt for AI
     * @param {string} userPrompt - User prompt for AI
     * @returns {Promise<string>} Generated text
     */
    async generateText(systemPrompt, userPrompt, maxTokens = 60) {
        try {
            console.log('🤖 Calling OpenAI API...');
            
            // Try with gpt-4o first to match Python code
            let model = "gpt-4o";
            
            try {
                const response = await this.openai.chat.completions.create({
                    model: model,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    temperature: 0.95,
                    max_tokens: maxTokens
                });

                console.log('✅ OpenAI API call successful');
                return response.choices[0].message.content.trim();
                
            } catch (firstError) {
                // If gpt-4o fails, try gpt-3.5-turbo
                if (firstError.message.includes('model_not_found')) {
                    console.log('⚠️  gpt-4o not available, trying gpt-3.5-turbo...');
                    model = "gpt-3.5-turbo";
                    
                    const response = await this.openai.chat.completions.create({
                        model: model,
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: userPrompt }
                        ],
                        temperature: 0.95,
                        max_tokens: maxTokens
                    });
                    
                    return response.choices[0].message.content.trim();
                }
                throw firstError;
            }
            
        } catch (error) {
            console.error('❌ OpenAI API error:', error.message);
            
            // Provide more detailed error information
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            
            // Throw a more descriptive error
            if (error.message.includes('401')) {
                throw new Error('Invalid OpenAI API key. Please check your OPENAI_API_KEY in .env');
            } else if (error.message.includes('429')) {
                throw new Error('OpenAI rate limit exceeded. Please wait a moment and try again');
            } else if (error.message.includes('insufficient_quota')) {
                throw new Error('OpenAI account has insufficient quota. Please add credits to your account');
            } else {
                throw new Error(`OpenAI API error: ${error.message}`);
            }
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
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            // Shuffle tag characters and select numTags
            const shuffled = [...this.tagChars]
                .sort(() => Math.random() - 0.5)
                .slice(0, numTags);
            
            // Add the character followed by the invisible tags
            result += char;
            for (const tag of shuffled) {
                result += tag;
            }
        }
        return result;
    }

    /**
     * Generate a short Tinder prompt
     * @param {string} model - Model name (Aura, Lola, Iris, Ciara)
     * @param {string} channel - Channel type (snap/gram/of)
     * @param {string} username - Username to include
     * @returns {Promise<Object>} Generated prompt data
     */
    async generatePrompt(model, channel, username) {
        console.log(`🎨 Generating prompt for ${model}/${channel} with username: ${username}`);
        
        // System prompt for "discovery vibe" - matching Python code exactly
        const systemPrompt = (
            "You are writing short, casual Tinder-style prompts that appear after someone has stumbled across a hidden social handle. " +
            "The tone is playful, low effort, and sounds like a hot girl reacting to being 'found' or 'revealed.' " +
            "All responses must be lowercase and short — less than 40 characters. " +
            "The prompt should feel like the viewer just discovered a hidden Snap or OnlyFans tag. " +
            "Avoid sounding robotic, poetic, or flirty. Be natural, relaxed, and a bit cheeky. " +
            "Never use emojis. No punctuation unless it feels natural. These lines come after a snap; or onlyfans; username, so they should sound like the girl is reacting to that moment of discovery."
        );

        // User prompt with discovery examples - matching Python code exactly
        const userPrompt = (
            "generate one line in lowercase casual tone. imagine someone just found a hidden social media handle " +
            "(like snap;username or onlyfans;username) and now the girl is reacting in a playful, low-key, or cheeky way. " +
            "the line must sound natural, like something a real hot girl would type right after being 'seen' or 'discovered'.\n\n" +
            "it is HIGHLY important that the line is under 40 characters MAX. this is a HARD LIMIT. it can be as short as 20–30 chars. short is better.\n\n" +
            "examples:\n" +
            "oh wow look what u found\n" +
            "guess the secrets out now\n" +
            "now what, come say hi\n" +
            "well will u look at that\n" +
            "uh oh u found it huh\n" +
            "oh, that must be new\n" +
            "this feels illegal lol\n" +
            "not hidden anymore i guess\n" +
            "there u go u got it\n" +
            "who leaked that haha\n" +
            "take a peak, u wont regret it\n" +
            "oh wow look what u found\n" +
            "now what, come say hi\n" +
            "say hi im online\n" +
            "uh oh what do we got here\n" +
            "well will you look at that\n" +
            "oh, that must be new\n" +
            "who put this here haha\n" +
            "u found the treasure\n" +
            "oh look u found it\n" +
            "look at what u found haha\n" +
            "you found my secret stash huh\n" +
            "well hello there stranger\n" +
            "uh oh busted\n" +
            "how did u even find this"
        );

        // Generate AI text
        console.log('   Calling OpenAI API...');
        let aiText;
        try {
            aiText = await this.generateText(systemPrompt, userPrompt);
            console.log(`   Generated text: "${aiText}"`);
        } catch (error) {
            console.error('   Failed to generate text:', error.message);
            throw error;
        }
        
        // Enforce strict 40-char limit and clean text
        aiText = aiText.substring(0, 40).trim();
        
        // Remove quotes and emojis to match Python behavior
        aiText = aiText.replace(/["""'']/g, '').replace(/😉|😊|😎|🎯|💕|❤️|🔥/g, '').trim();
        
        console.log(`   Cleaned to: "${aiText}" (${aiText.length} chars)`);

        // Create obfuscated output
        console.log('   Creating obfuscated output...');
        const prefixBlock = this.prefixes[channel] + username + " ";
        const obfPrefix = this.obfuscate(prefixBlock, 4);
        const obfBio = this.obfuscate(aiText, 1);
        const finalOutput = obfPrefix + obfBio;
        
        console.log('   ✅ Prompt generation complete');

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
     * Generate multiple Tinder bios with OnlyFans conversion strategy
     * @param {number} count - Number of bios to generate
     * @returns {Promise<Array>} Array of generated bios
     */
    async generateBios(count = 1) {
        const systemPrompt = `# 🎯 SYSTEM PROMPT: TINDER LONG-FORM BIO GENERATOR FOR ONLYFANS CONVERSION

You are a high-conversion bio generator trained to write **long-form Tinder bios** designed to funnel attention toward the **middle of the profile**, where the user's OnlyFans prompt is located.

The bios are crafted to **build curiosity**, **trigger obsession**, or **emotionally manipulate** the viewer into scrolling deeper. Your tone is seductive, polarizing, vulnerable, bratty, voyeuristic, or chaotic — depending on the emotional structure used.

---

## 💡 GOAL

Each bio should:
- Sound like a **real girl venting or oversharing** her feelings  
- Be designed to **spark voyeurism, emotional tension, or confusion**  
- Encourage scrolling to the **middle of the profile**, **without directly mentioning OnlyFans**  
- Read like a **confession, tease, trap, or emotional damage warning**  
- Maximize **obsession, guilt, validation loops, and erotic triggers**

---

## ✏️ FORMAT RULES

- Length must be between **425–475 characters**
- Use **casual, lowercase writing** with real-girl tone  
- DO NOT use **hyphens** (Tinder often flags bios with hyphens)
- Do not include banned emojis (like 👻 or 📸)
- Emojis are optional and should be used sparingly (e.g. 😌, 😈, 😭 if it fits tone)
- Include casual lingo: *lol, i guess, whatever, maybe, etc*
- Use **unfiltered language** that feels human, not scripted

---

## ⚠️ CONTENT STRATEGY

Use any of the following conversion psychology angles:

| Framework             | Description                                                                 |
|-----------------------|-----------------------------------------------------------------------------|
| **Voyeur Trigger**     | Makes them feel like they're seeing something they shouldn't                |
| **Emotional Damage**   | Builds desire through pain, sadness, or past wounds                        |
| **Validation Craving** | Posts are about being seen, watched, noticed                               |
| **Ego Bait**           | Challenges the viewer subtly, dares them to keep scrolling                 |
| **Bratty Filter**      | Warns the wrong ones off while seducing the curious                        |
| **Erotic Overshare**   | Confession of behavior that feels vulnerable and hot                       |

Every bio should lead to this conclusion:  
👉 *There's something deeper in the profile worth scrolling for*

---

## ✅ EXAMPLES

(Do not copy these — only use them as style references)

i say i don't care who watches but i always notice. i see the views go up and i pretend it doesn't mean anything, but sometimes i post just to feel seen. i tell myself it's harmless but i think i like when people imagine things i don't say. if u're going to scroll, do it properly.

they say i should tone it down, stop oversharing, post less. i say maybe they should stop watching. but they don't. no one ever really stops. if u're still reading, u already know u're going to scroll. so go. pretend u're not curious later.

i don't need to be understood, i need to be watched. i need someone to notice the parts of me i post on purpose and pretend are accidental. the people who get it always scroll. the ones who don't never matter. i left something down there. u either see it or u miss it.

---

## 🔁 INPUT FORMAT

The only user input is a number, like:

5

When the user enters a number, generate **that many bios** using the rules above.

---

## 🔄 OUTPUT FORMAT

- Output only the bios  
- No numbers, no labels  
- Each bio on a **new line**, plain text  
- No bullet points, no quotes, no headers

---

Now wait for the user to input how many bios they want.`;

        const userPrompt = `${count}`;

        const response = await this.generateText(systemPrompt, userPrompt, 600 * count);
        
        // Split bios by double line breaks or single line breaks
        const bios = response.split(/\n+/).filter(bio => bio.trim().length > 0);
        
        return bios.map((bio, index) => ({
            id: index + 1,
            text: bio.trim(),
            characterCount: bio.trim().length,
            timestamp: new Date().toISOString()
        }));
    }
}

module.exports = new AIService();