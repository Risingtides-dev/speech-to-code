'use client';

import { useState, useCallback } from 'react';
import { VoiceProvider, VoiceControls, PermissionPrompt, useVoice } from '@/components/voice';
import { AgentRenderer } from '@/components/agent-ui';
import { AgentEventSource } from '@/lib/events/event-source';
import { type AgentEvent } from '@/lib/events/event-types';
import { MessageSquare, Zap, Settings, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function VoiceAgentPage() {
  const [hasPermission, setHasPermission] = useState(false);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const handleToolCall = useCallback((toolName: string, args: unknown) => {
    console.log('[VoiceAgent] Tool call from voice:', toolName, args);
  }, []);

  const handleDemoMode = useCallback(() => {
    setEvents([]);
    setIsStreaming(true);

    const eventSource = new AgentEventSource({
      onEvent: (event) => {
        setEvents(prev => [...prev, event]);
      },
      onStateChange: (state) => {
        if (state === 'closed') {
          setIsStreaming(false);
        }
      },
      onError: (err) => {
        console.error('[VoiceAgent] Event stream error:', err);
        setIsStreaming(false);
      },
    });

    eventSource.connect('/api/events/stream');

    return () => eventSource.disconnect();
  }, []);

  return (
    <VoiceProvider onToolCall={handleToolCall}>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="flex h-14 items-center px-4 max-w-3xl mx-auto w-full">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <span className="font-semibold">Voice Agent</span>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Info className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 flex flex-col">
          {!hasPermission ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <PermissionPrompt 
                onGranted={() => setHasPermission(true)}
                onDenied={() => console.log('Permission denied')}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {/* Event stream / UI area */}
              <ScrollArea className="flex-1">
                <div className="max-w-3xl mx-auto py-6 px-4">
                  {events.length === 0 && !isStreaming ? (
                    <EmptyState onDemo={handleDemoMode} />
                  ) : (
                    <AgentRenderer events={events} />
                  )}
                </div>
              </ScrollArea>

              {/* Voice controls dock */}
              <VoiceControlsDock onDemoMode={handleDemoMode} />
            </div>
          )}
        </main>
      </div>
    </VoiceProvider>
  );
}

function VoiceControlsDock({ onDemoMode }: { onDemoMode: () => void }) {
  const { userTranscript, agentText } = useVoice();

  return (
    <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky bottom-0">
      <div className="max-w-3xl mx-auto py-4 px-4">
        {/* Transcripts */}
        {(userTranscript || agentText) && (
          <div className="mb-4 space-y-2">
            {userTranscript && (
              <div className="flex gap-2 items-start">
                <span className="text-xs text-muted-foreground shrink-0">You:</span>
                <p className="text-sm">{userTranscript}</p>
              </div>
            )}
            {agentText && (
              <div className="flex gap-2 items-start">
                <span className="text-xs text-emerald-500 shrink-0">Agent:</span>
                <p className="text-sm text-muted-foreground">
                  {agentText}
                  <span className="inline-block w-1.5 h-4 ml-0.5 bg-emerald-500 animate-pulse" />
                </p>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <VoiceControls 
          onDemoMode={onDemoMode}
          className="py-2"
        />
      </div>
    </div>
  );
}

function EmptyState({ onDemo }: { onDemo: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold mb-2">Ready to assist</h2>
      <p className="text-sm text-muted-foreground max-w-[300px] mb-6">
        Tap the microphone to start a voice conversation with your coding agent, or try the demo to see the UI in action.
      </p>
      <Button variant="outline" onClick={onDemo}>
        Run Demo
      </Button>
    </div>
  );
}
