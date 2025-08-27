import { useEffect, useRef } from "react";
import osoolLogo from "@/assets/clientLogos/osool.png";
import ummaLogo from "@/assets/clientLogos/umma.png";

const businessReviews = [
  {
    id: 1,
    company: "Osool",
    logo: osoolLogo,
    quote: "PTRN delivered quality apparel that represents our brand well. Reliable and attentive from start to finish.",
  },
  {
    id: 2,
    company: "Umma",
    logo: ummaLogo,
    quote: "Working with PTRN improved our merchandise program. Clear process, consistent quality, on-time delivery.",
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
    window.addEventListener('resize', setTrackWidth);

    let scrollPosition = 0;
    const scrollSpeed = 0.6;

    const animate = () => {
      if (!isPausedRef.current && scrollContainer) {
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

    scrollContainer.addEventListener('mouseenter', handleMouseEnter);
    scrollContainer.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', setTrackWidth);
      scrollContainer.removeEventListener('mouseenter', handleMouseEnter);
      scrollContainer.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <section className="w-full py-8 md:py-10 bg-background border-b border-border">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center mb-4">
          <h2 className="text-xl md:text-2xl font-medium tracking-tight text-foreground mb-1">
            Trusted by Organizations
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            Dependable custom apparel for teams and nonprofits
          </p>
        </div>
        
        <div ref={scrollRef} className="overflow-hidden relative">
          <div className="flex flex-nowrap gap-6 py-4">
            {/* Track A */}
            <div className="reviews-track flex flex-nowrap gap-6">
              {businessReviews.map((review) => (
                <div
                  key={`a-${review.id}`}
                  className="flex-none w-[360px] bg-card rounded-lg border border-border p-5 shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <div className="flex items-center mb-3 pb-3 border-b border-border/60">
                    <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
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
            <div className="reviews-track flex flex-nowrap gap-6" aria-hidden="true">
              {businessReviews.map((review) => (
                <div
                  key={`b-${review.id}`}
                  className="flex-none w-[360px] bg-card rounded-lg border border-border p-5 shadow-sm"
                >
                  <div className="flex items-center mb-3 pb-3 border-b border-border/60">
                    <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
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
