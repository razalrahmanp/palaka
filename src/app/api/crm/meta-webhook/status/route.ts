// API endpoint to check Meta Webhook connection status
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if required environment variables are configured
    const isConfigured = !!(
      process.env.META_VERIFY_TOKEN &&
      process.env.META_APP_SECRET &&
      process.env.META_ACCESS_TOKEN
    );

    // Check if they're not just placeholder values
    const isValid = !!(
      process.env.META_VERIFY_TOKEN &&
      process.env.META_VERIFY_TOKEN !== 'your_verification_token' &&
      process.env.META_APP_SECRET &&
      process.env.META_APP_SECRET !== '' &&
      process.env.META_ACCESS_TOKEN &&
      process.env.META_ACCESS_TOKEN !== ''
    );

    return NextResponse.json({
      configured: isConfigured,
      connected: isValid,
      hasVerifyToken: !!process.env.META_VERIFY_TOKEN,
      hasAppSecret: !!process.env.META_APP_SECRET,
      hasAccessToken: !!process.env.META_ACCESS_TOKEN,
      message: isValid 
        ? 'Meta Ads webhook is configured and ready' 
        : isConfigured 
          ? 'Environment variables detected but may need valid values' 
          : 'Meta Ads webhook not configured - please add environment variables'
    });
  } catch (error) {
    console.error('❌ Error checking Meta webhook status:', error);
    return NextResponse.json(
      { 
        configured: false, 
        connected: false,
        error: 'Failed to check webhook status' 
      },
      { status: 500 }
    );
  }
}
