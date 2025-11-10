import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsappApiService';
import { supabase } from '@/lib/supabaseClient';
import WhatsAppAutoReplyService from '@/lib/whatsappAutoReplyService';

/**
 * WhatsApp Webhook Handler
 * Receives messages from WhatsApp Business API and sends auto-replies with routing
 * 
 * Webhook URL: https://your-domain.com/api/whatsapp/webhook
 */

// GET handler for webhook verification
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // WhatsApp sends these params to verify webhook
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'palaka_whatsapp_2025';

  // Check if mode and token match
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ Webhook verified successfully');
    return new NextResponse(challenge, { status: 200 });
  } else {
    console.error('❌ Webhook verification failed');
    return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
  }
}

// POST handler for incoming messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('📨 Webhook received:', JSON.stringify(body, null, 2));

    // Verify webhook signature (security)
    const signature = request.headers.get('x-hub-signature-256') || '';
    const appSecret = process.env.WHATSAPP_APP_SECRET || '';
    
    if (appSecret) {
      const rawBody = JSON.stringify(body);
      const isValid = whatsappService.verifyWebhookSignature(rawBody, signature, appSecret);
      
      if (!isValid) {
        console.error('❌ Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    }

    // Parse incoming message
    const parsed = whatsappService.parseWebhookMessage(body);
    
    if (!parsed || parsed.messages.length === 0) {
      console.log('ℹ️  No messages to process');
      return NextResponse.json({ success: true, message: 'No messages' });
    }

    const { messages, contacts } = parsed;

    // Process each message
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const contact = contacts[i];

      // Skip if not a text message (for now)
      if (message.type !== 'text' || !message.text?.body) {
        console.log(`⏭️  Skipping ${message.type} message`);
        continue;
      }

      const phoneNumber = message.from;
      const messageText = message.text.body;
      const contactName = contact?.profile?.name || 'Unknown';

      console.log(`📥 Message from ${contactName} (${phoneNumber}): ${messageText}`);

      // Check if lead already exists
      const { data: existingLead } = await supabase
        .from('meta_leads')
        .select('*')
        .eq('phone', phoneNumber)
        .single();

      const isReturningCustomer = !!existingLead;

      // Initialize auto-reply service
      const autoReplyService = new WhatsAppAutoReplyService();

      // Send smart auto-reply with routing
      await autoReplyService.sendSmartAutoReply(
        phoneNumber.replace('+', ''), // Remove + sign
        messageText,
        contactName,
        isReturningCustomer
      );

      // Get routing info
      const routingInfo = autoReplyService.getRoutingInfo(messageText);

      console.log(`📞 Routing to: ${routingInfo.phoneNumber} (${routingInfo.department})`);

      if (existingLead) {
        console.log('✅ Lead already exists, updating...');
        
        // Update last contact and add note
        await supabase
          .from('meta_leads')
          .update({
            last_contacted_at: new Date().toISOString(),
            contact_attempts: (existingLead.contact_attempts || 0) + 1,
            notes: existingLead.notes 
              ? `${existingLead.notes}\n\n[${new Date().toLocaleString()}] WhatsApp: "${messageText}" | Routed to: ${routingInfo.phoneNumber} (${routingInfo.department})`
              : `[${new Date().toLocaleString()}] WhatsApp: "${messageText}" | Routed to: ${routingInfo.phoneNumber} (${routingInfo.department})`,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingLead.id);
      } else {
        console.log('🆕 Creating new lead...');
        
        // Create new lead
        const { error } = await supabase.from('meta_leads').insert({
          meta_lead_id: `whatsapp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          full_name: contactName,
          phone: phoneNumber,
          email: null,
          campaign_name: `WhatsApp - ${routingInfo.department}`,
          campaign_id: 'whatsapp_api',
          adset_name: 'WhatsApp Auto-Reply',
          ad_name: 'WhatsApp Routing',
          form_name: 'WhatsApp API',
          platform: 'whatsapp',
          status: 'new',
          notes: `First message: "${messageText}" | Routed to: ${routingInfo.phoneNumber} (${routingInfo.department})`,
          created_time: message.timestamp,
          synced_at: new Date().toISOString(),
          last_contacted_at: new Date().toISOString(),
          contact_attempts: 1
        });

        if (error) {
          console.error('❌ Error creating lead:', error);
        } else {
          console.log('✅ Lead created successfully');
        }
      }

      // Mark message as read
      await whatsappService.markAsRead(message.id);

      console.log(`✅ Message processed successfully`);
      console.log(`   - Auto-reply sent: Yes`);
      console.log(`   - Routed to: ${routingInfo.phoneNumber} (${routingInfo.department})`);
      console.log(`   - Lead ${isReturningCustomer ? 'updated' : 'created'} in CRM`);
    }

    return NextResponse.json({ success: true, processed: messages.length });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
