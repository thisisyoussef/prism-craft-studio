import Navigation from "@/components/Navigation";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="mx-auto max-w-3xl px-6 py-12 prose dark:prose-invert">
        <h1>Terms of Service</h1>
        <p>Last updated: {new Date().toLocaleDateString()}</p>

        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using our services, you agree to be bound by these Terms.</p>

        <h2>2. Use of Service</h2>
        <p>You agree not to misuse the service and to comply with applicable laws.</p>

        <h2>3. Orders and Payments</h2>
        <p>All orders are subject to acceptance and availability. Prices are subject to change.</p>

        <h2>4. Intellectual Property</h2>
        <p>All content, trademarks, and data on this site are the property of their respective owners.</p>

        <h2>5. Limitation of Liability</h2>
        <p>We are not liable for indirect or consequential damages arising from the use of our services.</p>

        <h2>6. Contact</h2>
        <p>If you have questions about these Terms, contact us at support@example.com.</p>
      </main>
    </div>
  );
};

export default Terms;

