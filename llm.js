import OpenAI from 'openai';
import dotenv from 'dotenv';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

dotenv.config();

if (!process.env.GEMINI_API_KEY || !process.env.BASE_URL) {
  throw new Error('Missing API configuration. Please set GEMINI_API_KEY and BASE_URL in .env file');
}

const client = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: process.env.BASE_URL,
});

const ResponseEvent = z.object({
  step: z.enum(['START', 'THINK', 'OUTPUT', 'OBSERVE', 'TOOL']),
  tool_name: z.string().nullable(),
  content: z.string(),
  input: z.string().nullable(),
});

const TOOL_MAP = {
  scraper: 'scraper',
};

const System = `
You are a powerful and intelligent developer assistant called Web Clone. You specialize in cloning websites by scraping HTML, CSS, JavaScript, and images.

Your job is to help users clone websites through a conversational interface. When a user provides a URL, you should:
1. Acknowledge the URL they provided
2. Think through what needs to be done
3. Call the scraper tool with the URL
4. Wait for the OBSERVE response from the tool
5. Provide a friendly output message

Available Tools:
  - scraper(url: string): Takes a URL as input, scrapes the site, and saves files in a ZIP archive

Strictly Follow Rules:
  - Always follow the output JSON format
  - Always perform only one step at a time and wait for other step
  - Always make sure to do multiple steps of thinking before giving output
  - For every tool call always wait for the OBSERVE which contains the output from tool
  - Be friendly and conversational

Output JSON Format:
  { "step": "START | THINK | OUTPUT | OBSERVE | TOOL", "content": "string", "tool_name": "string", "input": "STRING" }

Example:
  User: "Clone https://example.com"
  ASSISTANT: { "step": "START", "content": "I'll help you clone https://example.com!" }
  ASSISTANT: { "step": "THINK", "content": "I need to scrape this website and get all its resources" }
  ASSISTANT: { "step": "THINK", "content": "I'll use the scraper tool to download HTML, CSS, JS, and images" }
  ASSISTANT: { "step": "TOOL", "input": "https://example.com", "tool_name": "scraper" }
  DEVELOPER: { "step": "OBSERVE", "content": "Successfully cloned website with 45 files" }
  ASSISTANT: { "step": "THINK", "content": "Great! The website has been cloned successfully" }
  ASSISTANT: { "step": "OUTPUT", "content": "All done! Your website has been cloned with all resources. You can download it now!" }
`;

export async function askLLM(message, onProgress) {
  const messages = [
    { role: 'system', content: System },
    { role: 'user', content: message },
  ];

  let toolResult = null;

  while (true) {
    const model = process.env.MODEL || 'gemini-2.0-flash';
    let response;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        try {
          response = await client.chat.completions.create({
            model,
            messages,
            response_format: zodResponseFormat(ResponseEvent, 'response'),
          });
        } catch (innerErr) {
          const innerStatus = innerErr?.status ?? innerErr?.response?.status;
          if (innerStatus >= 400) {
            response = await client.chat.completions.create({ model, messages });
          } else {
            throw innerErr;
          }
        }
        break;
      } catch (err) {
        const status = err?.status ?? err?.response?.status;
        const isServerError = status >= 500 || status === undefined;
        if (attempt < 3 && isServerError) {
          const waitMs = attempt * 500;
          await new Promise(r => setTimeout(r, waitMs));
          continue;
        }
        throw err;
      }
    }

    const msg = response?.choices?.[0]?.message ?? {};
    let rawContent = msg.content;
    if (Array.isArray(rawContent)) {
      rawContent = rawContent.map(p => (typeof p === 'string' ? p : p?.text ?? '')).join('').trim();
    }
    if (typeof rawContent !== 'string') rawContent = String(rawContent ?? '');

    let parsedContent;
    try {
      parsedContent = JSON.parse(rawContent);
    } catch (e) {
      console.log('Non-JSON response:', rawContent);
      messages.push({
        role: 'developer',
        content: 'Please respond again strictly as valid JSON matching the schema with keys: step, content, tool_name, input. Do not include any extra text.'
      });
      continue;
    }

    console.log('AI Response:', parsedContent);

    messages.push({
      role: 'assistant',
      content: JSON.stringify(parsedContent),
    });

    if (parsedContent.step === 'START') {
      onProgress(parsedContent.content);
      continue;
    }

    if (parsedContent.step === 'THINK') {
      onProgress(parsedContent.content);
      continue;
    }

    if (parsedContent.step === 'TOOL') {
      if (parsedContent.tool_name === 'scraper') {
        toolResult = { url: parsedContent.input };
        onProgress('Starting website clone...');
        messages.push({
          role: 'developer',
          content: JSON.stringify({ step: 'OBSERVE', content: 'Tool execution started. The website is being scraped and will be ready for download.' }),
        });
      }
      continue;
    }

    if (parsedContent.step === 'OUTPUT') {
      return { message: parsedContent.content, url: toolResult?.url };
    }
  }
}
