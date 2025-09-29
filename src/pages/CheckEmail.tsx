import { useEffect, useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Navigation from '@/components/Navigation'
import toast from 'react-hot-toast'
import { requestGuestLink } from '@/lib/services/guestOrderService'

export default function CheckEmail() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const emailParam = params.get('email') || ''
  const [email, setEmail] = useState(emailParam)
  const [sending, setSending] = useState(false)
  const [devLink, setDevLink] = useState<string | null>(null)

  useEffect(() => {
    // Pick up a dev magic link if present (set by previous page)
    const dev = sessionStorage.getItem('pcs_dev_magic_link')
    if (dev) setDevLink(dev)
  }, [])

  const handleResend = async () => {
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error('Enter a valid email')
      return
    }
    setSending(true)
    try {
      const res = await requestGuestLink(email)
      if (res?.devLink) {
        setDevLink(res.devLink)
        sessionStorage.setItem('pcs_dev_magic_link', res.devLink)
      }
      toast.success('Link sent. Please check your inbox.')
    } catch (e: any) {
      toast.error(String(e?.message || 'Failed to resend link'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="max-w-xl mx-auto px-6 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We sent a secure link to <span className="font-medium text-foreground">{emailParam || 'your email'}</span>. Open it to access your order.
            </p>

            <div className="space-y-2">
              <Label htmlFor="email">Didn’t get it? Resend</Label>
              <div className="flex gap-2">
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
                <Button onClick={handleResend} disabled={sending}>{sending ? 'Sending…' : 'Resend'}</Button>
              </div>
            </div>

            {devLink && (
              <div className="rounded-md border p-3 bg-muted/40">
                <div className="text-xs text-muted-foreground mb-2">Developer shortcut (local only)</div>
                <Button variant="outline" onClick={() => { window.location.assign(devLink) }}>
                  Open magic link
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Link to="/find-order" className="text-sm underline">Use a different email</Link>
              <Button variant="ghost" onClick={() => navigate('/')}>Return home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
