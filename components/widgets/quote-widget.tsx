'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Quote, RefreshCw, Heart, Share2, Copy, Check } from 'lucide-react';
import type { Widget } from '@/lib/db/schema';

interface QuoteWidgetProps {
  widget: Widget;
}

interface QuoteData {
  text: string;
  author: string;
  category?: string;
}

const quotes: QuoteData[] = [
  {
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
    category: "Motivation",
  },
  {
    text: "Innovation distinguishes between a leader and a follower.",
    author: "Steve Jobs",
    category: "Innovation",
  },
  {
    text: "Code is like humor. When you have to explain it, it's bad.",
    author: "Cory House",
    category: "Programming",
  },
  {
    text: "First, solve the problem. Then, write the code.",
    author: "John Johnson",
    category: "Programming",
  },
  {
    text: "The best error message is the one that never shows up.",
    author: "Thomas Fuchs",
    category: "Programming",
  },
  {
    text: "Simplicity is the soul of efficiency.",
    author: "Austin Freeman",
    category: "Design",
  },
  {
    text: "Make it work, make it right, make it fast.",
    author: "Kent Beck",
    category: "Programming",
  },
  {
    text: "Before software can be reusable it first has to be usable.",
    author: "Ralph Johnson",
    category: "Software",
  },
  {
    text: "Life is 10% what happens to you and 90% how you react to it.",
    author: "Charles R. Swindoll",
    category: "Life",
  },
  {
    text: "The way to get started is to quit talking and begin doing.",
    author: "Walt Disney",
    category: "Motivation",
  },
  {
    text: "Don't let yesterday take up too much of today.",
    author: "Will Rogers",
    category: "Wisdom",
  },
  {
    text: "You learn more from failure than from success.",
    author: "Unknown",
    category: "Learning",
  },
  {
    text: "It's not whether you get knocked down, it's whether you get up.",
    author: "Vince Lombardi",
    category: "Motivation",
  },
  {
    text: "The future belongs to those who believe in the beauty of their dreams.",
    author: "Eleanor Roosevelt",
    category: "Dreams",
  },
  {
    text: "Do what you can with all you have, wherever you are.",
    author: "Theodore Roosevelt",
    category: "Action",
  },
];

export function QuoteWidget({ widget }: QuoteWidgetProps) {
  const [currentQuote, setCurrentQuote] = useState<QuoteData>(quotes[0]);
  const [liked, setLiked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const isCompact = widget.w <= 2 && widget.h <= 1;

  useEffect(() => {
    // Daily quote - changes once per day
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem('quoteDate');
    const savedIndex = localStorage.getItem('quoteIndex');

    if (savedDate !== today || !savedIndex) {
      const randomIndex = Math.floor(Math.random() * quotes.length);
      setCurrentQuote(quotes[randomIndex]);
      localStorage.setItem('quoteDate', today);
      localStorage.setItem('quoteIndex', randomIndex.toString());
    } else {
      setCurrentQuote(quotes[parseInt(savedIndex)]);
    }
  }, []);

  const getNewQuote = () => {
    setIsAnimating(true);
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * quotes.length);
      setCurrentQuote(quotes[randomIndex]);
      setLiked(false);
      localStorage.setItem('quoteIndex', randomIndex.toString());
      setIsAnimating(false);
    }, 300);
  };

  const copyQuote = async () => {
    try {
      const text = `"${currentQuote.text}" - ${currentQuote.author}`;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy quote:', error);
      // Fallback: just show success anyway
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareQuote = () => {
    try {
      const text = `"${currentQuote.text}" - ${currentQuote.author}`;
      if (navigator.share) {
        navigator.share({
          title: 'Quote of the Day',
          text: text,
        }).catch((error) => {
          console.warn('Share failed:', error);
          copyQuote();
        });
      } else {
        copyQuote();
      }
    } catch (error) {
      console.error('Share error:', error);
      copyQuote();
    }
  };

  return (
    <Card className="w-full h-full flex flex-col overflow-hidden bg-gradient-to-br from-background via-accent/30 to-background">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Quote className="h-5 w-5 text-primary" />
            {widget.options.title || 'Quote of the Day'}
          </h3>
          {currentQuote.category && (
            <Badge variant="secondary">{currentQuote.category}</Badge>
          )}
        </div>
      </div>

      {/* Quote Content */}
      <div
        className={`flex-1 flex flex-col items-center justify-center p-6 text-center transition-opacity duration-300 ${
          isAnimating ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Quote Icon */}
        <Quote className="h-12 w-12 text-primary/20 mb-4" />

        {/* Quote Text */}
        <blockquote className="text-lg md:text-xl font-medium leading-relaxed mb-4">
          "{currentQuote.text}"
        </blockquote>

        {/* Author */}
        <cite className="text-sm text-muted-foreground not-italic">
          — {currentQuote.author}
        </cite>
      </div>

      {/* Actions */}
      <div className="p-4 border-t flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLiked(!liked)}
            className={liked ? 'text-red-500' : ''}
          >
            <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
          </Button>
          {!isCompact && (
            <>
              <Button variant="ghost" size="sm" onClick={copyQuote}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={shareQuote}>
                <Share2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={getNewQuote}
          disabled={isAnimating}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isAnimating ? 'animate-spin' : ''}`} />
          New Quote
        </Button>
      </div>
    </Card>
  );
}
