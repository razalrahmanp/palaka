'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, Eye, Database, UserCheck, Mail } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground">
          Last updated: October 29, 2025
        </p>
      </div>

      {/* Introduction */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Introduction
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Welcome to Al Rams Furniture & Interiors (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting 
            your personal information and your right to privacy. This Privacy Policy explains how we 
            collect, use, disclose, and safeguard your information when you use our ERP system and services.
          </p>
          <p>
            By using our services, you agree to the collection and use of information in accordance with 
            this policy. If you do not agree with our policies and practices, please do not use our services.
          </p>
        </CardContent>
      </Card>

      {/* Information We Collect */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Information We Collect
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. Personal Information</h3>
            <p className="mb-2">We collect personal information that you provide to us, including:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Name, email address, phone number</li>
              <li>Business information (company name, address)</li>
              <li>Financial information (for transactions and invoicing)</li>
              <li>Account credentials (username, encrypted password)</li>
              <li>Communication preferences</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. Automatically Collected Information</h3>
            <p className="mb-2">When you use our services, we automatically collect:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Device information (IP address, browser type, operating system)</li>
              <li>Usage data (pages visited, features used, time spent)</li>
              <li>Log files and error reports</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">3. Third-Party Information</h3>
            <p className="mb-2">We may collect information from third-party sources:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Meta (Facebook/Instagram) lead forms and advertising data</li>
              <li>Payment processors and financial institutions</li>
              <li>Business verification services</li>
              <li>Analytics and marketing platforms</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* How We Use Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            How We Use Your Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>We use the collected information for the following purposes:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Service Delivery:</strong> To provide, maintain, and improve our ERP services</li>
            <li><strong>Customer Support:</strong> To respond to your inquiries and provide technical support</li>
            <li><strong>Transaction Processing:</strong> To process payments, invoices, and financial records</li>
            <li><strong>CRM Management:</strong> To manage customer relationships and lead tracking</li>
            <li><strong>Analytics:</strong> To analyze usage patterns and improve user experience</li>
            <li><strong>Marketing:</strong> To send promotional materials (with your consent)</li>
            <li><strong>Security:</strong> To detect, prevent, and address fraud or security issues</li>
            <li><strong>Compliance:</strong> To comply with legal obligations and enforce our terms</li>
          </ul>
        </CardContent>
      </Card>

      {/* Data Sharing */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            How We Share Your Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>We may share your information in the following situations:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Service Providers:</strong> With third-party vendors who perform services on our behalf (hosting, analytics, payment processing)</li>
            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
            <li><strong>With Your Consent:</strong> When you explicitly authorize us to share your information</li>
          </ul>
          <p className="mt-4 font-semibold">
            We do not sell, rent, or trade your personal information to third parties for marketing purposes.
          </p>
        </CardContent>
      </Card>

      {/* Data Security */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Data Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            We implement appropriate technical and organizational security measures to protect your 
            personal information, including:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Encryption of data in transit and at rest</li>
            <li>Secure authentication and access controls</li>
            <li>Regular security audits and vulnerability assessments</li>
            <li>Employee training on data protection practices</li>
            <li>Backup and disaster recovery procedures</li>
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            However, no method of transmission over the internet or electronic storage is 100% secure. 
            While we strive to use commercially acceptable means to protect your information, we cannot 
            guarantee absolute security.
          </p>
        </CardContent>
      </Card>

      {/* Your Rights */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Your Privacy Rights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Depending on your location, you may have the following rights:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Access:</strong> Request access to the personal information we hold about you</li>
            <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
            <li><strong>Deletion:</strong> Request deletion of your personal information</li>
            <li><strong>Portability:</strong> Request transfer of your data to another service</li>
            <li><strong>Objection:</strong> Object to processing of your personal information</li>
            <li><strong>Restriction:</strong> Request restriction of processing your information</li>
            <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing at any time</li>
          </ul>
          <p className="mt-4">
            To exercise these rights, please contact us at the information provided below.
          </p>
        </CardContent>
      </Card>

      {/* Data Retention */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Data Retention</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            We retain your personal information only for as long as necessary to fulfill the purposes 
            outlined in this Privacy Policy, unless a longer retention period is required by law.
          </p>
          <p>
            When we no longer need your information, we will securely delete or anonymize it.
          </p>
        </CardContent>
      </Card>

      {/* Third-Party Services */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Third-Party Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Our services may integrate with third-party platforms, including:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Meta (Facebook/Instagram):</strong> For lead generation and advertising</li>
            <li><strong>Payment Gateways:</strong> For processing transactions</li>
            <li><strong>Cloud Hosting:</strong> For data storage and infrastructure</li>
            <li><strong>Analytics Tools:</strong> For usage tracking and insights</li>
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            These third parties have their own privacy policies. We encourage you to review their 
            privacy practices before providing your information.
          </p>
        </CardContent>
      </Card>

      {/* Children's Privacy */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Children&apos;s Privacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Our services are not intended for children under the age of 18. We do not knowingly collect 
            personal information from children. If you believe we have collected information from a child, 
            please contact us immediately.
          </p>
        </CardContent>
      </Card>

      {/* Updates */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Changes to This Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by 
            posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
          </p>
          <p>
            We encourage you to review this Privacy Policy periodically for any changes. Your continued 
            use of our services after any modifications indicates your acceptance of the updated policy.
          </p>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Contact Us
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            If you have any questions or concerns about this Privacy Policy or our data practices, 
            please contact us:
          </p>
          <div className="space-y-2 text-sm">
            <p><strong>Al Rams Furniture & Interiors</strong></p>
            <p>Perumpilavu, Kunnamkulam, Thrissur, Kerala, India</p>
            <p>Phone: +91 90745 130574 / +91 96450 75858</p>
            <p>Email: info@alramsfurniture.com</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
