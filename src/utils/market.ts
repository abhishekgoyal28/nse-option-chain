import { MarketStatus } from '@/types';
import logger from './logger';

/**
 * Check if the market is currently open
 * Market hours: 9:30 AM to 3:30 PM IST (Monday-Friday)
 */
export function isMarketOpen(): boolean {
  try {
    // Get current time in IST
    const now = new Date();
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

    const currentHour = istTime.getHours();
    const currentMinute = istTime.getMinutes();
    const currentDay = istTime.getDay(); // 0 = Sunday, 6 = Saturday

    // Check if it's a weekend (Saturday = 6, Sunday = 0)
    if (currentDay === 0 || currentDay === 6) {
      logger.debug('Market closed: Weekend');
      return false;
    }

    // Market hours: 9:30 AM to 3:30 PM IST
    const marketOpenHour = 9;
    const marketOpenMinute = 30;
    const marketCloseHour = 15;
    const marketCloseMinute = 30;

    // Convert current time to minutes for easier comparison
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const marketOpenInMinutes = marketOpenHour * 60 + marketOpenMinute;
    const marketCloseInMinutes = marketCloseHour * 60 + marketCloseMinute;

    const isOpen = currentTimeInMinutes >= marketOpenInMinutes && currentTimeInMinutes <= marketCloseInMinutes;

    if (!isOpen) {
      logger.debug(
        `Market closed: Current time ${istTime.toLocaleTimeString()} IST is outside market hours (9:30 AM - 3:30 PM IST)`
      );
    } else {
      logger.debug(`Market open: Current time ${istTime.toLocaleTimeString()} IST`);
    }

    return isOpen;
  } catch (error) {
    logger.error('Error checking market hours:', error);
    // Default to allowing operations if there's an error
    return true;
  }
}

/**
 * Get detailed market status
 */
export function getMarketStatus(): MarketStatus {
  const now = new Date();
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  
  const currentHour = istTime.getHours();
  const currentMinute = istTime.getMinutes();
  const currentDay = istTime.getDay();
  
  // Weekend
  if (currentDay === 0 || currentDay === 6) {
    return 'CLOSED';
  }
  
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  const preMarketStart = 9 * 60; // 9:00 AM
  const marketOpen = 9 * 60 + 30; // 9:30 AM
  const marketClose = 15 * 60 + 30; // 3:30 PM
  const postMarketEnd = 16 * 60; // 4:00 PM
  
  if (currentTimeInMinutes >= preMarketStart && currentTimeInMinutes < marketOpen) {
    return 'PRE_MARKET';
  } else if (currentTimeInMinutes >= marketOpen && currentTimeInMinutes <= marketClose) {
    return 'OPEN';
  } else if (currentTimeInMinutes > marketClose && currentTimeInMinutes <= postMarketEnd) {
    return 'POST_MARKET';
  } else {
    return 'CLOSED';
  }
}

/**
 * Get time until market opens (in milliseconds)
 */
export function getTimeUntilMarketOpen(): number {
  const now = new Date();
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  
  // If it's weekend, calculate time until Monday 9:30 AM
  const currentDay = istTime.getDay();
  if (currentDay === 0 || currentDay === 6) {
    const daysUntilMonday = currentDay === 0 ? 1 : 2; // Sunday = 1 day, Saturday = 2 days
    const nextMonday = new Date(istTime);
    nextMonday.setDate(istTime.getDate() + daysUntilMonday);
    nextMonday.setHours(9, 30, 0, 0);
    return nextMonday.getTime() - istTime.getTime();
  }
  
  // If it's a weekday
  const marketOpenTime = new Date(istTime);
  marketOpenTime.setHours(9, 30, 0, 0);
  
  // If market hasn't opened today
  if (istTime < marketOpenTime) {
    return marketOpenTime.getTime() - istTime.getTime();
  }
  
  // If market has closed today, calculate time until tomorrow's opening
  const marketCloseTime = new Date(istTime);
  marketCloseTime.setHours(15, 30, 0, 0);
  
  if (istTime > marketCloseTime) {
    const tomorrow = new Date(istTime);
    tomorrow.setDate(istTime.getDate() + 1);
    tomorrow.setHours(9, 30, 0, 0);
    return tomorrow.getTime() - istTime.getTime();
  }
  
  // Market is currently open
  return 0;
}

/**
 * Get time until market closes (in milliseconds)
 */
export function getTimeUntilMarketClose(): number {
  if (!isMarketOpen()) {
    return 0;
  }
  
  const now = new Date();
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  
  const marketCloseTime = new Date(istTime);
  marketCloseTime.setHours(15, 30, 0, 0);
  
  return marketCloseTime.getTime() - istTime.getTime();
}

/**
 * Format time duration in human readable format
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Get IST time string
 */
export function getISTTimeString(): string {
  const now = new Date();
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return istTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}
