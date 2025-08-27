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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import type { Tables as DBTables, TablesInsert as DBTablesInsert } from "@/integrations/supabase/types";
import { addressSchema } from "@/lib/validation";

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

      toast({ title: "Saved", description: "Your information has been updated." });
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

  const openEditAddress = (a: AddressRow) => {
    setEditingId(a.id);
    setAddrLabel(a.label || "");
    setAddrFullName(a.full_name || "");
    setAddrCompany(a.company || "");
    setAddrPhone(a.phone || "");
    setAddr1(a.address1);
    setAddr2(a.address2 || "");
    setAddrCity(a.city);
    setAddrState(a.state || "");
    setAddrPostal(a.postal_code || "");
    setAddrCountry(a.country || "US");
    setAddrDefaultShip(Boolean(a.is_default_shipping));
    setAddrDefaultBill(Boolean(a.is_default_billing));
    setEditOpen(true);
  };

  const [savingEdit, setSavingEdit] = useState(false);
  const handleSaveEdit = async () => {
    if (!user || !editingId) return;
    const validationError = validateAddress();
    if (validationError) {
      toast({ title: "Invalid address", description: validationError, variant: "destructive" });
      return;
    }
    setSavingEdit(true);
    try {
      if (addrDefaultShip) {
        await supabase.from("addresses").update({ is_default_shipping: false }).eq("user_id", user.id);
      }
      if (addrDefaultBill) {
        await supabase.from("addresses").update({ is_default_billing: false }).eq("user_id", user.id);
      }
      const { error } = await supabase
        .from("addresses")
        .update({
          label: addrLabel || null,
          full_name: addrFullName || null,
          company: addrCompany || null,
          phone: addrPhone || null,
          address1: addr1,
          address2: addr2 || null,
          city: addrCity,
          state: addrState || null,
          postal_code: addrPostal || null,
          country: addrCountry || "US",
          is_default_shipping: addrDefaultShip,
          is_default_billing: addrDefaultBill,
        })
        .eq("id", editingId);
      if (error) throw error;
      toast({ title: "Address saved" });
      setEditOpen(false);
      setEditingId(null);
      resetAddressForm();
      await fetchAddresses();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to update address", variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  // Address Book state
  type AddressRow = DBTables<"addresses">;
  type AddressInsert = DBTablesInsert<"addresses">;
  const [addresses, setAddresses] = useState<AddressRow[] | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [addingAddress, setAddingAddress] = useState(false);

  // New address form state
  const [addrLabel, setAddrLabel] = useState("");
  const [addrFullName, setAddrFullName] = useState("");
  const [addrCompany, setAddrCompany] = useState("");
  const [addrPhone, setAddrPhone] = useState("");
  const [addr1, setAddr1] = useState("");
  const [addr2, setAddr2] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [addrPostal, setAddrPostal] = useState("");
  const [addrCountry, setAddrCountry] = useState("US");
  const [addrDefaultShip, setAddrDefaultShip] = useState(false);
  const [addrDefaultBill, setAddrDefaultBill] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchAddresses = async () => {
    if (!user) return;
    setLoadingAddresses(true);
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setAddresses(data || []);
    setLoadingAddresses(false);
  };

  useEffect(() => {
    if (user) {
      fetchAddresses();
    }
  }, [user]);

  const resetAddressForm = () => {
    setAddrLabel("");
    setAddrFullName("");
    setAddrCompany("");
    setAddrPhone("");
    setAddr1("");
    setAddr2("");
    setAddrCity("");
    setAddrState("");
    setAddrPostal("");
    setAddrCountry("US");
    setAddrDefaultShip(false);
    setAddrDefaultBill(false);
  };

  const validateAddress = () => {
    const result = addressSchema.safeParse({
      label: addrLabel,
      full_name: addrFullName,
      company: addrCompany,
      phone: addrPhone,
      address1: addr1,
      address2: addr2,
      city: addrCity,
      state: addrState,
      postal_code: addrPostal,
      country: addrCountry,
      is_default_shipping: addrDefaultShip,
      is_default_billing: addrDefaultBill,
    });
    if (!result.success) {
      const first = result.error.errors[0];
      return first?.message || "Invalid address";
    }
    return null;
  };

  const handleAddAddress = async () => {
    if (!user) return;
    const validationError = validateAddress();
    if (validationError) {
      toast({ title: "Invalid address", description: validationError, variant: "destructive" });
      return;
    }
    setAddingAddress(true);
    const payload: AddressInsert = {
      user_id: user.id,
      label: addrLabel || null,
      full_name: addrFullName || null,
      company: addrCompany || null,
      phone: addrPhone || null,
      address1: addr1,
      address2: addr2 || null,
      city: addrCity,
      state: addrState || null,
      postal_code: addrPostal || null,
      country: addrCountry || "US",
      is_default_shipping: addrDefaultShip,
      is_default_billing: addrDefaultBill,
    };
    try {
      // If setting default, clear existing defaults first
      if (addrDefaultShip) {
        await supabase.from("addresses").update({ is_default_shipping: false }).eq("user_id", user.id);
      }
      if (addrDefaultBill) {
        await supabase.from("addresses").update({ is_default_billing: false }).eq("user_id", user.id);
      }
      const { error } = await supabase.from("addresses").insert(payload);
      if (error) throw error;
      toast({ title: "Address saved" });
      resetAddressForm();
      setAddOpen(false);
      await fetchAddresses();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to add address", variant: "destructive" });
    } finally {
      setAddingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      const { error } = await supabase.from("addresses").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Address removed" });
      await fetchAddresses();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to delete address", variant: "destructive" });
    }
  };

  const handleSetDefault = async (id: string, type: "shipping" | "billing") => {
    if (!user) return;
    try {
      if (type === "shipping") {
        await supabase.from("addresses").update({ is_default_shipping: false }).eq("user_id", user.id);
        await supabase.from("addresses").update({ is_default_shipping: true }).eq("id", id);
      } else {
        await supabase.from("addresses").update({ is_default_billing: false }).eq("user_id", user.id);
        await supabase.from("addresses").update({ is_default_billing: true }).eq("id", id);
      }
      toast({ title: "Default set" });
      await fetchAddresses();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to update default", variant: "destructive" });
    }
  };

  // Billing History
  type PaymentRow = DBTables<"payments"> & { orders?: { order_number: string | null } | null };
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const fetchPayments = async () => {
    setLoadingPayments(true);
    const { data, error } = await supabase
      .from("payments")
      .select("id,created_at,phase,amount_cents,currency,status,paid_at,order_id,orders(order_number)")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setPayments(data as PaymentRow[] | null);
    setLoadingPayments(false);
  };

  useEffect(() => {
    if (user) {
      fetchPayments();
    }
  }, [user]);

  const formatMoney = (cents?: number | null, currency?: string | null) => {
    const amount = typeof cents === "number" ? cents / 100 : 0;
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(amount);
    } catch {
      return `$${amount.toFixed(2)}`;
    }
  };

  const handleUpdateEmail = async () => {
    if (!user) return;
    if (!email || email === user.email) {
      toast({ title: "No changes", description: "Email is the same." });
      return;
    }
    setSavingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      toast({
        title: "Check your email",
        description: "We sent a confirmation link to verify your new email.",
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
      toast({ title: "Password too short", description: "Please use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please check and try again.", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password changed", description: "Your new password is now active." });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to update password.", variant: "destructive" });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight mb-6">Account settings</h1>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your information</CardTitle>
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
                {savingProfile ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Edit Address Dialog */}
        <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) { setEditingId(null); resetAddressForm(); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit address</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="e_addrLabel">Label</Label>
                <Input id="e_addrLabel" value={addrLabel} onChange={(e) => setAddrLabel(e.target.value)} placeholder="Office" />
              </div>
              <div>
                <Label htmlFor="e_addrFullName">Full name</Label>
                <Input id="e_addrFullName" value={addrFullName} onChange={(e) => setAddrFullName(e.target.value)} placeholder="Jane Doe" />
              </div>
              <div>
                <Label htmlFor="e_addrCompany">Company</Label>
                <Input id="e_addrCompany" value={addrCompany} onChange={(e) => setAddrCompany(e.target.value)} placeholder="ACME Inc." />
              </div>
              <div>
                <Label htmlFor="e_addrPhone">Phone</Label>
                <Input id="e_addrPhone" value={addrPhone} onChange={(e) => setAddrPhone(e.target.value)} placeholder="(555) 555-5555" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="e_addr1">Address line 1</Label>
                <Input id="e_addr1" value={addr1} onChange={(e) => setAddr1(e.target.value)} placeholder="123 Main St" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="e_addr2">Address line 2</Label>
                <Input id="e_addr2" value={addr2} onChange={(e) => setAddr2(e.target.value)} placeholder="Suite 100" />
              </div>
              <div>
                <Label htmlFor="e_addrCity">City</Label>
                <Input id="e_addrCity" value={addrCity} onChange={(e) => setAddrCity(e.target.value)} placeholder="San Francisco" />
              </div>
              <div>
                <Label htmlFor="e_addrState">State/Region</Label>
                <Input id="e_addrState" value={addrState} onChange={(e) => setAddrState(e.target.value)} placeholder="CA" />
              </div>
              <div>
                <Label htmlFor="e_addrPostal">Postal code</Label>
                <Input id="e_addrPostal" value={addrPostal} onChange={(e) => setAddrPostal(e.target.value)} placeholder="94107" />
              </div>
              <div>
                <Label htmlFor="e_addrCountry">Country</Label>
                <Input id="e_addrCountry" value={addrCountry} onChange={(e) => setAddrCountry(e.target.value)} placeholder="US" />
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <Checkbox id="e_defaultShip" checked={addrDefaultShip} onCheckedChange={(v) => setAddrDefaultShip(Boolean(v))} />
                <Label htmlFor="e_defaultShip">Set as default shipping</Label>
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <Checkbox id="e_defaultBill" checked={addrDefaultBill} onCheckedChange={(v) => setAddrDefaultBill(Boolean(v))} />
                <Label htmlFor="e_defaultBill">Set as default billing</Label>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveEdit} disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Saved addresses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Add addresses for faster checkout.
              </p>
              <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) resetAddressForm(); }}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => { resetAddressForm(); setAddOpen(true); }}>Add new</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add address</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="addrLabel">Label</Label>
                      <Input id="addrLabel" value={addrLabel} onChange={(e) => setAddrLabel(e.target.value)} placeholder="Office" />
                    </div>
                    <div>
                      <Label htmlFor="addrFullName">Full name</Label>
                      <Input id="addrFullName" value={addrFullName} onChange={(e) => setAddrFullName(e.target.value)} placeholder="Jane Doe" />
                    </div>
                    <div>
                      <Label htmlFor="addrCompany">Company</Label>
                      <Input id="addrCompany" value={addrCompany} onChange={(e) => setAddrCompany(e.target.value)} placeholder="ACME Inc." />
                    </div>
                    <div>
                      <Label htmlFor="addrPhone">Phone</Label>
                      <Input id="addrPhone" value={addrPhone} onChange={(e) => setAddrPhone(e.target.value)} placeholder="(555) 555-5555" />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="addr1">Address line 1</Label>
                      <Input id="addr1" value={addr1} onChange={(e) => setAddr1(e.target.value)} placeholder="123 Main St" />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="addr2">Address line 2</Label>
                      <Input id="addr2" value={addr2} onChange={(e) => setAddr2(e.target.value)} placeholder="Suite 100" />
                    </div>
                    <div>
                      <Label htmlFor="addrCity">City</Label>
                      <Input id="addrCity" value={addrCity} onChange={(e) => setAddrCity(e.target.value)} placeholder="San Francisco" />
                    </div>
                    <div>
                      <Label htmlFor="addrState">State/Region</Label>
                      <Input id="addrState" value={addrState} onChange={(e) => setAddrState(e.target.value)} placeholder="CA" />
                    </div>
                    <div>
                      <Label htmlFor="addrPostal">Postal code</Label>
                      <Input id="addrPostal" value={addrPostal} onChange={(e) => setAddrPostal(e.target.value)} placeholder="94107" />
                    </div>
                    <div>
                      <Label htmlFor="addrCountry">Country</Label>
                      <Input id="addrCountry" value={addrCountry} onChange={(e) => setAddrCountry(e.target.value)} placeholder="US" />
                    </div>
                    <div className="flex items-center gap-2 md:col-span-2">
                      <Checkbox id="defaultShip" checked={addrDefaultShip} onCheckedChange={(v) => setAddrDefaultShip(Boolean(v))} />
                      <Label htmlFor="defaultShip">Set as default shipping</Label>
                    </div>
                    <div className="flex items-center gap-2 md:col-span-2">
                      <Checkbox id="defaultBill" checked={addrDefaultBill} onCheckedChange={(v) => setAddrDefaultBill(Boolean(v))} />
                      <Label htmlFor="defaultBill">Set as default billing</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddAddress} disabled={addingAddress}>
                      {addingAddress ? "Adding..." : "Add"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Defaults</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(addresses || []).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.label || "—"}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {a.full_name || ""} {a.company ? `· ${a.company}` : ""}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {a.address1}
                          {a.address2 ? `, ${a.address2}` : ""}, {a.city}
                          {a.state ? `, ${a.state}` : ""} {a.postal_code || ""}, {a.country}
                        </div>
                        {a.phone ? (
                          <div className="text-xs text-muted-foreground mt-1">{a.phone}</div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-xs">
                          {a.is_default_shipping ? <span className="px-2 py-0.5 rounded bg-muted">Default shipping</span> : (
                            <Button variant="ghost" size="sm" onClick={() => handleSetDefault(a.id, "shipping")}>Set shipping</Button>
                          )}
                          {a.is_default_billing ? <span className="px-2 py-0.5 rounded bg-muted">Default billing</span> : (
                            <Button variant="ghost" size="sm" onClick={() => handleSetDefault(a.id, "billing")}>Set billing</Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openEditAddress(a)}>Edit</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteAddress(a.id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!addresses || addresses.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                        {loadingAddresses ? "Loading..." : "No addresses saved"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Payment history</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Phase</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(payments || []).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{p.orders?.order_number || p.order_id.slice(0, 8)}</TableCell>
                      <TableCell className="capitalize">{p.phase}</TableCell>
                      <TableCell className="capitalize">{String(p.status).replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-right">{formatMoney(p.amount_cents, p.currency)}</TableCell>
                    </TableRow>
                  ))}
                  {(!payments || payments.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        {loadingPayments ? "Loading..." : "No payments made"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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
                <p className="text-sm text-muted-foreground mt-2">Currently using: {displayEmail}</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={handleUpdateEmail} disabled={savingEmail}>
                {savingEmail ? "Updating..." : "Change email"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
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
                {savingPassword ? "Updating..." : "Update password"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-10" />

        <div className="text-sm text-muted-foreground">
          <p>
            Questions? Email us at <a className="underline" href="mailto:support@example.com">support@example.com</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
