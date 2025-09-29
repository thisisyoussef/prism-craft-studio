import { useState } from 'react'
import Navigation from '@/components/Navigation'
import { useProfile } from '@/lib/profile'
import { useQuery } from '@tanstack/react-query'
import { listGuestDrafts, type GuestDraft } from '@/lib/services/guestDraftService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2 } from 'lucide-react'

export default function AdminGuestDrafts() {
  const { data: profile, isLoading: loadingProfile } = useProfile()
  const [email, setEmail] = useState('')
  const [type, setType] = useState<'all' | 'quote' | 'sample'>('all')
  const [limit, setLimit] = useState(50)

  const { data, isLoading, error, refetch } = useQuery<GuestDraft[]>({
    queryKey: ['guest-drafts', email, type, limit],
    queryFn: async () => {
      return await listGuestDrafts({
        email: email || undefined,
        type: type !== 'all' ? type : undefined,
        limit,
      })
    },
  })

  const drafts = data || []

  if (loadingProfile) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
      </>
    )
  }

  if (profile?.role !== 'admin') {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
          <p className="text-muted-foreground">You do not have access to this page.</p>
          <Button onClick={() => window.history.back()}>Go back</Button>
        </div>
      </>
    )
  }

  return (
    <>
      <Navigation />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Guest Drafts</h1>
          <p className="text-sm text-muted-foreground">View and filter guest quote/sample drafts</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-xs text-muted-foreground">Email</label>
                <Input value={email} onChange={(e) => setEmail(e.currentTarget.value)} placeholder="customer@example.com" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Type</label>
                <Select value={type} onValueChange={(v) => setType(v as any)}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="quote">Quote</SelectItem>
                    <SelectItem value="sample">Sample</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Limit</label>
                <Input type="number" min={1} max={200} value={limit} onChange={(e) => setLimit(Math.min(200, Math.max(1, Number(e.currentTarget.value) || 1)))} />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => refetch()} className="w-full">Apply</Button>
                <Button variant="outline" onClick={() => { setEmail(''); setType('all'); setLimit(50); refetch() }} className="w-full">Reset</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin inline" /></TableCell></TableRow>
              ) : error ? (
                <TableRow><TableCell colSpan={7} className="text-red-600 py-8 text-sm">Failed to load drafts: {String((error as any)?.message || error)}</TableCell></TableRow>
              ) : drafts.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-muted-foreground text-center py-8">No drafts</TableCell></TableRow>
              ) : (
                drafts.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{new Date(d.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="capitalize">{d.type}</TableCell>
                    <TableCell>{(d.info as any)?.name || '—'}</TableCell>
                    <TableCell>{(d.info as any)?.email || '—'}</TableCell>
                    <TableCell>{(d.info as any)?.company || '—'}</TableCell>
                    <TableCell>
                      {typeof (d.totals as any)?.total === 'number' ? `$${Number((d.totals as any).total).toFixed(2)}` : (typeof (d.pricing as any)?.total === 'number' ? `$${Number((d.pricing as any).total).toFixed(2)}` : '—')}
                    </TableCell>
                    <TableCell className="text-right">
                      <details>
                        <summary className="cursor-pointer text-sm text-muted-foreground">View</summary>
                        <pre className="mt-2 text-xs whitespace-pre-wrap text-left max-w-[70ch]">{JSON.stringify(d, null, 2)}</pre>
                      </details>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  )
}
