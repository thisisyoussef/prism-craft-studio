import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, CheckCircle, Package } from "lucide-react";
import d1 from "@/assets/images/PHOTO-2025-05-21-20-42-39 10.jpg";
import d2 from "@/assets/images/PHOTO-2025-05-21-20-42-39 11.jpg";
import d3 from "@/assets/images/PHOTO-2025-05-21-20-42-39 12.jpg";

const DesignerBooking = () => {
  const designers = [
    {
      id: 1,
      name: "Sarah Chen",
      specialty: "Corporate Branding",
      experience: "8+ years",
      rating: 4.9,
      projects: 156,
      hourlyRate: 125,
      availability: "Available Today",
      image: d1,
      skills: ["Logo Design", "Brand Guidelines", "Print Ready Files"],
      languages: ["English", "Mandarin"]
    },
    {
      id: 2,
      name: "Marcus Johnson",
      specialty: "Apparel Graphics",
      experience: "6+ years", 
      rating: 4.8,
      projects: 203,
      hourlyRate: 110,
      availability: "Available Tomorrow",
      image: d2,
      skills: ["Sports Graphics", "Vintage Designs", "Typography"],
      languages: ["English", "Spanish"]
    },
    {
      id: 3,
      name: "Elena Rodriguez",
      specialty: "Fashion Design",
      experience: "10+ years",
      rating: 5.0,
      projects: 89,
      hourlyRate: 150,
      availability: "Available Next Week",
      image: d3,
      skills: ["Pattern Making", "Color Theory", "Trend Analysis"],
      languages: ["English", "French", "Spanish"]
    }
  ];

  const consultationTypes = [
    {
      title: "Design Review",
      duration: "30 minutes",
      description: "Review your existing designs and get professional feedback",
      price: "Free",
      features: ["Design feedback", "Print guidelines", "File optimization tips"]
    },
    {
      title: "Creative Consultation", 
      duration: "60 minutes",
      description: "Collaborate on new design concepts and creative direction",
      price: "$50",
      features: ["Concept development", "Style direction", "Color recommendations", "Brand alignment"]
    },
    {
      title: "Full Design Service",
      duration: "Project-based",
      description: "Complete design creation from concept to print-ready files",
      price: "From $150",
      features: ["Original design creation", "Multiple concepts", "Unlimited revisions", "Print-ready files", "Brand guidelines"]
    }
  ];

  return (
    <section id="designers" className="py-24 bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-medium tracking-tight text-foreground mb-4">
            Design guidance
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From concept to production. Our team is here to serve your vision.
          </p>
        </div>

        {/* Consultation Types */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {consultationTypes.map((consultation, index) => (
            <div
              key={index}
              className={`bg-card rounded-2xl p-6 border transition-all duration-200 hover:shadow-medium ${
                index === 1 
                  ? "border-primary ring-2 ring-primary/20 shadow-medium" 
                  : "border-primary/5 shadow-soft"
              }`}
            >
              {index === 1 && (
                <Badge variant="default" className="mb-4">
                  Most popular
                </Badge>
              )}
              
              <h3 className="text-xl font-medium text-foreground mb-2">
                {consultation.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Clock className="w-4 h-4" />
                {consultation.duration}
              </div>
              
              <p className="text-muted-foreground mb-4">
                {consultation.description}
              </p>
              
              <div className="text-2xl font-medium text-foreground mb-4">
                {consultation.price}
              </div>
              
              <ul className="space-y-2 mb-6">
                {consultation.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-success" />
                    {feature}
                  </li>
                ))}
              </ul>
              
              <Button 
                variant={index === 1 ? "default" : "outline"} 
                className="w-full"
              >
                {index === 0 ? "Request guidance" : "Schedule support"}
              </Button>
            </div>
          ))}
        </div>

        {/* Designer Profiles */}
        <div className="mb-16">
          <h3 className="text-2xl font-medium text-foreground mb-8 text-center">
            Our family
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            {designers.map((designer) => (
              <div
                key={designer.id}
                className="bg-card rounded-2xl p-6 shadow-soft border border-primary/5 hover:shadow-medium transition-all duration-200"
              >
                <div className="flex items-start gap-4 mb-4">
                  <img
                    src={designer.image}
                    alt={designer.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-foreground">
                      {designer.name}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-1">
                      {designer.specialty}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {designer.experience} • {designer.projects} projects
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium">★</span>
                    <span className="text-sm font-medium">{designer.rating}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    ${designer.hourlyRate}/hr
                  </Badge>
                  <Badge 
                    variant={designer.availability.includes("Today") ? "default" : "outline"}
                    className="text-xs"
                  >
                    {designer.availability}
                  </Badge>
                </div>
                
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Specialties:</p>
                  <div className="flex flex-wrap gap-1">
                    {designer.skills.map((skill, skillIndex) => (
                      <Badge key={skillIndex} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Button variant="hero" size="sm" className="w-full">
                    <Calendar className="w-4 h-4" />
                    Get guidance
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full">
                    View portfolio
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-card-secondary rounded-2xl p-8 border border-primary/5">
          <h3 className="text-2xl font-medium text-foreground mb-8 text-center">
            How we serve
          </h3>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-6 h-6" />
              </div>
              <h4 className="font-medium text-foreground mb-2">1. Connect</h4>
              <p className="text-sm text-muted-foreground">
                Choose someone from our team to guide you
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-6 h-6" />
              </div>
              <h4 className="font-medium text-foreground mb-2">2. Listen</h4>
              <p className="text-sm text-muted-foreground">
                We understand your needs and respect your vision
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h4 className="font-medium text-foreground mb-2">3. Create</h4>
              <p className="text-sm text-muted-foreground">
                Craft quality files with care and attention
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-6 h-6" />
              </div>
              <h4 className="font-medium text-foreground mb-2">4. Deliver</h4>
              <p className="text-sm text-muted-foreground">
                Bring your vision to life with quality
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DesignerBooking;