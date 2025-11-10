/**
 * WhatsApp Business API Service
 * Handles sending and receiving messages via WhatsApp Cloud API
 */

import crypto from 'crypto';

interface WhatsAppTemplateComponent {
  type: string;
  parameters?: Array<{
    type: string;
    text?: string;
  }>;
}

interface WhatsAppMessage {
  from: string; // Phone number
  id: string; // Message ID
  timestamp: string;
  type: 'text' | 'image' | 'video' | 'document' | 'audio';
  text?: {
    body: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
  };
  // Add other types as needed
}

interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string; // WhatsApp ID (phone number)
}

export class WhatsAppService {
  private accessToken: string;
  private phoneNumberId: string;
  private businessAccountId: string;
  private apiVersion: string = 'v18.0';
  private baseUrl: string = 'https://graph.facebook.com';

  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';

    if (!this.accessToken || !this.phoneNumberId) {
      console.warn('⚠️  WhatsApp API credentials not configured!');
      console.warn('📝 Set these in .env.local:');
      console.warn('   WHATSAPP_ACCESS_TOKEN=your_token');
      console.warn('   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id');
      console.warn('   WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id');
    }
  }

  /**
   * Send a text message
   */
  async sendMessage(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const url = `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: {
            body: message
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('WhatsApp send error:', data);
        return {
          success: false,
          error: data.error?.message || 'Failed to send message'
        };
      }

      return {
        success: true,
        messageId: data.messages[0]?.id
      };
    } catch (error) {
      console.error('WhatsApp send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send a template message (for notifications)
   */
  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string = 'en',
    components?: WhatsAppTemplateComponent[]
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const url = `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: languageCode
            },
            components: components || []
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('WhatsApp template error:', data);
        return {
          success: false,
          error: data.error?.message || 'Failed to send template'
        };
      }

      return {
        success: true,
        messageId: data.messages[0]?.id
      };
    } catch (error) {
      console.error('WhatsApp template error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        })
      });

      return response.ok;
    } catch (error) {
      console.error('WhatsApp mark read error:', error);
      return false;
    }
  }

  /**
   * Get media URL from media ID
   */
  async getMediaUrl(mediaId: string): Promise<string | null> {
    try {
      const url = `${this.baseUrl}/${this.apiVersion}/${mediaId}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      const data = await response.json();
      return data.url || null;
    } catch (error) {
      console.error('WhatsApp media error:', error);
      return null;
    }
  }

  /**
   * Parse incoming webhook message
   */
  parseWebhookMessage(webhookData: Record<string, unknown>): {
    messages: WhatsAppMessage[];
    contacts: WhatsAppContact[];
  } | null {
    try {
      const entry = (webhookData.entry as Record<string, unknown>[])?.[0];
      const changes = (entry?.changes as Record<string, unknown>[])?.[0];
      const value = changes?.value as Record<string, unknown>;

      if (!value?.messages) {
        return null;
      }

      return {
        messages: (value.messages as WhatsAppMessage[]) || [],
        contacts: (value.contacts as WhatsAppContact[]) || []
      };
    } catch (error) {
      console.error('Parse webhook error:', error);
      return null;
    }
  }

  /**
   * Verify webhook signature (security)
   */
  verifyWebhookSignature(payload: string, signature: string, appSecret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex');
    
    return signature === `sha256=${expectedSignature}`;
  }
}

export const whatsappService = new WhatsAppService();
