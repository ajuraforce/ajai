import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

export interface User {
  id: string;
  email: string;
  password: string;
  createdAt: Date;
  preferences?: any;
}

export interface AuthToken {
  token: string;
  user: Omit<User, 'password'>;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  email: string;
  password: string;
}

export class AuthService {
  private users: Map<string, User> = new Map();
  private readonly JWT_SECRET: string;
  private readonly TOKEN_EXPIRY = '7d';

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_change_in_production';
    
    // Create a default demo user for testing
    this.createDemoUser();
  }

  private async createDemoUser(): Promise<void> {
    const demoUser: User = {
      id: 'demo-user-id',
      email: 'demo@ajai.com',
      password: await bcrypt.hash('demo123', 10),
      createdAt: new Date(),
      preferences: {
        watchlist: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'],
        theme: 'dark',
        notifications: true
      }
    };
    
    this.users.set(demoUser.id, demoUser);
    console.log('👤 Demo user created: demo@ajai.com / demo123');
  }

  async register(data: RegisterData): Promise<AuthToken> {
    // Check if user already exists
    const existingUser = Array.from(this.users.values()).find(u => u.email === data.email);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error('Invalid email format');
    }

    // Validate password strength
    if (data.password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create new user
    const user: User = {
      id: randomUUID(),
      email: data.email.toLowerCase(),
      password: hashedPassword,
      createdAt: new Date(),
      preferences: {
        watchlist: ['BTCUSDT', 'ETHUSDT'],
        theme: 'dark',
        notifications: true
      }
    };

    this.users.set(user.id, user);

    // Generate JWT token
    const token = this.generateToken(user);
    
    console.log(`👤 New user registered: ${user.email}`);
    
    return {
      token,
      user: this.sanitizeUser(user)
    };
  }

  async login(credentials: LoginCredentials): Promise<AuthToken> {
    // Find user by email
    const user = Array.from(this.users.values()).find(u => u.email === credentials.email.toLowerCase());
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = this.generateToken(user);
    
    console.log(`🔐 User logged in: ${user.email}`);
    
    return {
      token,
      user: this.sanitizeUser(user)
    };
  }

  async verifyToken(token: string): Promise<Omit<User, 'password'> | null> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      const user = this.users.get(decoded.id);
      
      if (!user) {
        return null;
      }
      
      return this.sanitizeUser(user);
    } catch (error) {
      console.warn('Invalid token:', error);
      return null;
    }
  }

  async getUserById(id: string): Promise<Omit<User, 'password'> | null> {
    const user = this.users.get(id);
    return user ? this.sanitizeUser(user) : null;
  }

  async updateUserPreferences(userId: string, preferences: any): Promise<Omit<User, 'password'> | null> {
    const user = this.users.get(userId);
    if (!user) {
      return null;
    }

    user.preferences = { ...user.preferences, ...preferences };
    this.users.set(userId, user);
    
    return this.sanitizeUser(user);
  }

  async getAllUsers(): Promise<Omit<User, 'password'>[]> {
    return Array.from(this.users.values()).map(this.sanitizeUser);
  }

  async deleteUser(userId: string): Promise<boolean> {
    return this.users.delete(userId);
  }

  private generateToken(user: User): string {
    return jwt.sign(
      { 
        id: user.id, 
        email: user.email 
      },
      this.JWT_SECRET,
      { expiresIn: this.TOKEN_EXPIRY }
    );
  }

  private sanitizeUser(user: User): Omit<User, 'password'> {
    const { password, ...sanitized } = user;
    return sanitized;
  }

  // Statistics for admin/monitoring
  getStats(): { totalUsers: number; activeUsers: number } {
    const totalUsers = this.users.size;
    const recentUsers = Array.from(this.users.values()).filter(
      u => Date.now() - u.createdAt.getTime() < 7 * 24 * 60 * 60 * 1000 // Last 7 days
    );
    
    return {
      totalUsers,
      activeUsers: recentUsers.length
    };
  }
}

// Singleton instance
export const authService = new AuthService();