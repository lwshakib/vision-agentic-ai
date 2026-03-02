'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Bell, Settings } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function NotificationsPage() {
  return (
    <div className="container max-w-4xl mx-auto py-10 px-4 space-y-8">
      <div className="space-y-2 text-center md:text-left">
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <div className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold w-fit border border-blue-500/20 uppercase tracking-wider">
            Not implemented yet
          </div>
        </div>
        <p className="text-muted-foreground">
          Configure how you want to receive updates.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              General Notifications
            </CardTitle>
            <CardDescription>
              Stay informed about your account and projects.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="email-notif" className="flex flex-col space-y-1">
                <span>Email Notifications</span>
                <span className="font-normal text-xs text-muted-foreground">
                  Receive weekly summaries of your activity.
                </span>
              </Label>
              <Switch id="email-notif" />
            </div>
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="push-notif" className="flex flex-col space-y-1">
                <span>Push Notifications</span>
                <span className="font-normal text-xs text-muted-foreground">
                  Real-time alerts for project updates.
                </span>
              </Label>
              <Switch id="push-notif" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Security Alerts
            </CardTitle>
            <CardDescription>
              Vital alerts about your account security.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between space-x-2 opacity-50 cursor-not-allowed">
              <Label className="flex flex-col space-y-1">
                <span>Critical Login Alerts</span>
                <span className="font-normal text-xs text-muted-foreground">
                  Always enabled for your protection.
                </span>
              </Label>
              <Switch checked disabled />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
