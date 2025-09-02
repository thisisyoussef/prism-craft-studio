import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useParams } from "react-router-dom";
import { caseStudiesData, type CaseStudy } from "@/data/caseStudies";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SEO from "@/components/SEO";
import { getCanonicalUrl } from "@/lib/seo";

const useCountUp = (target: number, durationMs = 1200) => {
	const [value, setValue] = useState(0);
	const started = useRef(false);
	useEffect(() => {
		if (started.current) return;
		started.current = true;
		const start = performance.now();
		const step = (now: number) => {
			const progress = Math.min(1, (now - start) / durationMs);
			setValue(Math.floor(progress * target));
			if (progress < 1) requestAnimationFrame(step);
		};
		requestAnimationFrame(step);
	}, [target, durationMs]);
	return value;
};

const parseLeadingNumber = (text: string): number => {
	const match = text.replace(/[^0-9.]/g, "");
	return Number(match || 0);
};

const CaseStudyArticle = () => {
	const { slug } = useParams();
	const study: CaseStudy | undefined = useMemo(
		() => caseStudiesData.find((s) => s.slug === slug),
		[slug]
	);

	const metricOneTarget = useCountUp(parseLeadingNumber(study?.metrics.metricOneValue || "0"));
	const metricTwoTarget = useCountUp(parseLeadingNumber(study?.metrics.metricTwoValue || "0"));
	const metricThreeTarget = useCountUp(parseLeadingNumber(study?.metrics.metricThreeValue || "0"));

	return (
		<div className="relative min-h-screen bg-background">
			<SEO
				title={study?.title}
				description={study?.summary}
				canonicalUrl={getCanonicalUrl(`/case-studies/${slug ?? ''}`)}
				ogImage="/logo.png"
			/>
			<Navigation />
			<section className="relative z-10">
				<div className={`relative overflow-hidden border-y bg-gradient-to-tr ${study?.accentFrom ?? "from-sky"} ${study?.accentTo ?? "to-coral"}`}>
					<div className="absolute inset-0 opacity-20">
						<div className="absolute -top-20 -left-10 h-60 w-60 rounded-full bg-white/30 blur-3xl" />
						<div className="absolute bottom-[-60px] right-[-40px] h-72 w-72 rounded-full bg-white/20 blur-3xl" />
					</div>
					<div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
						<Link to="/case-studies" className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors">
							<ArrowLeft className="h-4 w-4" />
							Back to case studies
						</Link>
						<h1 className="mt-4 text-3xl md:text-5xl font-semibold tracking-tight text-white drop-shadow-sm">
							{study?.title ?? "Case study title"}
						</h1>
						<div className="mt-3 flex items-center gap-3">
							<Badge variant="secondary">{study?.industry ?? "Industry"}</Badge>
							<span className="text-white/80">{study?.company ?? "Company"}</span>
						</div>
						<p className="mt-4 max-w-2xl text-white/90">
							{study?.summary ?? "A short summary of the challenge, approach, and results."}
						</p>
						<div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
							<Card className="bg-white/90 backdrop-blur border-white/60 animate-in fade-in-0 slide-in-from-bottom-2" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
								<CardHeader className="pb-2">
									<CardTitle className="text-sm text-muted-foreground">{study?.metrics.metricOneLabel}</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-semibold">{metricOneTarget}{/[^0-9]/.test(study?.metrics.metricOneValue ?? "") ? study?.metrics.metricOneValue.replace(/[0-9.]/g, "") : ""}</div>
								</CardContent>
							</Card>
							<Card className="bg-white/90 backdrop-blur border-white/60 animate-in fade-in-0 slide-in-from-bottom-2" style={{ animationDelay: "120ms", animationFillMode: "both" }}>
								<CardHeader className="pb-2">
									<CardTitle className="text-sm text-muted-foreground">{study?.metrics.metricTwoLabel}</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-semibold">{metricTwoTarget}{/[^0-9]/.test(study?.metrics.metricTwoValue ?? "") ? study?.metrics.metricTwoValue.replace(/[0-9.]/g, "") : ""}</div>
								</CardContent>
							</Card>
							<Card className="bg-white/90 backdrop-blur border-white/60 animate-in fade-in-0 slide-in-from-bottom-2" style={{ animationDelay: "180ms", animationFillMode: "both" }}>
								<CardHeader className="pb-2">
									<CardTitle className="text-sm text-muted-foreground">{study?.metrics.metricThreeLabel}</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-semibold">{metricThreeTarget}{/[^0-9]/.test(study?.metrics.metricThreeValue ?? "") ? study?.metrics.metricThreeValue.replace(/[0-9.]/g, "") : ""}</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</section>

			<section className="relative z-10 max-w-6xl mx-auto px-6 py-10 md:py-14">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
					{/* Main content */}
					<div className="md:col-span-2 space-y-6">
						<Card id="overview" className="scroll-mt-24 animate-in fade-in-0 slide-in-from-bottom-2" style={{ animationDelay: "120ms", animationFillMode: "both" }}>
							<CardHeader>
								<CardTitle>Overview</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="prose prose-sm md:prose-base dark:prose-invert">
									<p>Use this section to describe the context, audience, and goals. Replace this placeholder with your narrative when ready.</p>
								</div>
							</CardContent>
						</Card>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
							<Card id="challenge" className="scroll-mt-24 animate-in fade-in-0 slide-in-from-bottom-2" style={{ animationDelay: "160ms", animationFillMode: "both" }}>
								<CardHeader>
									<CardTitle>Challenge</CardTitle>
								</CardHeader>
								<CardContent>
									<p className="text-sm text-muted-foreground">Describe constraints, pain points, and prior workflows.</p>
								</CardContent>
							</Card>
							<Card id="solution" className="scroll-mt-24 animate-in fade-in-0 slide-in-from-bottom-2" style={{ animationDelay: "180ms", animationFillMode: "both" }}>
								<CardHeader>
									<CardTitle>Solution</CardTitle>
								</CardHeader>
								<CardContent>
									<p className="text-sm text-muted-foreground">Outline the approach, key decisions, and systems.</p>
								</CardContent>
							</Card>
						</div>

						<Card id="results" className="scroll-mt-24 animate-in fade-in-0 slide-in-from-bottom-2" style={{ animationDelay: "200ms", animationFillMode: "both" }}>
							<CardHeader>
								<CardTitle>Results</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground">Summarize outcomes and what changed. Add charts, images, or quotes later.</p>
							</CardContent>
						</Card>

						{/* Image gallery placeholders */}
						<Card id="gallery" className="scroll-mt-24 animate-in fade-in-0 slide-in-from-bottom-2" style={{ animationDelay: "220ms", animationFillMode: "both" }}>
							<CardHeader>
								<CardTitle>Image Gallery</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
									{Array.from({ length: 6 }).map((_, i) => (
										<div key={i} className="group">
											<AspectRatio ratio={16 / 9} className="rounded-lg overflow-hidden border bg-muted relative">
												<div className="absolute inset-0 bg-gradient-to-br from-muted-foreground/10 to-transparent" />
												<div className="absolute inset-0 animate-pulse bg-white/5" />
											</AspectRatio>
											<p className="mt-2 text-xs text-muted-foreground">Caption placeholder {i + 1}</p>
										</div>
									))}
								</div>
							</CardContent>
						</Card>

						{/* Quotes / Testimonials */}
						<Card id="quotes" className="scroll-mt-24 animate-in fade-in-0 slide-in-from-bottom-2" style={{ animationDelay: "240ms", animationFillMode: "both" }}>
							<CardHeader>
								<CardTitle>Quotes</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
									{[
										{ name: "Alex Kim", role: "Growth Lead", text: "PTRN let us move from concept to launch in days." },
										{ name: "Priya N.", role: "Program Director", text: "Small-batch runs helped chapters test and learn fast." },
										{ name: "Jordan Lee", role: "Operations", text: "Routing reduced logistics overhead across regions." },
									].map((q, i) => (
										<div key={i} className="rounded-lg border p-4">
											<p className="text-sm">“{q.text}”</p>
											<div className="mt-3 flex items-center gap-3">
												<Avatar className="h-8 w-8">
													<AvatarImage alt={q.name} />
													<AvatarFallback>{q.name.split(' ').map(n => n[0]).join('').slice(0,2)}</AvatarFallback>
												</Avatar>
												<div className="text-xs">
													<div className="font-medium">{q.name}</div>
													<div className="text-muted-foreground">{q.role}</div>
												</div>
											</div>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Sidebar */}
					<div className="grid gap-6">
						<Card className="sticky top-24 animate-in fade-in-0 slide-in-from-right-2" style={{ animationDelay: "80ms", animationFillMode: "both" }}>
							<CardHeader>
								<CardTitle>On this page</CardTitle>
							</CardHeader>
							<CardContent>
								<nav className="text-sm">
									<ul className="space-y-2">
										<li><a className="text-muted-foreground hover:text-foreground" href="#overview">Overview</a></li>
										<li><a className="text-muted-foreground hover:text-foreground" href="#challenge">Challenge</a></li>
										<li><a className="text-muted-foreground hover:text-foreground" href="#solution">Solution</a></li>
										<li><a className="text-muted-foreground hover:text-foreground" href="#results">Results</a></li>
										<li><a className="text-muted-foreground hover:text-foreground" href="#gallery">Image Gallery</a></li>
										<li><a className="text-muted-foreground hover:text-foreground" href="#quotes">Quotes</a></li>
									</ul>
								</nav>
							</CardContent>
						</Card>

						<Card className="animate-in fade-in-0 slide-in-from-bottom-2" style={{ animationDelay: "160ms", animationFillMode: "both" }}>
							<CardHeader>
								<CardTitle>Project Details</CardTitle>
							</CardHeader>
							<CardContent>
								<ul className="text-sm text-muted-foreground space-y-2">
									<li>Timeline: Q1–Q2</li>
									<li>Scope: Products, Artwork, Fulfillment</li>
									<li>Stack: PTRN Studio, On‑Demand, Chapters</li>
								</ul>
							</CardContent>
						</Card>

						<Card className="animate-in fade-in-0 slide-in-from-bottom-2" style={{ animationDelay: "200ms", animationFillMode: "both" }}>
							<CardHeader>
								<CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Highlights</CardTitle>
							</CardHeader>
							<CardContent>
								<ul className="list-disc pl-5 text-sm space-y-2">
									<li>Rapid iteration with small-batch runs</li>
									<li>Variant testing across channels</li>
									<li>Localized fulfillment and routing</li>
								</ul>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>
		</div>
	);
};

export default CaseStudyArticle;

