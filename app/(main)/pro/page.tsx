'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Check } from 'lucide-react';

export default function ProPage() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      description: 'Perfect for getting started.',
      features: ['Basic AI access', '5 Projects', 'Community support'],
      current: true,
    },
    {
      name: 'Pro',
      price: '$20',
      description: 'More power for advanced users.',
      features: ['Priority AI access', 'Unlimited Projects', 'Cloud storage', 'Advanced search'],
      current: false,
    }
  ];

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Upgrade to Pro</h1>
        <p className="text-muted-foreground">Unlock the full potential of your AI assistant.</p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8">
        {plans.map((plan) => (
          <Card key={plan.name} className={plan.name === 'Pro' ? 'border-primary relative shadow-primary/10' : ''}>
            {plan.name === 'Pro' && (
              <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-bl-lg rounded-tr-lg">
                RECOMMENDED
              </div>
            )}
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <div className="text-3xl font-bold">{plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button className="w-full" variant={plan.name === 'Pro' ? 'default' : 'outline'} disabled={plan.current}>
                {plan.current ? 'Current Plan' : 'Get Started'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
