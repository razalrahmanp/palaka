'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Facebook, CheckCircle, Copy, ExternalLink,
  Settings, AlertCircle, RefreshCw, Save
} from 'lucide-react';

export default function MetaAdsSettingsPage() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Generate webhook URL - use localhost for local development, or current domain
    const currentDomain = window.location.origin;
    const isLocalhost = currentDomain.includes('localhost');
    const webhookEndpoint = isLocalhost 
      ? 'http://localhost:3000/api/crm/meta-webhook'
      : `${currentDomain}/api/crm/meta-webhook`;
    setWebhookUrl(webhookEndpoint);
    
    // Load saved settings from localStorage (in production, fetch from database)
    const savedVerifyToken = localStorage.getItem('meta_verify_token');
    const savedAppSecret = localStorage.getItem('meta_app_secret');
    const savedAccessToken = localStorage.getItem('meta_access_token');
    
    if (savedVerifyToken) setVerifyToken(savedVerifyToken);
    if (savedAppSecret) setAppSecret(savedAppSecret);
    if (savedAccessToken) setAccessToken(savedAccessToken);
    
    // Check connection status
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch('/api/crm/meta-webhook/status');
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.connected || false);
      }
    } catch (error) {
      console.error('Failed to check connection status:', error);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // In production, save to database via API
      localStorage.setItem('meta_verify_token', verifyToken);
      localStorage.setItem('meta_app_secret', appSecret);
      localStorage.setItem('meta_access_token', accessToken);
      
      // Update environment variables (requires server restart)
      await fetch('/api/crm/meta-webhook/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verifyToken,
          appSecret,
          accessToken
        })
      });
      
      alert('Settings saved successfully! Please restart your server to apply changes.');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const testWebhook = async () => {
    setIsTesting(true);
    try {
      const response = await fetch('/api/crm/meta-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          object: 'page',
          entry: [{
            id: 'test',
            time: Date.now(),
            changes: [{
              field: 'leadgen',
              value: {
                leadgen_id: 'test_lead_123',
                form_id: 'test_form_456',
                ad_id: 'test_ad_789',
                created_time: new Date().toISOString(),
                platform: 'facebook'
              }
            }]
          }]
        })
      });
      
      if (response.ok) {
        alert('✅ Webhook test successful! Check your leads management page.');
        setIsConnected(true);
      } else {
        alert('❌ Webhook test failed. Please check your configuration.');
      }
    } catch (error) {
      console.error('Webhook test failed:', error);
      alert('❌ Webhook test failed. Please check your configuration.');
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const setupSteps = [
    {
      step: 1,
      title: 'Create Meta App',
      description: 'Go to developers.facebook.com and create a new app',
      link: 'https://developers.facebook.com/apps/',
      completed: !!appSecret
    },
    {
      step: 2,
      title: 'Configure Webhook',
      description: 'Add webhook URL and verify token in your Meta App settings',
      completed: !!verifyToken
    },
    {
      step: 3,
      title: 'Get Access Token',
      description: 'Generate a Page Access Token from Meta Business Suite',
      link: 'https://developers.facebook.com/tools/explorer/',
      completed: !!accessToken
    },
    {
      step: 4,
      title: 'Subscribe to Events',
      description: 'Subscribe to "leadgen" events in your webhook configuration',
      completed: isConnected
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
            <Facebook className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Meta Ads Integration</h1>
            <p className="text-gray-600">Connect Facebook & Instagram Ads lead collection</p>
          </div>
        </div>
        
        <div className="mt-4">
          <Badge 
            className={isConnected ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}
          >
            {isConnected ? (
              <><CheckCircle className="h-3 w-3 mr-1" /> Connected</>
            ) : (
              <><AlertCircle className="h-3 w-3 mr-1" /> Not Connected</>
            )}
          </Badge>
        </div>
      </div>

      {/* Setup Steps */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Setup Progress</CardTitle>
          <CardDescription>Follow these steps to connect your Meta Ads account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {setupSteps.map((step) => (
              <div key={step.step} className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                  step.completed 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step.completed ? <CheckCircle className="h-5 w-5" /> : step.step}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{step.title}</h3>
                  <p className="text-sm text-gray-600">{step.description}</p>
                  {step.link && (
                    <a 
                      href={step.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-600" />
              Webhook Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Webhook URL
              </label>
              <div className="flex gap-2">
                <Input 
                  value={webhookUrl} 
                  readOnly 
                  className="bg-gray-50"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => copyToClipboard(webhookUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use this URL in your Meta App webhook settings
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Verify Token
              </label>
              <Input 
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                placeholder="Enter your verification token"
                type="text"
              />
              <p className="text-xs text-gray-500 mt-1">
                Create a secure token for webhook verification
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                App Secret
              </label>
              <Input 
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                placeholder="Enter your Meta App Secret"
                type="password"
              />
              <p className="text-xs text-gray-500 mt-1">
                Found in Meta App Dashboard → Settings → Basic
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Page Access Token
              </label>
              <Input 
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Enter your Page Access Token"
                type="password"
              />
              <p className="text-xs text-gray-500 mt-1">
                Generate from Meta Business Suite or Graph API Explorer
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 flex-1"
              >
                {isSaving ? (
                  <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Save Settings</>
                )}
              </Button>
              <Button 
                onClick={testWebhook}
                disabled={isTesting || !verifyToken}
                variant="outline"
              >
                {isTesting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  'Test Webhook'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">1. Create Meta App</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">developers.facebook.com</a></li>
                  <li>Create a new app (Business type)</li>
                  <li>Add &quot;Webhooks&quot; product to your app</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">2. Configure Webhook</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>In Webhooks settings, click &quot;Edit Subscription&quot;</li>
                  <li>Paste the webhook URL from above</li>
                  <li>Enter your verify token</li>
                  <li>Click &quot;Verify and Save&quot;</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">3. Subscribe to Events</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Select your Facebook Page</li>
                  <li>Subscribe to &quot;leadgen&quot; field</li>
                  <li>Save your subscription</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">4. Get Access Token</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Open <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Graph API Explorer</a></li>
                  <li>Select your app and page</li>
                  <li>Request &quot;pages_manage_metadata&quot; and &quot;leads_retrieval&quot; permissions</li>
                  <li>Generate and copy the access token</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Important</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      After saving settings, restart your Next.js server for environment variables to take effect.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Environment Variables Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>Add these to your .env.local file</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-green-400">META_VERIFY_TOKEN</span>
                <span>=</span>
                <span className="text-yellow-300">&quot;{verifyToken || 'your_verification_token'}&quot;</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-green-400">META_APP_SECRET</span>
                <span>=</span>
                <span className="text-yellow-300">&quot;{appSecret ? '••••••••••••••••' : 'your_app_secret'}&quot;</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-green-400">META_ACCESS_TOKEN</span>
                <span>=</span>
                <span className="text-yellow-300">&quot;{accessToken ? '••••••••••••••••' : 'your_page_access_token'}&quot;</span>
              </div>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3"
            onClick={() => {
              const envContent = `META_VERIFY_TOKEN="${verifyToken || 'your_verification_token'}"\nMETA_APP_SECRET="${appSecret || 'your_app_secret'}"\nMETA_ACCESS_TOKEN="${accessToken || 'your_page_access_token'}"`;
              copyToClipboard(envContent);
            }}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy to Clipboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
