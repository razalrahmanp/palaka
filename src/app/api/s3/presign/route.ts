// app/api/s3/presign/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const REGION = process.env.AWS_REGION!;
const BUCKET = process.env.AWS_S3_BUCKET!;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

export async function POST(req: NextRequest) {
  const { filename, contentType } = await req.json();
  // generate a unique key
  const key = `purchase_orders/${Date.now()}_${filename}`;

  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    ACL: 'public-read'
  });
  const signedUrl = await getSignedUrl(s3, cmd, { expiresIn: 300 }); // 5m
  // the eventual public URL
  const publicUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

  return NextResponse.json({ signedUrl, publicUrl });
}
