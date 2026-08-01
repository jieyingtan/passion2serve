"use client";

import { useEffect, useState } from "react";
import { Quote, Star } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface Testimonial {
  id: string;
  firstName: string;
  eventName: string;
  feedback: string;
  rating: number;
}

export function TestimonialsCarousel({ testimonials }: { testimonials: Testimonial[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const visibleCount = Math.min(3, testimonials.length);

  useEffect(() => {
    if (testimonials.length <= visibleCount) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length, visibleCount]);

  if (testimonials.length === 0) return null;

  const visible = Array.from({ length: visibleCount }, (_, i) => {
    const idx = (currentIndex + i) % testimonials.length;
    return testimonials[idx];
  });

  return (
    <section className="pb-16">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold tracking-tight">What participants say</h2>
        <p className="mt-2 text-muted-foreground">Real feedback from our community</p>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {visible.map((t, i) => (
          <Card
            className="border-0 transition-opacity duration-500"
            key={`${t.id}-${i}`}
          >
            <CardContent className="flex h-full flex-col p-6">
              <Quote className="mb-3 size-5 text-primary/40" />
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                &ldquo;{t.feedback}&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-1">
                {Array.from({ length: 5 }, (_, s) => (
                  <Star
                    key={s}
                    className={`size-3.5 ${s < t.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                  />
                ))}
              </div>
              <div className="mt-3 border-t pt-3">
                <p className="text-sm font-semibold">{t.firstName}</p>
                <p className="text-xs text-muted-foreground">{t.eventName}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {testimonials.length > visibleCount && (
        <div className="mt-6 flex justify-center gap-1.5">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`size-2 rounded-full transition-colors ${
                i >= currentIndex && i < currentIndex + visibleCount
                  ? "bg-primary"
                  : "bg-muted-foreground/25"
              }`}
              aria-label={`Go to testimonial ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
