# Get WhatsApp Phone Number ID

## Quick Method - Using Graph API Explorer

1. **Go to:** https://developers.facebook.com/tools/explorer/

2. **Setup:**
   - App: Select **AlramsCrm**
   - Permissions: Make sure you have `whatsapp_business_management` permission
   - Access Token: Use the one showing (or generate new one)

3. **Make API Call:**
   - Method: **GET**
   - Query: `1531769234617692/phone_numbers`
   - Click **Submit**

4. **Response will show:**
```json
{
  "data": [
    {
      "id": "XXXXXXXXXXXXXXXXX",  ← Copy this Phone Number ID!
      "display_phone_number": "+1 (555) 193-5752",
      "verified_name": "Test Number",
      "code_verification_status": "NOT_VERIFIED",
      "quality_rating": "GREEN",
      "platform_type": "CLOUD_API"
    }
  ]
}
```

## Alternative - Click on Phone Number in WhatsApp Manager

1. In your current WhatsApp Manager view
2. Click on the phone number row: **15551935752**
3. Look for **"Phone number ID"** in the details
4. Copy that ID

## Your WhatsApp Business Account ID

Already have this: **1531769234617692**

## Next Steps

Once you have the Phone Number ID, we'll update `.env.local` with:
- WHATSAPP_PHONE_NUMBER_ID=[the ID you copied]

## To Add Your India Number (+91 85909 49001)

1. In WhatsApp Manager, click **"Add phone number"**
2. Choose **"Use your own phone number"**
3. Enter: **+91 85909 49001**
4. Verify via SMS
5. ⚠️ Warning: This will remove it from WhatsApp Business App
6. You'll get a new Phone Number ID for this number
