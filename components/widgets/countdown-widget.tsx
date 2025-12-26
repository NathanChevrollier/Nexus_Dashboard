'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  PartyPopper,
  Settings,
  Save,
  X,
} from 'lucide-react';
import type { Widget } from '@/lib/db/schema';

interface CountdownWidgetProps {
  widget: Widget;
}

interface CountdownData {
  title: string;
  targetDate: string;
  emoji?: string;
}

export function CountdownWidget({ widget }: CountdownWidgetProps) {
  const [countdown, setCountdown] = useState<CountdownData>({
    title: widget.options.countdownTitle as string || 'My Event',
    targetDate: widget.options.countdownDate as string || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    emoji: widget.options.countdownEmoji as string || '🎉',
  });
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isExpired, setIsExpired] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(countdown);

  const isCompact = widget.w <= 2 && widget.h <= 1;

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = new Date(countdown.targetDate).getTime();
      const now = Date.now();
      const difference = target - now;

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setIsExpired(false);
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [countdown.targetDate]);

  const saveCountdown = async () => {
    // Validate date
    const selectedDate = new Date(editForm.targetDate);
    if (isNaN(selectedDate.getTime())) {
      alert('Invalid date selected');
      return;
    }

    if (selectedDate <= new Date()) {
      alert('Target date must be in the future');
      return;
    }

    setCountdown(editForm);
    setIsEditing(false);

    // Persist to database
    try {
      const { updateWidget } = await import('@/lib/actions/widgets');
      await updateWidget(widget.id, {
        options: {
          ...widget.options,
          countdownTitle: editForm.title,
          countdownDate: editForm.targetDate,
          countdownEmoji: editForm.emoji,
        },
      });
    } catch (error) {
      console.error('Error saving countdown:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isEditing) {
    return (
      <Card className="w-full h-full flex flex-col overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Edit Countdown
          </h3>
        </div>

        <div className="flex-1 p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Event Title</label>
            <Input
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              placeholder="My Event"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Target Date</label>
            <Input
              type="datetime-local"
              value={editForm.targetDate.slice(0, 16)}
              onChange={(e) =>
                setEditForm({ ...editForm, targetDate: new Date(e.target.value).toISOString() })
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Emoji</label>
            <Input
              value={editForm.emoji}
              onChange={(e) => setEditForm({ ...editForm, emoji: e.target.value })}
              placeholder="🎉"
              maxLength={2}
            />
          </div>
        </div>

        <div className="p-4 border-t flex gap-2">
          <Button onClick={saveCountdown} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setEditForm(countdown);
              setIsEditing(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full flex flex-col overflow-hidden bg-gradient-to-br from-background via-primary/5 to-background">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Countdown
          </h3>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Countdown Display */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Event Title */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">{countdown.emoji}</div>
          <h2 className="text-2xl font-bold mb-1">{countdown.title}</h2>
          <p className="text-sm text-muted-foreground">{formatDate(countdown.targetDate)}</p>
        </div>

        {/* Time Display */}
        {isExpired ? (
          <div className="text-center">
            <PartyPopper className="h-16 w-16 text-primary mx-auto mb-4" />
            <p className="text-2xl font-bold">Event has passed! 🎊</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4 w-full max-w-md">
            <div className="text-center">
              <div className="bg-primary/10 rounded-lg p-4 mb-2">
                <div className="text-3xl font-bold text-primary tabular-nums">
                  {timeLeft.days}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">Days</div>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 rounded-lg p-4 mb-2">
                <div className="text-3xl font-bold text-primary tabular-nums">
                  {timeLeft.hours.toString().padStart(2, '0')}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">Hours</div>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 rounded-lg p-4 mb-2">
                <div className="text-3xl font-bold text-primary tabular-nums">
                  {timeLeft.minutes.toString().padStart(2, '0')}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">Minutes</div>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 rounded-lg p-4 mb-2">
                <div className="text-3xl font-bold text-primary tabular-nums">
                  {timeLeft.seconds.toString().padStart(2, '0')}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">Seconds</div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
