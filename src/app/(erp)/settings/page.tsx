'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, KeyRound, Activity } from 'lucide-react';

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>System Configuration</CardTitle>
                    <CardDescription>Administrative settings for the ERP system.</CardDescription>
                </CardHeader>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>User & Role Management</CardTitle>
                        <CardDescription>Manage users, assign roles, and define granular permissions for each role to ensure secure access to modules.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                        <Button><User className="mr-2 h-4 w-4" /> Manage Users</Button>
                        <Button variant="secondary"><KeyRound className="mr-2 h-4 w-4" /> Manage Roles</Button>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Audit Logs</CardTitle>
                        <CardDescription>Review system activity logs, track important changes, and monitor overall system health for compliance.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button><Activity className="mr-2 h-4 w-4" /> View Audit Logs</Button>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>General Settings (Placeholder)</CardTitle>
                        <CardDescription>Configure system-wide parameters like currency, tax rates, and business hours.</CardDescription>
                    </CardHeader>
                     <CardContent>
                        <Button disabled>Edit Settings</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
