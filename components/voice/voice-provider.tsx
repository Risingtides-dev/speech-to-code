'use client';

import { createContext, useContext, useCallback, useState, useEffect, useRef, type ReactNode } from 'react';
import { XAIVoiceClient, type VoiceConnectionState, type VoiceTurnState } from '@/lib/voice/xai-client';
import { type RecorderState } from '@/lib/voice/audio-processor';
import { type PlaybackState } from '@/lib/voice/audio-player';

interface VoiceContextValue {
  // State
  connectionState: VoiceConnectionState;
  turnState: VoiceTurnState;
  recorderState: RecorderState;
  playbackState: PlaybackState;
  inputVolume: number;
  
  // Transcripts
  userTranscript: string;
  agentText: string;
  
  // Actions
  connect: () => Promise<boolean>;
  disconnect: () => void;
  startListening: () => void;
  stopListening: () => void;
  interrupt: () => void;
  sendText: (text: string) => void;
  
  // Initialization
  initialize: () => Promise<boolean>;
  isInitialized: boolean;
  error: Error | null;
}

const VoiceContext = createContext<VoiceContextValue | null>(null);

export function useVoice() {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
}

interface VoiceProviderProps {
  children: ReactNode;
  onToolCall?: (toolName: string, args: unknown) => void;
}

export function VoiceProvider({ children, onToolCall }: VoiceProviderProps) {
  const clientRef = useRef<XAIVoiceClient | null>(null);
  
  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [connectionState, setConnectionState] = useState<VoiceConnectionState>('disconnected');
  const [turnState, setTurnState] = useState<VoiceTurnState>('idle');
  const [recorderState, setRecorderState] = useState<RecorderState>('inactive');
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [inputVolume, setInputVolume] = useState(0);
  const [userTranscript, setUserTranscript] = useState('');
  const [agentText, setAgentText] = useState('');

  // Initialize voice client
  const initialize = useCallback(async (): Promise<boolean> => {
    if (clientRef.current || isInitialized) return true;

    try {
      const client = new XAIVoiceClient({
        onConnectionChange: setConnectionState,
        onTurnChange: setTurnState,
        onRecorderState: setRecorderState,
        onPlaybackState: setPlaybackState,
        onInputVolume: setInputVolume,
        onTranscript: (text, isFinal) => {
          if (isFinal) {
            setUserTranscript(text);
          }
        },
        onAgentText: (text, isFinal) => {
          setAgentText(prev => isFinal ? text : prev + text);
        },
        onToolCall: (toolName, args) => {
          onToolCall?.(toolName, args);
        },
        onError: setError,
      });

      const success = await client.initialize();
      if (success) {
        clientRef.current = client;
        setIsInitialized(true);
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize voice'));
      return false;
    }
  }, [isInitialized, onToolCall]);

  // Actions
  const connect = useCallback(async (): Promise<boolean> => {
    if (!clientRef.current) {
      const initialized = await initialize();
      if (!initialized) return false;
    }
    return clientRef.current!.connect();
  }, [initialize]);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
  }, []);

  const startListening = useCallback(() => {
    setUserTranscript('');
    setAgentText('');
    clientRef.current?.startListening();
  }, []);

  const stopListening = useCallback(() => {
    clientRef.current?.stopListening();
  }, []);

  const interrupt = useCallback(() => {
    clientRef.current?.interrupt();
  }, []);

  const sendText = useCallback((text: string) => {
    setAgentText('');
    clientRef.current?.sendTextMessage(text);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clientRef.current?.dispose();
    };
  }, []);

  const value: VoiceContextValue = {
    connectionState,
    turnState,
    recorderState,
    playbackState,
    inputVolume,
    userTranscript,
    agentText,
    connect,
    disconnect,
    startListening,
    stopListening,
    interrupt,
    sendText,
    initialize,
    isInitialized,
    error,
  };

  return (
    <VoiceContext.Provider value={value}>
      {children}
    </VoiceContext.Provider>
  );
}
