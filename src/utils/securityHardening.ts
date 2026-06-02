import { supabase } from '@/integrations/supabase/client';

// Security validation and hardening utilities
export class SecurityValidator {
  // Validate portfolio points calculations to prevent manipulation
  async validatePointsCalculation(
    eventType: string,
    expectedPoints: number,
    actualPoints: number,
    metadata?: Record<string, any>
  ): Promise<{ valid: boolean; message: string }> {
    // Base points validation
    const basePointsMap: Record<string, number> = {
      rent_payment: 50,
      lease_signing: 100,
      maintenance_completion: 25,
      lease_renewal: 60,
      property_inspection: 30
    };

    const basePoints = basePointsMap[eventType];
    if (!basePoints) {
      return { valid: false, message: `Unknown event type: ${eventType}` };
    }

    let calculatedPoints = basePoints;

    // Apply bonuses based on metadata
    if (metadata?.isEarly && eventType === 'rent_payment') {
      calculatedPoints *= 1.2; // 20% bonus
    }

    if (metadata?.monthsRetained && eventType === 'lease_renewal') {
      const multiplier = Math.min(metadata.monthsRetained / 12, 2);
      calculatedPoints *= multiplier;
    }

    const tolerance = 0.01; // Allow for small rounding differences
    const isValid = Math.abs(calculatedPoints - actualPoints) <= tolerance;

    return {
      valid: isValid,
      message: isValid 
        ? 'Points calculation is valid'
        : `Expected ${calculatedPoints}, got ${actualPoints}`
    };
  }

  // Anti-fraud mechanisms
  async detectSuspiciousActivity(
    userId: string,
    portfolioId: string
  ): Promise<{ 
    suspicious: boolean; 
    reasons: string[]; 
    riskScore: number 
  }> {
    const reasons: string[] = [];
    let riskScore = 0;

    // Check for unusual point accumulation patterns
    const { data: recentPoints } = await supabase
      .from('portfolio_points')
      .select('points_awarded, created_at, source_event_type')
      .eq('portfolio_id', portfolioId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (recentPoints && recentPoints.length > 0) {
      const totalPointsToday = recentPoints.reduce((sum, p) => sum + Number(p.points_awarded), 0);
      
      // Flag if more than 1000 points in a day
      if (totalPointsToday > 1000) {
        reasons.push('Unusually high points accumulation in 24 hours');
        riskScore += 30;
      }

      // Check for rapid-fire events (same event type within minutes)
      const eventTypes = recentPoints.map(p => ({ 
        type: p.source_event_type, 
        time: new Date(p.created_at) 
      }));

      for (let i = 0; i < eventTypes.length - 1; i++) {
        const current = eventTypes[i];
        const next = eventTypes[i + 1];
        
        if (current.type === next.type) {
          const timeDiff = Math.abs(current.time.getTime() - next.time.getTime());
          if (timeDiff < 60000) { // Less than 1 minute
            reasons.push('Rapid duplicate events detected');
            riskScore += 20;
            break;
          }
        }
      }
    }

    // Check for unusual distribution patterns
    const { data: distributions } = await supabase
      .from('portfolio_points_distribution')
      .select('distribution_percent, user_id')
      .eq('portfolio_id', portfolioId)
      .eq('active', true);

    if (distributions) {
      const userDistribution = distributions.find(d => d.user_id === userId);
      if (userDistribution && Number(userDistribution.distribution_percent) > 80) {
        reasons.push('User has unusually high points distribution percentage');
        riskScore += 25;
      }
    }

    return {
      suspicious: riskScore > 50,
      reasons,
      riskScore
    };
  }

  // Input sanitization
  sanitizeInput(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  // Validate user permissions for sensitive operations
  async validateUserPermission(
    userId: string,
    portfolioId: string,
    requiredRole: string[]
  ): Promise<{ authorized: boolean; userRole?: string }> {
    try {
      const { data: userRole } = await supabase.rpc('get_user_portfolio_role', {
        p_portfolio_id: portfolioId,
        p_user_id: userId
      });

      const authorized = userRole && requiredRole.includes(userRole);

      return { authorized: !!authorized, userRole };
    } catch (error) {
      console.error('Permission validation error:', error);
      return { authorized: false };
    }
  }

  // Audit logging for sensitive operations
  async logSecurityEvent(
    userId: string,
    eventType: 'permission_denied' | 'suspicious_activity' | 'fraud_attempt' | 'unauthorized_access',
    details: Record<string, any>
  ) {
    const securityEvent = {
      user_id: userId,
      event_type: eventType,
      details: JSON.stringify(details),
      timestamp: new Date().toISOString(),
      ip_address: this.getClientIP(),
      user_agent: navigator.userAgent
    };

    console.warn('Security Event:', securityEvent);

    // In a production system, this would be sent to a security monitoring service
    // For now, we'll log it locally
    if (typeof window !== 'undefined') {
      const existingLogs = JSON.parse(localStorage.getItem('security_logs') || '[]');
      existingLogs.push(securityEvent);
      
      // Keep only last 100 security events
      if (existingLogs.length > 100) {
        existingLogs.shift();
      }
      
      localStorage.setItem('security_logs', JSON.stringify(existingLogs));
    }
  }

  private getClientIP(): string {
    // This would typically be handled server-side
    // Client-side IP detection is not reliable
    return 'client-side-unknown';
  }

  // Rate limiting for sensitive operations
  private operationCounts = new Map<string, { count: number; resetTime: number }>();

  async checkOperationLimit(
    userId: string,
    operation: string,
    maxOperations: number = 5,
    windowMs: number = 60000
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `${userId}:${operation}`;
    const now = Date.now();
    const existing = this.operationCounts.get(key);

    if (!existing || now > existing.resetTime) {
      const resetTime = now + windowMs;
      this.operationCounts.set(key, { count: 1, resetTime });
      return { allowed: true, remaining: maxOperations - 1, resetTime };
    }

    if (existing.count >= maxOperations) {
      await this.logSecurityEvent(userId, 'suspicious_activity', {
        operation,
        attempts: existing.count,
        message: 'Rate limit exceeded'
      });
      
      return { allowed: false, remaining: 0, resetTime: existing.resetTime };
    }

    existing.count++;
    this.operationCounts.set(key, existing);

    return { 
      allowed: true, 
      remaining: maxOperations - existing.count, 
      resetTime: existing.resetTime 
    };
  }
}

// Data encryption utilities for sensitive information
export class DataEncryption {
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  // Simple XOR encryption for demo purposes
  // In production, use proper encryption libraries
  async encryptSensitiveData(data: string, key: string): Promise<string> {
    const dataBytes = this.encoder.encode(data);
    const keyBytes = this.encoder.encode(key);
    
    const encrypted = new Uint8Array(dataBytes.length);
    for (let i = 0; i < dataBytes.length; i++) {
      encrypted[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    return btoa(String.fromCharCode(...encrypted));
  }

  async decryptSensitiveData(encryptedData: string, key: string): Promise<string> {
    const encrypted = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );
    const keyBytes = this.encoder.encode(key);
    
    const decrypted = new Uint8Array(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
    }
    
    return this.decoder.decode(decrypted);
  }

  // Generate secure random tokens
  generateSecureToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Hash sensitive data for comparison
  async hashData(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}
