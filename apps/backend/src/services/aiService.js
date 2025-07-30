const { OpenAI } = require("openai");
const config = require("../config");
const { channelStrategyService } = require("./channelStrategyService");

class AIService {
  constructor() {
    // Validate OpenAI API key on initialization
    if (!config.openai.apiKey) {
      console.error("⚠️  Warning: OpenAI API key not configured");
    }

    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });

    // Caracteres invisibles para ofuscación
    this.tagChars = [
      "\u{E0308}",
      "\u{E0309}",
      "\u{E030A}",
      "\u{E030B}",
      "\u{E030C}",
      "\u{E030D}",
      "\u{E030E}",
      "\u{E030F}",
    ];

    // Prefixes will be loaded dynamically from database
    this.prefixes = {};
  }

  /**
   * Obfuscate text by adding invisible Unicode characters
   * @param {string} text - Text to obfuscate
   * @param {number} numTags - Number of invisible chars to add after each character
   * @returns {string} Obfuscated text
   */
  obfuscateText(text, numTags = 2) {
    let obfuscated = '';
    
    for (let char of text) {
      obfuscated += char;
      
      // Add random invisible characters after each visible character
      for (let i = 0; i < numTags; i++) {
        const randomTag = this.tagChars[Math.floor(Math.random() * this.tagChars.length)];
        obfuscated += randomTag;
      }
    }
    
    return obfuscated;
  }

  /**
   * Generate text using OpenAI
   * @param {string} systemPrompt - System prompt for AI
   * @param {string} userPrompt - User prompt for AI
   * @returns {Promise<string>} Generated text
   */
  async generateText(systemPrompt, userPrompt, maxTokens = 60) {
    try {
      console.log("🤖 Calling OpenAI API...");

      // Try with gpt-4o first to match Python code
      let model = "gpt-4o";

      try {
        const response = await this.openai.chat.completions.create({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.95,
          max_tokens: maxTokens,
        });

        console.log("✅ OpenAI API call successful");
        return response.choices[0].message.content.trim();
      } catch (firstError) {
        // If gpt-4o fails, try gpt-3.5-turbo
        if (firstError.message.includes("model_not_found")) {
          console.log("⚠️  gpt-4o not available, trying gpt-3.5-turbo...");
          model = "gpt-3.5-turbo";

          const response = await this.openai.chat.completions.create({
            model: model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.95,
            max_tokens: maxTokens,
          });

          return response.choices[0].message.content.trim();
        }
        throw firstError;
      }
    } catch (error) {
      console.error("❌ OpenAI API error:", error.message);

      // Provide more detailed error information
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }

      // Throw a more descriptive error
      if (error.message.includes("401")) {
        throw new Error(
          "Invalid OpenAI API key. Please check your OPENAI_API_KEY in .env"
        );
      } else if (error.message.includes("429")) {
        throw new Error(
          "OpenAI rate limit exceeded. Please wait a moment and try again"
        );
      } else if (error.message.includes("insufficient_quota")) {
        throw new Error(
          "OpenAI account has insufficient quota. Please add credits to your account"
        );
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
    let result = "";
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
   * Load channel prefixes from database
   * @returns {Promise<void>}
   */
  async loadChannelPrefixes() {
    try {
      const databaseService = require('./databaseService');
      const channels = await databaseService.getAllChannels();
      
      // Build prefixes object from database
      this.prefixes = {};
      channels.forEach(channel => {
        this.prefixes[channel.name.toLowerCase()] = channel.prefix;
      });
      
      console.log('✅ Loaded channel prefixes from database:', this.prefixes);
    } catch (error) {
      console.error('❌ Failed to load channel prefixes from database:', error.message);
      // Fallback to default prefixes
      this.prefixes = {
        snap: "Snαp;",
        gram: "Grαm;",
        of: "ОпIyfαns;"
      };
    }
  }

  /**
   * Generate a short Tinder prompt
   * @param {string} model - Model name (Aura, Lola, Iris, Ciara)
   * @param {string} channel - Channel type (snap/gram/of)
   * @param {string} username - Username to include
   * @returns {Promise<Object>} Generated prompt data
   */
  async generatePrompt(model, channel, username) {
    console.log(
      `🎨 Generating prompt for ${model}/${channel} with username: ${username}`
    );

    // Load prefixes if not already loaded
    if (Object.keys(this.prefixes).length === 0) {
      await this.loadChannelPrefixes();
    }

    // System prompt - matching Python script exactly
    const systemPrompt =
      "you are writing short, casual, inviting lines meant to appear after someone finds a hidden social handle. " +
      "tone is playful, easygoing, and sounds like a real hot girl encouraging a dm or a shot. " +
      "all lowercase, no robotic or poetic language, less than 40 characters. " +
      "no hashtags, no emojis. sound natural and direct, as if she's telling someone to message or shoot their shot if she doesn't reply.";

    // User prompt - matching Python script exactly
    const userPrompt =
      "generate one line in lowercase casual tone, under 40 characters max. " +
      "it must feel like a real girl inviting someone to dm her or shoot their shot if she doesn't reply. no hashtags, no emojis, no extra punctuation. " +
      "examples:\n" +
      "incase i dont answer\n" +
      "shoot ur shot if i dont reply\n" +
      "if i dont reply, hmu\n" +
      "shoot ur shot haha\n" +
      "send me memes\n" +
      "send me something funny\n" +
      "incase im offline\n" +
      "always online hmu";

    // Generate AI text
    console.log("   Calling OpenAI API...");
    let aiText;
    try {
      aiText = await this.generateText(systemPrompt, userPrompt);
      console.log(`   Generated text: "${aiText}"`);
    } catch (error) {
      console.error("   Failed to generate text:", error.message);
      throw error;
    }

    // Use channel strategy for text formatting and validation
    console.log("   Using channel strategy for formatting...");
    
    try {
      // First validate the generated text
      const validation = await channelStrategyService.validateText(channel, aiText);
      if (!validation.isValid) {
        console.warn(`   Text validation warning: ${validation.error}`);
      }

      // Format text using channel strategy
      const finalOutput = await channelStrategyService.formatText(channel, aiText, username);
      
      // Apply obfuscation with invisible Unicode characters
      const obfuscatedOutput = this.obfuscateText(finalOutput);
      
      console.log(`   Formatted output: "${finalOutput}"`);
      console.log(`   Obfuscated output: "${obfuscatedOutput}"`);
      
      return {
        model,
        channel,
        username,
        visibleText: aiText,
        obfuscatedText: obfuscatedOutput,
        timestamp: new Date().toISOString(),
      };
      
    } catch (strategyError) {
      console.warn(`   Channel strategy error: ${strategyError.message}, falling back to legacy method`);
      
      // Fallback to legacy method if strategy fails
      // Load prefixes if not already loaded
      if (Object.keys(this.prefixes).length === 0) {
        await this.loadChannelPrefixes();
      }
      
      // Legacy formatting
      aiText = aiText.substring(0, 40).trim();
      aiText = aiText
        .replace(/["""'']/g, "")
        .replace(/😉|😊|😎|🎯|💕|❤️|🔥/g, "")
        .trim();

      const prefixBlock = this.prefixes[channel] + username + " ";
      const finalOutput = prefixBlock + aiText;
      
      // Apply obfuscation with invisible Unicode characters
      const obfuscatedOutput = this.obfuscateText(finalOutput);
      
      console.log("   ✅ Prompt generation complete (legacy fallback)");

      return {
        model,
        channel,
        username,
        visibleText: aiText,
        obfuscatedText: obfuscatedOutput,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Generate multiple Tinder bios with OnlyFans conversion strategy
   * @param {number} count - Number of bios to generate
   * @returns {Promise<Array>} Array of generated bios
   */
  async generateBios(count = 1) {
    const systemPrompt = `**Prompt:**
  
  You are a bio-writing assistant trained to generate Tinder bios that subtly appeal to the male gaze using a soft, seductive tone without being explicit. Your goal is to create bios that feel casual, teasing, and naturally alluring — the kind that make a guy pause and keep reading or scrolling.
  
  **Rules:**
  - Each bio must be **between 80-100 characters**
  - Do **not** include any numbers, hashtags, or special symbols such as hyphens and dashes (besides emojis)
  - Each bio must feel like it was written by a confident, attractive woman who knows the effect she has
  - Appeal should feel **effortless and suggestive**, never try-hard or explicit
  - Use **one emoji per line**, max of **two**
  - Be in first person talking about herself
  - Each output must stand alone, no need for numbering
  - Style must feel **casual**, lowercase, first-person
  - Do **not** include quotation marks or bullet points
  - All bios must be structurally and tonally different from each other
  - DO NOT repeat structure or phrasing
  - After generating bios, output ONLY the bios. No commentary or extra explanation
  
  **Examples to emulate:**
  
  i'll be the reason you forget her name and remember mine every time you try to move on
  you'll swipe right then never be able to swipe again without thinking about me
  i'm not the one you settle down with, i'm the one you never get over
  you'll meet girls after me and wonder why none of them make you feel like this
  you'll open this app tomorrow hoping to find me again and you won't
  i'm the kind of match that ruins your appetite for normal
  your next relationship will suffer because you couldn't stop thinking about this
  you'll stare too long and realize you're already invested in someone who hasn't replied
  i'm the one you text late just to feel something again
  you'll try to unmatch and realize curiosity already turned into obsession`;

    const userPrompt = `${count}`;

    // El resto del código permanece igual
    const response = await this.generateText(
      systemPrompt,
      userPrompt,
      600 * count
    );

    // Split bios by double line breaks or single line breaks
    const bios = response.split(/\n+/).filter((bio) => bio.trim().length > 0);

    return bios.map((bio, index) => ({
      id: index + 1,
      text: bio.trim(),
      characterCount: bio.trim().length,
      timestamp: new Date().toISOString(),
    }));
  }
}

module.exports = new AIService();
