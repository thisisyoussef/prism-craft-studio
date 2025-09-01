import Navigation from "@/components/Navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FlaskConical } from "lucide-react";

const ExperimentalMockupEditor = () => {
	return (
		<div className="relative min-h-screen bg-background">
			<Navigation />
			<div className="relative z-10 px-6 max-w-6xl mx-auto py-8">
				<div className="mb-6 flex items-start justify-between gap-4">
					<div>
						<h1 className="text-3xl font-medium text-foreground">Chat-First Mockup Editor</h1>
						<p className="text-muted-foreground mt-1">Experimental — starts only from catalog base mockups.</p>
					</div>
					<Badge variant="secondary" className="inline-flex items-center gap-2">
						<FlaskConical className="h-3.5 w-3.5" />
						Experimental
					</Badge>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
					{/* Left: Catalog + Bases */}
					<div className="lg:col-span-4 border rounded-lg">
						<div className="p-4 border-b">
							<h2 className="text-sm font-medium">Catalog</h2>
							<p className="text-xs text-muted-foreground">Pick a product and an approved base angle.</p>
							<div className="mt-3 space-y-2">
								<Input placeholder="Search products" />
								<div className="flex gap-2">
									<Button variant="outline" size="sm">Hoodies</Button>
									<Button variant="outline" size="sm">Tees</Button>
									<Button variant="outline" size="sm">Mugs</Button>
								</div>
							</div>
						</div>
						<ScrollArea className="h-[340px]">
							<div className="p-4 grid grid-cols-2 gap-3">
								{Array.from({ length: 6 }).map((_, i) => (
									<div key={i} className="aspect-square rounded-md border bg-muted/30" />
								))}
							</div>
						</ScrollArea>
					</div>

					{/* Right: Preview + Chat/Draw */}
					<div className="lg:col-span-8">
						<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
							<div className="md:col-span-3 border rounded-lg p-4">
								<h3 className="text-sm font-medium mb-2">Preview</h3>
								<div className="aspect-[4/3] rounded-md border bg-muted/30" />
								<div className="mt-3 grid grid-cols-6 gap-2">
									{Array.from({ length: 6 }).map((_, i) => (
										<div key={i} className="aspect-square rounded-md border bg-muted/20" />
									))}
								</div>
							</div>
							<div className="md:col-span-2 border rounded-lg p-0">
								<Tabs defaultValue="chat" className="w-full">
									<div className="p-3 border-b">
										<TabsList className="w-full">
											<TabsTrigger value="chat" className="w-1/2">Chat</TabsTrigger>
											<TabsTrigger value="draw" className="w-1/2">Draw</TabsTrigger>
										</TabsList>
									</div>
									<TabsContent value="chat" className="p-3">
										<div className="space-y-2 text-xs text-muted-foreground">
											<p>Type requests like “make hoodie forest green; small crest on left chest”.</p>
											<p>Edits will always preserve catalog base perspective and printable areas.</p>
										</div>
										<div className="mt-3 flex gap-2">
											<Input placeholder="Coming soon" disabled />
											<Button disabled>Send</Button>
										</div>
									</TabsContent>
									<TabsContent value="draw" className="p-3">
										<div className="space-y-2 text-xs text-muted-foreground">
											<p>Upload a rough logo or sketch. The AI will clean and place it.</p>
											<p>Placement will clamp to printable areas for the selected base.</p>
										</div>
										<div className="mt-3 space-y-2">
											<div className="aspect-[4/3] rounded-md border bg-muted/30" />
											<div className="flex gap-2">
												<Button disabled variant="outline">Upload</Button>
												<Button disabled>Enhance</Button>
											</div>
										</div>
									</TabsContent>
								</Tabs>
							</div>
						</div>
						<div className="mt-4 flex justify-end gap-2">
							<Button variant="outline">Export Preview</Button>
							<Button disabled>Add to Quote</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ExperimentalMockupEditor;

