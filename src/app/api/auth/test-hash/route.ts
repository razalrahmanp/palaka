import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

// Simple hash function (same as in mobile app and login)
function simpleHash(str: string): string {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `SIMPLE_${Math.abs(hash).toString(36)}_${str.length}`;
}

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    // Generate all three password formats
    const bcryptHash = await bcrypt.hash(password, 10);
    const simpleHashValue = simpleHash(password);
    const plainText = password;

    return NextResponse.json({
      input: password,
      formats: {
        bcrypt: bcryptHash,
        simple_hash: simpleHashValue,
        plain_text: plainText
      },
      verification: {
        bcrypt_matches: await bcrypt.compare(password, bcryptHash),
        simple_hash_matches: simpleHashValue === simpleHash(password),
        plain_text_matches: plainText === password
      }
    });

  } catch (error) {
    console.error('Password hash test error:', error);
    return NextResponse.json({ error: 'Test failed' }, { status: 500 });
  }
}
