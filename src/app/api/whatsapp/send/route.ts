import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsappApiService';

/**
 * WhatsApp Send Message API
 * Allows sending messages from CRM to WhatsApp contacts
 * 
 * POST /api/whatsapp/send
 * Body: { to: "+919876543210", message: "Hello from Palaka ERP!" }
 */

export async function POST(request: NextRequest) {
  try {
    const { to, message } = await request.json();

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      );
    }

    // Remove any formatting from phone number
    const cleanPhone = to.replace(/[^\d+]/g, '');

    console.log(`📤 Sending WhatsApp message to ${cleanPhone}...`);

    const result = await whatsappService.sendMessage(cleanPhone, message);

    if (result.success) {
      console.log(`✅ Message sent successfully (ID: ${result.messageId})`);
      return NextResponse.json({
        success: true,
        messageId: result.messageId
      });
    } else {
      console.error(`❌ Failed to send message: ${result.error}`);
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Send message error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
