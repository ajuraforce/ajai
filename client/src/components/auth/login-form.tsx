import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useNotificationHelpers } from '@/components/ui/notification-system';
import { apiRequest } from '@/lib/queryClient';
import { Eye, EyeOff, LogIn, UserPlus, TrendingUp } from 'lucide-react';

interface LoginFormProps {
  onLogin: (user: any, token: string) => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { success, error } = useNotificationHelpers();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      error('Email and password are required');
      return;
    }

    if (isRegister && password.length < 6) {
      error('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    
    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const response = await apiRequest('POST', endpoint, { email, password });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Store token in localStorage
      localStorage.setItem('authToken', data.token);
      
      // Notify success
      success(isRegister ? 'Account created successfully!' : 'Welcome back!');
      
      // Call parent callback
      onLogin(data.user, data.token);
      
    } catch (err: any) {
      error(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('demo@ajai.com');
    setPassword('demo123');
    setIsRegister(false);
    
    // Auto-submit after a brief delay
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        form.requestSubmit();
      }
    }, 100);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4">
      <Card className="w-full max-w-md p-8 bg-card/95 backdrop-blur-sm border border-border/20">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <TrendingUp className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">AJAI</h1>
          </div>
          <p className="text-muted-foreground">
            {isRegister ? 'Create your account to start trading' : 'Sign in to your trading account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              data-testid="input-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegister ? 'Choose a strong password' : 'Enter your password'}
                required
                data-testid="input-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                onClick={() => setShowPassword(!showPassword)}
                data-testid="button-toggle-password"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {isRegister && (
              <p className="text-xs text-muted-foreground">
                Password must be at least 6 characters long
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            data-testid="button-submit"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{isRegister ? 'Creating Account...' : 'Signing In...'}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                {isRegister ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
              </div>
            )}
          </Button>
        </form>

        <div className="mt-6 space-y-4">
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm"
              data-testid="button-toggle-mode"
            >
              {isRegister 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Sign up"
              }
            </Button>
          </div>

          <div className="border-t border-border pt-4">
            <div className="text-center mb-3">
              <Badge variant="outline" className="text-xs">
                Try Demo Account
              </Badge>
            </div>
            <Button
              variant="outline"
              onClick={handleDemoLogin}
              className="w-full text-sm"
              data-testid="button-demo-login"
            >
              Demo Login (demo@ajai.com / demo123)
            </Button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Real-time crypto data • AI-powered signals • Portfolio management
          </p>
        </div>
      </Card>
    </div>
  );
}