import { Request, Response } from 'express';
import { KiteService } from '@/services/KiteService';
import { asyncHandler } from '@/middleware/errorHandler';
import { ValidationError } from '@/types';
import logger from '@/utils/logger';

export class AuthController {
  constructor(private kiteService: KiteService) {}

  public getLoginUrl = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    try {
      logger.info('Login URL endpoint requested');

      const loginUrl = this.kiteService.getLoginURL();
      logger.info('Login URL generated successfully');

      res.json({
        success: true,
        login_url: loginUrl,
        api_key: this.kiteService.getApiKey()
      });
    } catch (error) {
      logger.error('Error generating login URL:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate login URL',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  public generateToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { request_token } = req.body;

      if (!request_token) {
        throw new ValidationError('Request token is required');
      }

      logger.info(`Generating access token for request_token: ${request_token}`);

      const response = await this.kiteService.generateSession(request_token);

      logger.info('Access token generated successfully');

      res.json({
        success: true,
        access_token: response.access_token,
        user_id: response.user_id,
        user_name: response.user_name,
        user_shortname: response.user_shortname,
        email: response.email,
        user_type: response.user_type,
        broker: response.broker,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error generating access token:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to generate access token',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  public setToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { access_token } = req.body;

      if (!access_token) {
        throw new ValidationError('Access token is required');
      }

      this.kiteService.setAccessToken(access_token);

      const profile = await this.kiteService.getProfile();

      logger.info(`Access token set successfully for user: ${profile.user_name}`);

      res.json({
        success: true,
        message: 'Access token set successfully',
        user: profile,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error setting access token:', error);
      res.status(400).json({
        success: false,
        error: 'Invalid access token',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });
}
