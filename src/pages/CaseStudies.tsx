import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Building2, Clock3, TrendingUp } from "lucide-react";
import { caseStudiesData } from "@/data/caseStudies";

const CaseStudies = () => {
	return (
		<div className="relative min-h-screen bg-background">
			<Navigation />
			<section className="relative z-10 max-w-6xl mx-auto px-6 pt-8 md:pt-12">
				<div className="mb-10 md:mb-14">
					<h1 className="text-3xl md:text-5xl font-semibold tracking-tight">Case Studies</h1>
					<p className="mt-3 md:mt-4 text-muted-foreground max-w-2xl">
						Real outcomes from teams using PTRN to launch, iterate, and scale custom products.
					</p>
					<div className="mt-5 flex flex-wrap gap-2">
						<Badge variant="secondary">Retail</Badge>
						<Badge variant="secondary">Gaming</Badge>
						<Badge variant="secondary">Nonprofit</Badge>
						<Badge variant="outline">All industries</Badge>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
					{caseStudiesData.map((study, index) => (
						<Link key={study.slug} to={`/case-studies/${study.slug}`} className="group">
							<Card
								className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5 animate-in fade-in-0 slide-in-from-bottom-4"
								style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
							>
								<div className={`relative h-40 md:h-44 bg-gradient-to-tr ${study.accentFrom} ${study.accentTo} rounded-b-[28%]`}>
									<div className="absolute inset-0">
										<div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
										<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-white/10 blur-xl animate-[spin_12s_linear_infinite]" />
									</div>
								</div>
								<CardHeader className="pb-2">
									<div className="flex items-center justify-between">
										<CardTitle className="text-xl md:text-2xl">{study.title}</CardTitle>
										<Badge>{study.industry}</Badge>
									</div>
									<CardDescription className="line-clamp-2">{study.summary}</CardDescription>
								</CardHeader>
								<CardContent className="pt-3">
									<div className="grid grid-cols-3 gap-3 text-sm">
										<div className="flex items-center gap-2 text-emerald-500">
											<TrendingUp className="h-4 w-4" />
											<div>
												<div className="font-medium leading-none">{study.metrics.metricOneValue}</div>
												<div className="text-muted-foreground text-[11px]">{study.metrics.metricOneLabel}</div>
											</div>
										</div>
										<div className="flex items-center gap-2 text-cyan-500">
											<Clock3 className="h-4 w-4" />
											<div>
												<div className="font-medium leading-none">{study.metrics.metricTwoValue}</div>
												<div className="text-muted-foreground text-[11px]">{study.metrics.metricTwoLabel}</div>
											</div>
										</div>
										<div className="flex items-center gap-2 text-orange-500">
											<Building2 className="h-4 w-4" />
											<div>
												<div className="font-medium leading-none">{study.metrics.metricThreeValue}</div>
												<div className="text-muted-foreground text-[11px]">{study.metrics.metricThreeLabel}</div>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			</section>
		</div>
	);
};

export default CaseStudies;

