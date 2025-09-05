// Environment Configuration for Production Deployment
// Centralized configuration management with validation and defaults

export interface EnvironmentConfig {
  // Server Configuration
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  API_URL: string;
  
  // Database Configuration
  DATABASE_URL: string;
  
  // External API Keys
  OPENAI_API_KEY: string;
  ALPACA_API_KEY: string;
  ALPACA_SECRET_KEY: string;
  ALPACA_BASE_URL: string;
  
  // Trading Configuration
  ENABLE_LIVE_TRADING: boolean;
  DEFAULT_TRADE_AMOUNT: number;
  MAX_RISK_PER_TRADE: number;
  DAILY_OPENAI_BUDGET: number;
  
  // Security Configuration
  SESSION_SECRET: string;
  CORS_ORIGIN: string[];
  
  // Feature Flags
  ENABLE_NEWS_FEED: boolean;
  ENABLE_NOTIFICATIONS: boolean;
  ENABLE_TECHNICAL_ANALYSIS: boolean;
  ENABLE_RISK_MANAGEMENT: boolean;
  
  // Performance Configuration
  WEBSOCKET_PING_INTERVAL: number;
  NEWS_FETCH_INTERVAL: number;
  SIGNAL_GENERATION_INTERVAL: number;
}

class ConfigValidator {
  static validateRequired(key: string, value: any): void {
    if (value === undefined || value === null || value === '') {
      throw new Error(`Required environment variable ${key} is missing`);
    }
  }

  static validateNumber(key: string, value: any, min?: number, max?: number): number {
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`Environment variable ${key} must be a valid number`);
    }
    if (min !== undefined && num < min) {
      throw new Error(`Environment variable ${key} must be >= ${min}`);
    }
    if (max !== undefined && num > max) {
      throw new Error(`Environment variable ${key} must be <= ${max}`);
    }
    return num;
  }

  static validateBoolean(key: string, value: any): boolean {
    if (typeof value === 'boolean') return value;
    const str = String(value).toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(str)) return true;
    if (['false', '0', 'no', 'off'].includes(str)) return false;
    throw new Error(`Environment variable ${key} must be a valid boolean`);
  }

  static validateArray(key: string, value: any): string[] {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value.split(',').map(s => s.trim()).filter(Boolean);
    }
    throw new Error(`Environment variable ${key} must be a valid array or comma-separated string`);
  }
}

