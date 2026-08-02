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
  if (testimonials.length === 0) return null;

  return (
    <section aria-labelledby="participant-feedback" className="pb-16">
      <div className="mb-8 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Real community voices</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight" id="participant-feedback">What participants say</h2>
        <p className="mt-2 text-muted-foreground">Feedback appears here only when participants choose to share it.</p>
      </div>
      <div className="testimonial-viewport overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
        <div className="testimonial-track flex w-max gap-4 py-2">
          {[...testimonials, ...testimonials].map((testimonial, index) => {
            const duplicate = index >= testimonials.length;
            return (
              <Card
                aria-hidden={duplicate || undefined}
                className={`w-[280px] shrink-0 border-0 sm:w-[360px] ${duplicate ? "testimonial-duplicate" : ""}`}
                key={`${testimonial.id}-${duplicate ? "duplicate" : "original"}`}
              >
                <CardContent className="flex h-full flex-col p-6">
                  <div className="flex items-center justify-between gap-4">
                    <Quote className="size-6 text-primary/45" />
                    <div aria-label={`${testimonial.rating} out of 5 stars`} className="flex">
                      {Array.from({ length: 5 }, (_, star) => (
                        <Star
                          className={`size-4 ${star < testimonial.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25"}`}
                          key={star}
                        />
                      ))}
                    </div>
                  </div>
                  <blockquote className="mt-5 flex-1 text-base font-semibold leading-7">&ldquo;{testimonial.feedback}&rdquo;</blockquote>
                  <div className="mt-5 border-t pt-4">
                    <p className="text-sm font-bold">{testimonial.firstName}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.eventName}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
