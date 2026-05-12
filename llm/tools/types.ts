import { z } from 'zod';

/**
 * AI Tool Interface Definitions
 * Defines the executable functions available to the models.
 */
export interface ToolDefinition {
  description: string;
  schema: z.ZodObject<any, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (args: any) => Promise<any>;
}
