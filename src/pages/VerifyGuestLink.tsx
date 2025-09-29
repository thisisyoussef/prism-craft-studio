import { useEffect, useState } from 'react'
import Navigation from '@/components/Navigation'
import { useNavigate, useLocation } from 'react-router-dom'
import { verifyGuestToken } from '@/lib/services/guestOrderService'
import { setGuestToken } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function useQueryParam(name: string) {
  const { search } = useLocation()
  return new URLSearchParams(search).get(name)
}

export default function VerifyGuestLink() {
  const navigate = useNavigate()
  const token = useQueryParam('token') || ''
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    (async () => {
      if (!token) {
        setStatus('error')
        setMessage('Missing or invalid link token.')
        return
      }
      try {
        const res = await verifyGuestToken(token)
        setGuestToken(res.token)
        setStatus('success')
        setTimeout(() => navigate('/guest/orders'), 500)
      } catch (err: any) {
        setStatus('error')
        setMessage(err?.response?.data?.error || err?.message || 'Verification failed. The link may have expired.')
      }
    })()
  }, [token, navigate])

  return (
    <>
      <Navigation />
      <div className="max-w-lg mx-auto px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Verifying access…</CardTitle>
          </CardHeader>
          <CardContent>
            {status === 'verifying' && <p className="text-sm text-muted-foreground">Please wait while we verify your link.</p>}
            {status === 'success' && <p className="text-sm text-green-600">Success! Redirecting…</p>}
            {status === 'error' && (
              <div className="space-y-2">
                <p className="text-sm text-red-600">{message}</p>
                <a href="/find-order" className="text-sm underline">Request a new link</a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
