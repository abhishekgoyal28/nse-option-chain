import { 
  calculateTrend, 
  calculateVolatility, 
  calculateAverage,
  calculateImpliedVolatility 
} from '@/utils/calculations';

describe('Calculations Utils', () => {
  describe('calculateTrend', () => {
    it('should calculate positive trend correctly', () => {
      const prices = [100, 105, 110];
      const trend = calculateTrend(prices);
      expect(trend).toBe(0.1); // 10% increase
    });

    it('should calculate negative trend correctly', () => {
      const prices = [110, 105, 100];
      const trend = calculateTrend(prices);
      expect(trend).toBeCloseTo(-0.091, 3); // ~9.1% decrease
    });

    it('should return 0 for insufficient data', () => {
      const prices = [100];
      const trend = calculateTrend(prices);
      expect(trend).toBe(0);
    });
  });

  describe('calculateAverage', () => {
    it('should calculate average correctly', () => {
      const numbers = [10, 20, 30, 40, 50];
      const average = calculateAverage(numbers);
      expect(average).toBe(30);
    });

    it('should return 0 for empty array', () => {
      const numbers: number[] = [];
      const average = calculateAverage(numbers);
      expect(average).toBe(0);
    });
  });

  describe('calculateVolatility', () => {
    it('should calculate volatility for price series', () => {
      const prices = [100, 102, 98, 105, 95];
      const volatility = calculateVolatility(prices);
      expect(volatility).toBeGreaterThan(0);
    });

    it('should return 0 for insufficient data', () => {
      const prices = [100];
      const volatility = calculateVolatility(prices);
      expect(volatility).toBe(0);
    });
  });

  describe('calculateImpliedVolatility', () => {
    it('should calculate IV for call option', () => {
      const iv = calculateImpliedVolatility(50, 18000, 18000, '2024-01-25', 'CE');
      expect(iv).toBeGreaterThan(0);
      expect(iv).toBeLessThanOrEqual(100);
    });

    it('should calculate IV for put option', () => {
      const iv = calculateImpliedVolatility(50, 18000, 18000, '2024-01-25', 'PE');
      expect(iv).toBeGreaterThan(0);
      expect(iv).toBeLessThanOrEqual(100);
    });
  });
});