export function loadEnvironmentConfig(): EnvironmentConfig {
  try {
    const config: EnvironmentConfig = {
      // Server Configuration
      PORT: ConfigValidator.validateNumber('PORT', process.env.PORT || 5000, 1024, 65535),
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
      API_URL: process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`,
      
      // Database Configuration
      DATABASE_URL: process.env.DATABASE_URL || '',
      
      // External API Keys
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      ALPACA_API_KEY: process.env.ALPACA_API_KEY || '',
      ALPACA_SECRET_KEY: process.env.ALPACA_SECRET_KEY || '',
      ALPACA_BASE_URL: process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets',
      
      // Trading Configuration
      ENABLE_LIVE_TRADING: ConfigValidator.validateBoolean('ENABLE_LIVE_TRADING', process.env.ENABLE_LIVE_TRADING || false),
      DEFAULT_TRADE_AMOUNT: ConfigValidator.validateNumber('DEFAULT_TRADE_AMOUNT', process.env.DEFAULT_TRADE_AMOUNT || 1000, 1),
      MAX_RISK_PER_TRADE: ConfigValidator.validateNumber('MAX_RISK_PER_TRADE', process.env.MAX_RISK_PER_TRADE || 2, 0.1, 10),
      DAILY_OPENAI_BUDGET: ConfigValidator.validateNumber('DAILY_OPENAI_BUDGET', process.env.DAILY_OPENAI_BUDGET || 20, 1, 1000),
      
      // Security Configuration
      SESSION_SECRET: process.env.SESSION_SECRET || 'default-session-secret-change-in-production',
      CORS_ORIGIN: ConfigValidator.validateArray('CORS_ORIGIN', process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5000'),
      
      // Feature Flags
      ENABLE_NEWS_FEED: ConfigValidator.validateBoolean('ENABLE_NEWS_FEED', process.env.ENABLE_NEWS_FEED || true),
      ENABLE_NOTIFICATIONS: ConfigValidator.validateBoolean('ENABLE_NOTIFICATIONS', process.env.ENABLE_NOTIFICATIONS || true),
      ENABLE_TECHNICAL_ANALYSIS: ConfigValidator.validateBoolean('ENABLE_TECHNICAL_ANALYSIS', process.env.ENABLE_TECHNICAL_ANALYSIS || true),
      ENABLE_RISK_MANAGEMENT: ConfigValidator.validateBoolean('ENABLE_RISK_MANAGEMENT', process.env.ENABLE_RISK_MANAGEMENT || true),
      
      // Performance Configuration
      WEBSOCKET_PING_INTERVAL: ConfigValidator.validateNumber('WEBSOCKET_PING_INTERVAL', process.env.WEBSOCKET_PING_INTERVAL || 30000, 5000),
      NEWS_FETCH_INTERVAL: ConfigValidator.validateNumber('NEWS_FETCH_INTERVAL', process.env.NEWS_FETCH_INTERVAL || 120000, 30000),
      SIGNAL_GENERATION_INTERVAL: ConfigValidator.validateNumber('SIGNAL_GENERATION_INTERVAL', process.env.SIGNAL_GENERATION_INTERVAL || 300000, 60000)
    };

    // Production-specific validations
    if (config.NODE_ENV === 'production') {
      ConfigValidator.validateRequired('DATABASE_URL', config.DATABASE_URL);
      ConfigValidator.validateRequired('SESSION_SECRET', config.SESSION_SECRET);
      
      if (config.SESSION_SECRET === 'default-session-secret-change-in-production') {
        throw new Error('SESSION_SECRET must be changed in production');
      }
      
      if (config.ENABLE_LIVE_TRADING) {
        ConfigValidator.validateRequired('ALPACA_API_KEY', config.ALPACA_API_KEY);
        ConfigValidator.validateRequired('ALPACA_SECRET_KEY', config.ALPACA_SECRET_KEY);
      }
    }

    return config;
  } catch (error) {
    console.error('❌ Environment configuration error:', error);
    throw error;
  }
}

// Singleton configuration instance
let configInstance: EnvironmentConfig | null = null;

export function getConfig(): EnvironmentConfig {
  if (!configInstance) {
    configInstance = loadEnvironmentConfig();
  }
  return configInstance;
}

export function isDevelopment(): boolean {
  return getConfig().NODE_ENV === 'development';
}

export function isProduction(): boolean {
  return getConfig().NODE_ENV === 'production';
}

export function isTest(): boolean {
  return getConfig().NODE_ENV === 'test';
}

// Configuration logging (safe for production)
export function logConfiguration(): void {
  const config = getConfig();
  
  console.log('🔧 Application Configuration:');
  console.log(`   Environment: ${config.NODE_ENV}`);
  console.log(`   Port: ${config.PORT}`);
  console.log(`   Database: ${config.DATABASE_URL ? '✅ Connected' : '❌ Not configured'}`);
  console.log(`   OpenAI: ${config.OPENAI_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   Alpaca: ${config.ALPACA_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   Live Trading: ${config.ENABLE_LIVE_TRADING ? '🔴 ENABLED' : '🟡 Simulation'}`);
  console.log(`   News Feed: ${config.ENABLE_NEWS_FEED ? '✅' : '❌'}`);
  console.log(`   Technical Analysis: ${config.ENABLE_TECHNICAL_ANALYSIS ? '✅' : '❌'}`);
  console.log(`   Risk Management: ${config.ENABLE_RISK_MANAGEMENT ? '✅' : '❌'}`);
}