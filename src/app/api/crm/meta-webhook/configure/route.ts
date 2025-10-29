// API endpoint to save Meta webhook configuration
import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { verifyToken, appSecret, accessToken } = body;

    // Validate required fields
    if (!verifyToken || !appSecret || !accessToken) {
      return NextResponse.json(
        { error: 'All fields are required: verifyToken, appSecret, accessToken' },
        { status: 400 }
      );
    }

    // In production, you would save these to your database or secret manager
    // For now, we'll provide instructions to update .env.local manually
    
    // Read current .env.local file
    const envPath = join(process.cwd(), '.env.local');
    let envContent = '';
    
    try {
      envContent = readFileSync(envPath, 'utf-8');
    } catch {
      // File doesn't exist, create new content
      envContent = '';
    }

    // Update or add Meta credentials
    const lines = envContent.split('\n');
    const metaKeys = {
      'META_VERIFY_TOKEN': verifyToken,
      'META_APP_SECRET': appSecret,
      'META_ACCESS_TOKEN': accessToken
    };

    // Update existing keys or add new ones
    Object.keys(metaKeys).forEach(key => {
      const value = metaKeys[key as keyof typeof metaKeys];
      const existingIndex = lines.findIndex(line => line.startsWith(`${key}=`));
      
      if (existingIndex !== -1) {
        // Update existing line
        lines[existingIndex] = `${key}=${value}`;
      } else {
        // Add new line
        lines.push(`${key}=${value}`);
      }
    });

    // Write back to .env.local
    const newEnvContent = lines.join('\n');
    
    try {
      writeFileSync(envPath, newEnvContent, 'utf-8');
      
      return NextResponse.json({
        success: true,
        message: 'Settings saved successfully. Please restart your server for changes to take effect.',
        needsRestart: true,
        envPath: '.env.local'
      });
    } catch (writeError) {
      console.error('Error writing to .env.local:', writeError);
      
      // If we can't write to file, return the values for manual setup
      return NextResponse.json({
        success: false,
        message: 'Could not write to .env.local. Please add these manually:',
        manualSetup: {
          META_VERIFY_TOKEN: verifyToken,
          META_APP_SECRET: appSecret,
          META_ACCESS_TOKEN: accessToken
        },
        instructions: [
          '1. Open .env.local file in your project root',
          '2. Add or update the above environment variables',
          '3. Restart your Next.js server'
        ]
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error configuring Meta webhook:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
