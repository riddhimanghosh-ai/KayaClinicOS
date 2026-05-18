import { NextResponse } from "next/server";

export async function GET() {
  const groqKey = process.env.GROQ_API_KEY;
  const provider = process.env.LLM_PROVIDER;
  const model = process.env.LLM_MODEL;

  return NextResponse.json({
    GROQ_API_KEY: groqKey ? `✓ SET (${groqKey.slice(0, 10)}...)` : "✗ NOT SET",
    LLM_PROVIDER: provider || "not set",
    LLM_MODEL: model || "not set",
    NODE_ENV: process.env.NODE_ENV,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? "✓ SET" : "✗ NOT SET",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "✓ SET" : "✗ NOT SET",
    timestamp: new Date().toISOString(),
    environment: {
      isVercel: !!process.env.VERCEL,
      isAmplify: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
      platform: process.env.VERCEL ? "Vercel" : process.env.AWS_LAMBDA_FUNCTION_NAME ? "Amplify/Lambda" : "local",
    }
  });
}
