import { useEffect, useRef } from "react";
import osoolLogo from "@/assets/clientLogos/osool.png";
import ummaLogo from "@/assets/clientLogos/umma.png";

const businessReviews = [
  {
    id: 1,
    company: "Osool",
    logo: osoolLogo,
    quote: "Quality apparel that represents our brand. Reliable and attentive from start to finish.",
  },
  {
    id: 2,
    company: "Umma",
    logo: ummaLogo,
    quote: "Clear process, consistent quality, on‑time delivery. Our merchandise program improved.",
  },
  {
    id: 3,
    company: "Pali Imports",
    logo: "/placeholder.svg",
    quote: "PTRN understands our market and values. Good products, delivered with care.",
  },
  {
    id: 4,
    company: "Tadaburr",
    logo: "/placeholder.svg",
    quote: "PTRN listens and delivers pieces that fit our community and aesthetic.",
  },
  {
    id: 5,
    company: "DCDS",
    logo: "/placeholder.svg",
    quote: "From concept to delivery, PTRN was dependable. The uniforms strengthened our identity.",
  },
  {
    id: 6,
    company: "Thabaat",
    logo: "/placeholder.svg",
    quote: "PTRN is steady and service-focused. We rely on them for custom apparel.",
  },
];

export function BusinessReviews() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);
  const trackWidthRef = useRef(0);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const firstTrack = scrollContainer.querySelector('.reviews-track') as HTMLElement | null;
    const setTrackWidth = () => {
      trackWidthRef.current = firstTrack?.offsetWidth ?? 0;
    };
    setTrackWidth();

    let scrollPosition = 0;
    // Faster on smaller screens for better perceived speed
    const getSpeed = () => (window.innerWidth < 640 ? 1.5 : window.innerWidth < 1024 ? 1.0 : 0.7);
    let scrollSpeed = getSpeed();

    // Respect reduced motion
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const prefersReduced = () => media.matches;

    const animate = () => {
      if (!isPausedRef.current && scrollContainer && !prefersReduced()) {
        scrollPosition += scrollSpeed;
        // Reset when we scrolled one full track width
        const maxScroll = trackWidthRef.current || scrollContainer.scrollWidth / 2;
        if (scrollPosition >= maxScroll) {
          scrollPosition = 0;
        }
        scrollContainer.scrollLeft = scrollPosition;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    // Pause on hover
    const handleMouseEnter = () => {
      isPausedRef.current = true;
    };

    const handleMouseLeave = () => {
      isPausedRef.current = false;
    };

    // Pause on touch
    const handleTouchStart = () => {
      isPausedRef.current = true;
    };
    const handleTouchEnd = () => {
      isPausedRef.current = false;
    };

    scrollContainer.addEventListener('mouseenter', handleMouseEnter);
    scrollContainer.addEventListener('mouseleave', handleMouseLeave);
    scrollContainer.addEventListener('touchstart', handleTouchStart, { passive: true } as any);
    scrollContainer.addEventListener('touchend', handleTouchEnd, { passive: true } as any);
    const handleResize = () => {
      scrollSpeed = getSpeed();
      setTrackWidth();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
      scrollContainer.removeEventListener('mouseenter', handleMouseEnter);
      scrollContainer.removeEventListener('mouseleave', handleMouseLeave);
      scrollContainer.removeEventListener('touchstart', handleTouchStart as any);
      scrollContainer.removeEventListener('touchend', handleTouchEnd as any);
    };
  }, []);

  return (
    <section className="w-full py-8 md:py-10 bg-background border-b border-border">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center mb-4">
          <h2 className="text-xl md:text-2xl font-medium tracking-tight text-foreground mb-1">
            Trusted by community teams
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            Dependable custom apparel for teams, schools, and nonprofits
          </p>
        </div>
        
        <div ref={scrollRef} className="overflow-hidden relative" style={{ willChange: 'scroll-position' }}>
          <div className="flex flex-nowrap gap-4 md:gap-6 py-3 md:py-4">
            {/* Track A */}
            <div className="reviews-track flex flex-nowrap gap-4 md:gap-6">
              {businessReviews.map((review) => (
                <div
                  key={`a-${review.id}`}
                  className="flex-none w-[280px] sm:w-[330px] md:w-[360px] bg-card rounded-lg border border-border p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <div className="flex items-center mb-3 pb-3 border-b border-border/60">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                      <img
                        src={review.logo}
                        alt={`${review.company} logo`}
                        className="w-full h-full object-contain p-2"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg";
                        }}
                      />
                    </div>
                    <h3 className="ml-4 text-base font-medium text-foreground">
                      {review.company}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {review.quote}
                  </p>
                </div>
              ))}
            </div>
            {/* Track B (duplicate) */}
            <div className="reviews-track flex flex-nowrap gap-4 md:gap-6" aria-hidden="true">
              {businessReviews.map((review) => (
                <div
                  key={`b-${review.id}`}
                  className="flex-none w-[300px] sm:w-[340px] md:w-[360px] bg-card rounded-lg border border-border p-4 md:p-5 shadow-sm"
                >
                  <div className="flex items-center mb-3 pb-3 border-b border-border/60">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                      <img
                        src={review.logo}
                        alt=""
                        className="w-full h-full object-contain p-2"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg";
                        }}
                      />
                    </div>
                    <h3 className="ml-4 text-base font-medium text-foreground">
                      {review.company}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {review.quote}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
