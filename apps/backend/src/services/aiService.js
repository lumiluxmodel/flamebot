const { OpenAI } = require("openai");
const config = require("../config");

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

    this.prefixes = {
      snap: "Sn\u{03B1}p;", // α griega
      gram: "Gr\u{03B1}m;", // α griega
      of: "\u{041E}\u{043F}Iyf\u{03B1}ns;", // Matching Python: ОпIyfαns;
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

    // System prompt for "discovery vibe" - matching Python code exactly
    const systemPrompt =
      "You are writing short, casual Tinder-style prompts that appear after someone has stumbled across a hidden social handle. " +
      "The tone is playful, low effort, and sounds like a hot girl reacting to being 'found' or 'revealed.' " +
      "All responses must be lowercase and short — less than 40 characters. " +
      "The prompt should feel like the viewer just discovered a hidden Snap or OnlyFans tag. " +
      "Avoid sounding robotic, poetic, or flirty. Be natural, relaxed, and a bit cheeky. " +
      "Never use emojis. No punctuation unless it feels natural. These lines come after a snap; or onlyfans; username, so they should sound like the girl is reacting to that moment of discovery.";

    // User prompt with discovery examples - matching Python code exactly
    const userPrompt =
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
      "how did u even find this";

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

    // Enforce strict 40-char limit and clean text
    aiText = aiText.substring(0, 40).trim();

    // Remove quotes and emojis to match Python behavior
    aiText = aiText
      .replace(/["""'']/g, "")
      .replace(/😉|😊|😎|🎯|💕|❤️|🔥/g, "")
      .trim();

    console.log(`   Cleaned to: "${aiText}" (${aiText.length} chars)`);

    // Create obfuscated output
    console.log("   Creating obfuscated output...");
    const prefixBlock = this.prefixes[channel] + username + " ";
    const obfPrefix = this.obfuscate(prefixBlock, 4);
    const obfBio = this.obfuscate(aiText, 1);
    const finalOutput = obfPrefix + obfBio;

    console.log("   ✅ Prompt generation complete");

    return {
      model,
      channel,
      username,
      visibleText: aiText,
      obfuscatedText: finalOutput,
      timestamp: new Date().toISOString(),
    };
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
