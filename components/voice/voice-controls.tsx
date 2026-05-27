'use client';

import { useVoice } from './voice-provider';
import { cn } from '@/lib/utils';
import { Mic, MicOff, Phone, PhoneOff, Square, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AudioVisualizer } from './audio-visualizer';

interface VoiceControlsProps {
  className?: string;
  onDemoMode?: () => void;
}

export function VoiceControls({ className, onDemoMode }: VoiceControlsProps) {
  const {
    connectionState,
    turnState,
    recorderState,
    inputVolume,
    isInitialized,
    error,
    connect,
    disconnect,
    startListening,
    stopListening,
    interrupt,
    initialize,
  } = useVoice();

  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting' || connectionState === 'reconnecting';
  const isListening = recorderState === 'recording';
  const isSpeaking = turnState === 'speaking';
  const isProcessing = turnState === 'processing';

  const handleMicClick = async () => {
    if (!isInitialized) {
      await initialize();
    }
    
    if (!isConnected) {
      await connect();
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleInterrupt = () => {
    interrupt();
  };

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* Status indicator */}
      <div className="flex items-center gap-2 text-sm">
        <div className={cn(
          'h-2 w-2 rounded-full',
          connectionState === 'connected' && 'bg-emerald-500',
          connectionState === 'connecting' && 'bg-amber-500 animate-pulse',
          connectionState === 'reconnecting' && 'bg-amber-500 animate-pulse',
          connectionState === 'disconnected' && 'bg-muted-foreground',
          connectionState === 'error' && 'bg-red-500',
        )} />
        <span className="text-muted-foreground capitalize">
          {turnState !== 'idle' ? turnState : connectionState}
        </span>
      </div>

      {/* Audio visualizer */}
      {isConnected && (
        <AudioVisualizer
          volume={isListening ? inputVolume : 0}
          isActive={isListening || isSpeaking}
          variant={isSpeaking ? 'output' : 'input'}
        />
      )}

      {/* Main controls */}
      <div className="flex items-center gap-3">
        {/* Interrupt button (when agent is speaking) */}
        {isSpeaking && (
          <Button
            variant="outline"
            size="icon"
            onClick={handleInterrupt}
            className="h-12 w-12 rounded-full border-red-500/50 text-red-500 hover:bg-red-500/10"
          >
            <Square className="h-5 w-5" />
          </Button>
        )}

        {/* Main mic button */}
        <button
          onClick={handleMicClick}
          disabled={isConnecting || isProcessing}
          className={cn(
            'relative h-16 w-16 rounded-full transition-all duration-200',
            'flex items-center justify-center',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
            isListening && 'bg-red-500 text-white scale-110',
            !isListening && isConnected && 'bg-primary text-primary-foreground hover:scale-105',
            !isConnected && 'bg-muted text-muted-foreground hover:bg-muted/80',
            (isConnecting || isProcessing) && 'opacity-50 cursor-not-allowed',
          )}
        >
          {isConnecting ? (
            <div className="h-6 w-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : isListening ? (
            <Mic className="h-7 w-7" />
          ) : (
            <MicOff className="h-7 w-7" />
          )}
          
          {/* Pulse ring when listening */}
          {isListening && (
            <>
              <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
              <span className="absolute inset-0 rounded-full bg-red-500/50 animate-pulse" />
            </>
          )}
        </button>

        {/* Disconnect button */}
        {isConnected && (
          <Button
            variant="outline"
            size="icon"
            onClick={handleDisconnect}
            className="h-12 w-12 rounded-full"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Helper text */}
      <p className="text-xs text-muted-foreground text-center max-w-[200px]">
        {!isInitialized && 'Tap to enable voice'}
        {isInitialized && !isConnected && 'Tap to connect'}
        {isConnected && !isListening && !isSpeaking && 'Tap to speak'}
        {isListening && 'Listening... tap to stop'}
        {isProcessing && 'Processing...'}
        {isSpeaking && 'Agent speaking...'}
      </p>

      {/* Error display */}
      {error && (
        <div className="text-xs text-red-500 text-center max-w-[250px]">
          {error.message}
        </div>
      )}

      {/* Demo mode button */}
      {onDemoMode && !isConnected && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDemoMode}
          className="text-xs text-muted-foreground"
        >
          Try demo mode
        </Button>
      )}
    </div>
  );
}
