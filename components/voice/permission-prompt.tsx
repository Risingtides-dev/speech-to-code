'use client';

import { useEffect, useState } from 'react';
import { Mic, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PermissionPromptProps {
  onGranted: () => void;
  onDenied?: () => void;
  className?: string;
}

type PermissionStatus = 'unknown' | 'prompt' | 'granted' | 'denied' | 'checking';

export function PermissionPrompt({ onGranted, onDenied, className }: PermissionPromptProps) {
  const [status, setStatus] = useState<PermissionStatus>('unknown');
  const [isRequesting, setIsRequesting] = useState(false);

  // Check initial permission status
  useEffect(() => {
    const checkPermission = async () => {
      setStatus('checking');
      
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setStatus(result.state as PermissionStatus);
        
        if (result.state === 'granted') {
          onGranted();
        }
        
        // Listen for changes
        result.addEventListener('change', () => {
          setStatus(result.state as PermissionStatus);
          if (result.state === 'granted') {
            onGranted();
          } else if (result.state === 'denied') {
            onDenied?.();
          }
        });
      } catch {
        // Firefox doesn't support permission query for microphone
        setStatus('prompt');
      }
    };

    checkPermission();
  }, [onGranted, onDenied]);

  const requestPermission = async () => {
    setIsRequesting(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      
      // Stop tracks immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      setStatus('granted');
      onGranted();
    } catch (error) {
      const err = error as Error;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStatus('denied');
        onDenied?.();
      }
    } finally {
      setIsRequesting(false);
    }
  };

  // Already granted
  if (status === 'granted') {
    return null;
  }

  // Checking
  if (status === 'checking' || status === 'unknown') {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Denied
  if (status === 'denied') {
    return (
      <div className={cn('flex flex-col items-center gap-4 p-8 text-center', className)}>
        <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Microphone Access Denied</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-[300px]">
            Voice features require microphone access. Please enable it in your browser settings and refresh the page.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
        >
          Refresh Page
        </Button>
      </div>
    );
  }

  // Prompt
  return (
    <div className={cn('flex flex-col items-center gap-4 p-8 text-center', className)}>
      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Mic className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold text-lg">Enable Voice</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-[300px]">
          Allow microphone access to use voice commands with your coding agent.
        </p>
      </div>
      <Button 
        onClick={requestPermission}
        disabled={isRequesting}
        className="min-w-[140px]"
      >
        {isRequesting ? (
          <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          'Enable Microphone'
        )}
      </Button>
    </div>
  );
}
