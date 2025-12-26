'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Pause,
  RotateCcw,
  Timer,
  Coffee,
  Clock,
  Settings,
} from 'lucide-react';
import type { Widget } from '@/lib/db/schema';

interface TimerWidgetProps {
  widget: Widget;
}

type TimerMode = 'pomodoro' | 'short-break' | 'long-break' | 'custom';

export function TimerWidget({ widget }: TimerWidgetProps) {
  const options = (widget.options || {}) as {
    title?: string;
    pomodoroMinutes?: number;
    shortBreakMinutes?: number;
    longBreakMinutes?: number;
    customMinutes?: number;
  };

  const baseDurationsMinutes = {
    pomodoro: options.pomodoroMinutes ?? 25,
    'short-break': options.shortBreakMinutes ?? 5,
    'long-break': options.longBreakMinutes ?? 15,
    custom: options.customMinutes ?? 30,
  } as const;

  const durations = {
    pomodoro: baseDurationsMinutes.pomodoro * 60,
    'short-break': baseDurationsMinutes['short-break'] * 60,
    'long-break': baseDurationsMinutes['long-break'] * 60,
    custom: baseDurationsMinutes.custom * 60,
  } as const;

  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [timeLeft, setTimeLeft] = useState(durations.pomodoro);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const isCompact = widget.w <= 2 && widget.h <= 1;

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    if (mode === 'pomodoro') {
      setSessions((prev) => prev + 1);
      // Play notification sound and show notification
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Pomodoro Complete!', {
            body: 'Time for a break! 🎉',
            icon: '/favicon.ico',
          });
        }
      } catch (error) {
        console.warn('Notification failed:', error);
      }
      
      // Play audio notification as fallback
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj==');
        audio.play().catch(() => {
          // Audio play failed, notification might still work
        });
      } catch (error) {
        // Ignore audio errors
      }
    }
  };

  const startTimer = () => {
    if (timeLeft === 0) {
      setTimeLeft(durations[mode]);
    }
    setIsRunning(true);

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(durations[mode]);
  };

  const changeMode = (newMode: TimerMode) => {
    setMode(newMode);
    setIsRunning(false);
    setTimeLeft(durations[newMode]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((durations[mode] - timeLeft) / durations[mode]) * 100;

  const getModeConfig = (m: TimerMode) => {
    switch (m) {
      case 'pomodoro':
        return {
          label: 'Pomodoro',
          color: 'bg-red-500',
          icon: <Timer className="h-4 w-4" />,
        };
      case 'short-break':
        return {
          label: 'Short Break',
          color: 'bg-green-500',
          icon: <Coffee className="h-4 w-4" />,
        };
      case 'long-break':
        return {
          label: 'Long Break',
          color: 'bg-blue-500',
          icon: <Coffee className="h-4 w-4" />,
        };
      case 'custom':
        return {
          label: 'Custom',
          color: 'bg-purple-500',
          icon: <Clock className="h-4 w-4" />,
        };
    }
  };

  const currentConfig = getModeConfig(mode);

  return (
    <Card className="w-full h-full flex flex-col overflow-hidden bg-gradient-to-br from-background to-accent">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" />
            {widget.options.title || 'Timer'}
          </h3>
          <Badge variant="secondary" className="flex items-center gap-1">
            {currentConfig.icon}
            {sessions} sessions
          </Badge>
        </div>
      </div>

      {/* Timer Display */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Progress Circle */}
        <div className="relative w-48 h-48 mb-6">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-muted"
            />
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 88}`}
              strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
              className={`transition-all duration-1000 ${currentConfig.color}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-5xl font-bold tabular-nums">{formatTime(timeLeft)}</div>
            <div className="text-sm text-muted-foreground mt-2">{currentConfig.label}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          {!isRunning ? (
            <Button onClick={startTimer} size="lg" className="rounded-full px-8">
              <Play className="h-5 w-5 mr-2" />
              Start
            </Button>
          ) : (
            <Button
              onClick={pauseTimer}
              size="lg"
              variant="outline"
              className="rounded-full px-8"
            >
              <Pause className="h-5 w-5 mr-2" />
              Pause
            </Button>
          )}
          <Button
            onClick={resetTimer}
            size="lg"
            variant="ghost"
            className="rounded-full px-6"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mode Selector */}
      {!isCompact && (
        <div className="p-4 border-t">
          <div className="grid grid-cols-4 gap-2">
            {(['pomodoro', 'short-break', 'long-break', 'custom'] as const).map((m) => {
              const config = getModeConfig(m);
              return (
                <button
                  key={m}
                  onClick={() => changeMode(m)}
                  disabled={isRunning}
                  className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                    mode === m
                      ? `${config.color} text-white border-transparent`
                      : 'border-muted text-muted-foreground hover:bg-accent'
                  } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex flex-col items-center gap-1">
                    {config.icon}
                    <span className="hidden sm:inline">{config.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
