import { useState } from 'react'
import Navigation from '@/components/Navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { requestGuestLink } from '@/lib/services/guestOrderService'
import { Loader2 } from 'lucide-react'

export default function FindMyOrder() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSent(false)
    setLoading(true)
    try {
      await requestGuestLink(email)
      setSent(true)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to send magic link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navigation />
      <div className="max-w-lg mx-auto px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Find my order</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.currentTarget.value)} placeholder="you@company.com" required />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send magic link
              </Button>
            </form>
            {sent && <p className="text-sm text-green-600 mt-4">Check your inbox for a magic link to access your order.</p>}
            {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
