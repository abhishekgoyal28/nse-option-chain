import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

/**
 * Validation middleware for breakout configuration updates
 */
export const validateBreakoutConfig = [
  // Volume thresholds
  body('volumeMultiplier')
    .optional()
    .isFloat({ min: 1.0, max: 10.0 })
    .withMessage('Volume multiplier must be between 1.0 and 10.0'),
  
  body('highVolumeMultiplier')
    .optional()
    .isFloat({ min: 2.0, max: 20.0 })
    .withMessage('High volume multiplier must be between 2.0 and 20.0'),

  // OI thresholds
  body('oiChangeThreshold')
    .optional()
    .isFloat({ min: 5.0, max: 50.0 })
    .withMessage('OI change threshold must be between 5.0% and 50.0%'),
  
  body('oiImbalanceRatio')
    .optional()
    .isFloat({ min: 1.5, max: 5.0 })
    .withMessage('OI imbalance ratio must be between 1.5 and 5.0'),

  // VWAP thresholds
  body('vwapDistanceThreshold')
    .optional()
    .isFloat({ min: 0.05, max: 1.0 })
    .withMessage('VWAP distance threshold must be between 0.05% and 1.0%'),
  
  body('vwapConsolidationMinutes')
    .optional()
    .isInt({ min: 10, max: 120 })
    .withMessage('VWAP consolidation minutes must be between 10 and 120'),

  // IV thresholds
  body('ivDropThreshold')
    .optional()
    .isFloat({ min: 5.0, max: 30.0 })
    .withMessage('IV drop threshold must be between 5.0% and 30.0%'),
  
  body('ivStabilityThreshold')
    .optional()
    .isFloat({ min: 1.0, max: 10.0 })
    .withMessage('IV stability threshold must be between 1.0% and 10.0%'),

  // Max Pain thresholds
  body('maxPainShiftThreshold')
    .optional()
    .isFloat({ min: 25, max: 200 })
    .withMessage('Max pain shift threshold must be between 25 and 200 points'),

  // Level detection
  body('levelProximityThreshold')
    .optional()
    .isFloat({ min: 10, max: 100 })
    .withMessage('Level proximity threshold must be between 10 and 100 points'),

  // Time windows
  body('firstHourMinutes')
    .optional()
    .isInt({ min: 30, max: 120 })
    .withMessage('First hour minutes must be between 30 and 120'),
  
  body('lookbackPeriods')
    .optional()
    .isInt({ min: 10, max: 100 })
    .withMessage('Lookback periods must be between 10 and 100'),

  // Confidence scoring
  body('minConfidenceThreshold')
    .optional()
    .isFloat({ min: 30, max: 90 })
    .withMessage('Minimum confidence threshold must be between 30 and 90'),

  // Round number levels array
  body('roundNumberLevels')
    .optional()
    .isArray()
    .withMessage('Round number levels must be an array')
    .custom((levels: number[]) => {
      if (!Array.isArray(levels)) return false;
      return levels.every(level => 
        typeof level === 'number' && 
        level >= 15000 && 
        level <= 30000
      );
    })
    .withMessage('Round number levels must be numbers between 15000 and 30000'),

  // Validation result handler
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Invalid configuration parameters',
        details: errors.array(),
        timestamp: new Date().toISOString()
      });
      return;
    }
    next();
  }
];

/**
 * Validation middleware for historical data queries
 */
export const validateHistoricalQuery = [
  body('timeframe')
    .optional()
    .isIn(['1h', '4h', '1d', '7d', '30d', 'all'])
    .withMessage('Timeframe must be one of: 1h, 4h, 1d, 7d, 30d, all'),
  
  body('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be in ISO8601 format'),

  // Validation result handler
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Invalid query parameters',
        details: errors.array(),
        timestamp: new Date().toISOString()
      });
      return;
    }
    next();
  }
];

/**
 * Validation middleware for pattern type parameter
 */
export const validatePatternType = (req: Request, res: Response, next: NextFunction): void => {
  const { pattern } = req.params;
  
  const validPatterns = [
    'CALL_PUT_WRITING_IMBALANCE',
    'VWAP_VOLUME_BREAKOUT',
    'OI_PRICE_DIVERGENCE',
    'FIRST_HOUR_BREAKOUT',
    'MAX_PAIN_SHIFT',
    'IV_CRUSH_BREAKOUT',
    'VOLUME_SPIKE_KEY_LEVELS'
  ];

  if (!pattern || !validPatterns.includes(pattern.toUpperCase())) {
    res.status(400).json({
      success: false,
      error: 'Invalid pattern type',
      message: `Pattern must be one of: ${validPatterns.join(', ')}`,
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};

/**
 * Generic validation error handler
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: 'Request validation failed',
      details: errors.array().map(error => ({
        field: error.type === 'field' ? error.path : 'unknown',
        message: error.msg,
        value: error.type === 'field' ? error.value : undefined
      })),
      timestamp: new Date().toISOString()
    });
    return;
  }
  next();
};
