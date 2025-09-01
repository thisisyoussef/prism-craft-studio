import Navigation from "@/components/Navigation";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="mx-auto max-w-3xl px-6 py-12 prose dark:prose-invert">
        <h1>Privacy Policy</h1>
        <p>Last updated: {new Date().toLocaleDateString()}</p>

        <h2>1. Information We Collect</h2>
        <p>We collect information you provide and data about how you use our services.</p>

        <h2>2. How We Use Information</h2>
        <p>We use your information to provide and improve our services, and for communication.</p>

        <h2>3. Cookies</h2>
        <p>We use cookies to personalize content and analyze traffic. You can control cookies in your browser settings.</p>

        <h2>4. Data Sharing</h2>
        <p>We do not sell your personal information. We may share data with service providers under confidentiality agreements.</p>

        <h2>5. Your Rights</h2>
        <p>You may request access, correction, or deletion of your personal data where applicable.</p>

        <h2>6. Contact</h2>
        <p>For privacy inquiries, contact us at privacy@example.com.</p>
      </main>
    </div>
  );
};

export default Privacy;

