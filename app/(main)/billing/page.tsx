'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CreditCard, Receipt } from 'lucide-react';

export default function BillingPage() {
  return (
    <div className="container max-w-4xl mx-auto py-10 px-4 space-y-8">
      <div className="space-y-2">
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-center md:text-left">
            Billing
          </h1>
          <div className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold w-fit border border-blue-500/20 uppercase tracking-wider mx-auto md:mx-0">
            Not implemented yet
          </div>
        </div>
        <p className="text-muted-foreground text-center md:text-left">
          Manage your payment methods and invoices.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Payment Method
            </CardTitle>
            <CardDescription>
              You currently have no payment methods on file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground italic">
              Billing functionality is currently being implemented.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Recent Invoices
            </CardTitle>
            <CardDescription>
              View and download your past payments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              No invoices found.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
