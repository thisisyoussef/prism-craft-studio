export type CaseStudy = {
	slug: string;
	company: string;
	title: string;
	industry: string;
	summary: string;
	accentFrom: string; // tailwind from-*
	accentTo: string; // tailwind to-*
	metrics: {
		metricOneLabel: string;
		metricOneValue: string;
		metricTwoLabel: string;
		metricTwoValue: string;
		metricThreeLabel: string;
		metricThreeValue: string;
	};
};

export const caseStudiesData: CaseStudy[] = [
	{
		slug: "atlas-retail-scale",
		company: "Atlas Retail",
		title: "Scaling personalization for 2M shoppers",
		industry: "Retail",
		summary:
			"How Atlas used on-demand printing and dynamic artwork to lift conversions across seasonal campaigns.",
		accentFrom: "from-sky",
		accentTo: "to-coral",
		metrics: {
			metricOneLabel: "Conversion Uplift",
			metricOneValue: "+38%",
			metricTwoLabel: "Time to Launch",
			metricTwoValue: "-54%",
			metricThreeLabel: "NPS",
			metricThreeValue: "74",
		},
	},
	{
		slug: "nova-gaming-merch",
		company: "Nova Esports",
		title: "Creator merch with zero inventory risk",
		industry: "Gaming",
		summary:
			"A global drop strategy with localized fulfillment and variant testing for creators.",
		accentFrom: "from-indigo-500",
		accentTo: "to-fuchsia-500",
		metrics: {
			metricOneLabel: "Sell-through",
			metricOneValue: "92%",
			metricTwoLabel: "Returns",
			metricTwoValue: "-31%",
			metricThreeLabel: "AOV",
			metricThreeValue: "+19%",
		},
	},
	{
		slug: "aurora-nonprofit-campaign",
		company: "Aurora Foundation",
		title: "Raising awareness with rapid campaign iterations",
		industry: "Nonprofit",
		summary:
			"Rapid design testing and small-batch runs enabled Aurora to iterate weekly across chapters.",
		accentFrom: "from-emerald-500",
		accentTo: "to-cyan-500",
		metrics: {
			metricOneLabel: "Chapters Activated",
			metricOneValue: "47",
			metricTwoLabel: "Production Waste",
			metricTwoValue: "-68%",
			metricThreeLabel: "Donor Growth",
			metricThreeValue: "+24%",
		},
	},
];

