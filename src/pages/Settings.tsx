import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/lib/store";
import { useProfile } from "@/lib/profile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Settings = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuthStore();
  const { data: profile, refetch } = useProfile();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const displayEmail = useMemo(() => user?.email || email, [user?.email, email]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setPhone(profile.phone || "");
      setEmail(profile.email || user?.email || "");
    }
    if (user?.user_metadata?.company_name) {
      setCompanyName(user.user_metadata.company_name);
    }
  }, [profile, user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      // Update profile table row
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName || null,
          last_name: lastName || null,
          phone: phone || null,
          email: email || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      // Update user metadata for company_name (non-critical)
      if (companyName !== (user.user_metadata?.company_name || "")) {
        const { error: metaErr } = await supabase.auth.updateUser({
          data: { company_name: companyName },
        });
        if (metaErr) console.warn("Failed to update user metadata:", metaErr.message);
      }

      toast({ title: "Profile updated", description: "Your profile has been saved." });
      await refetch();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to save profile.",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!user) return;
    if (!email || email === user.email) {
      toast({ title: "No changes", description: "Email is unchanged." });
      return;
    }
    setSavingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      toast({
        title: "Email update requested",
        description: "Check your inbox to confirm the new email.",
      });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to update email.", variant: "destructive" });
    } finally {
      setSavingEmail(false);
    }
  };

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleUpdatePassword = async () => {
    if (!user) return;
    if (!newPassword || newPassword.length < 8) {
      toast({ title: "Weak password", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", description: "Please confirm your password.", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password updated", description: "Your password has been changed." });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to update password.", variant: "destructive" });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight mb-6">Settings</h1>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Account Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" />
              </div>
              <div>
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="ACME Inc." />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-5555" />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Email</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                <p className="text-sm text-muted-foreground mt-2">Current: {displayEmail}</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={handleUpdateEmail} disabled={savingEmail}>
                {savingEmail ? "Updating..." : "Update email"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="newPassword">New password</Label>
                <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" onClick={handleUpdatePassword} disabled={savingPassword}>
                {savingPassword ? "Updating..." : "Change password"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-10" />

        <div className="text-sm text-muted-foreground">
          <p>
            Need help? Contact support at <a className="underline" href="mailto:support@example.com">support@example.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
