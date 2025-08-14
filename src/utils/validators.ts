import Joi from 'joi';
import { TimeFrame, ExportFormat, FetchAction } from '@/types';

// Validation schemas
export const timeframeSchema = Joi.string().valid('1h', '4h', '1d', '7d', '30d', 'all');

export const limitSchema = Joi.number().integer().min(1).max(10000);

export const exportFormatSchema = Joi.string().valid('json', 'csv', 'xlsx');

export const fetchActionSchema = Joi.string().valid('start', 'stop', 'status');

export const historicalDataQuerySchema = Joi.object({
  timeframe: timeframeSchema.optional(),
  limit: limitSchema.optional(),
});

export const controlFetchSchema = Joi.object({
  action: fetchActionSchema.required(),
});

export const generateTokenSchema = Joi.object({
  request_token: Joi.string().required(),
});

export const setTokenSchema = Joi.object({
  access_token: Joi.string().required(),
});

export const exportDataParamsSchema = Joi.object({
  format: exportFormatSchema.required(),
});

export const exportDataQuerySchema = Joi.object({
  timeframe: timeframeSchema.optional().default('all'),
});

export const signalsQuerySchema = Joi.object({
  timeframe: timeframeSchema.optional().default('1d'),
  priority: Joi.string().valid('high', 'medium', 'low', 'all').optional().default('all'),
});

export const marketAnalysisQuerySchema = Joi.object({
  timeframe: timeframeSchema.optional().default('1d'),
});

export const sheetsHistoricalDataQuerySchema = Joi.object({
  date: Joi.string().isoDate().optional(),
  strikePrice: Joi.number().integer().optional(),
  limit: limitSchema.optional(),
});

export const sheetsDailySummaryQuerySchema = Joi.object({
  date: Joi.string().isoDate().optional(),
});

// Validation helper functions
export function validateTimeframe(timeframe: string): timeframe is TimeFrame {
  const validTimeframes: TimeFrame[] = ['1h', '4h', '1d', '7d', '30d', 'all'];
  return validTimeframes.includes(timeframe as TimeFrame);
}

export function validateExportFormat(format: string): format is ExportFormat {
  const validFormats: ExportFormat[] = ['json', 'csv', 'xlsx'];
  return validFormats.includes(format as ExportFormat);
}

export function validateFetchAction(action: string): action is FetchAction {
  const validActions: FetchAction[] = ['start', 'stop', 'status'];
  return validActions.includes(action as FetchAction);
}

export function validateStrikePrice(strike: number): boolean {
  // NIFTY strikes are typically multiples of 50
  return strike > 0 && strike % 50 === 0 && strike >= 10000 && strike <= 30000;
}

export function validateLimit(limit: number): boolean {
  return Number.isInteger(limit) && limit > 0 && limit <= 10000;
}

export function validateDateString(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

// Custom validation middleware
export function validateQuery(schema: Joi.ObjectSchema) {
  return (req: any, res: any, next: any): void => {
    const { error, value } = schema.validate(req.query);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.details[0]?.message || 'Validation failed',
        timestamp: new Date().toISOString(),
      });
    }
    
    req.query = value;
    next();
  };
}

export function validateBody(schema: Joi.ObjectSchema) {
  return (req: any, res: any, next: any): void => {
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.details[0]?.message || 'Validation failed',
        timestamp: new Date().toISOString(),
      });
    }
    
    req.body = value;
    next();
  };
}

export function validateParams(schema: Joi.ObjectSchema) {
  return (req: any, res: any, next: any): void => {
    const { error, value } = schema.validate(req.params);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.details[0]?.message || 'Validation failed',
        timestamp: new Date().toISOString(),
      });
    }
    
    req.params = value;
    next();
  };
}
