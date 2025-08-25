import { create } from 'zustand'
import { supabase } from '@/integrations/supabase/client'
import type { User } from '@supabase/supabase-js'
import { toast } from '@/hooks/use-toast'

interface AuthState {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, companyName: string) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      set({ user: session?.user ?? null, loading: false })

      // Listen for auth changes
      supabase.auth.onAuthStateChange((event, session) => {
        set({ user: session?.user ?? null, loading: false })
      })
    } catch (error) {
      console.error('Error initializing auth:', error)
      set({ loading: false })
    }
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      set({ user: data.user, loading: false })
      toast({ 
        title: "Welcome back!", 
        description: "You've been signed in successfully." 
      })
    } catch (error) {
      set({ loading: false })
      toast({ 
        title: "Error", 
        description: "Invalid email or password. Please try again.",
        variant: "destructive"
      })
      throw error
    }
  },

  signUp: async (email: string, password: string, companyName: string) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            company_name: companyName,
          },
        },
      })
      if (error) throw error
      
      set({ user: data.user, loading: false })
      toast({ 
        title: "Account created!", 
        description: "Please check your email to confirm your account." 
      })
    } catch (error) {
      set({ loading: false })
      toast({ 
        title: "Error", 
        description: "Failed to create account. Please try again.",
        variant: "destructive"
      })
      throw error
    }
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      set({ user: null })
      toast({ 
        title: "Signed out", 
        description: "You've been signed out successfully." 
      })
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "There was an error signing out. Please try again.",
        variant: "destructive"
      })
      throw error
    }
  },
}))

// Guest checkout store (no auth required)
interface GuestInfo {
  name: string
  email: string
  phone?: string
  company?: string
}

interface GuestAddress {
  address?: string
  city?: string
  state?: string
  zip?: string
  country?: string
}

interface GuestOrderDraft {
  id: string
  created_at: string
  type: 'sample' | 'quote'
  items: any[]
  totals?: {
    subtotal?: number
    shipping?: number
    total?: number
  }
  notes?: string
  pricing?: any
}

interface GuestState {
  info: GuestInfo | null
  address: GuestAddress
  drafts: GuestOrderDraft[]
  setGuestInfo: (info: GuestInfo) => void
  setGuestAddress: (addr: GuestAddress) => void
  addDraft: (draft: Omit<GuestOrderDraft, 'id' | 'created_at'>) => GuestOrderDraft
  clear: () => void
}

export const useGuestStore = create<GuestState>((set, get) => ({
  info: null,
  address: { country: 'US' },
  drafts: [],

  setGuestInfo: (info) => set({ info }),
  setGuestAddress: (addr) => set({ address: { ...get().address, ...addr } }),

  addDraft: (draft) => {
    const newDraft: GuestOrderDraft = {
      id: crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      created_at: new Date().toISOString(),
      ...draft,
    }
    set((state) => ({ drafts: [newDraft, ...state.drafts] }))
    return newDraft
  },

  clear: () => set({ info: null, address: { country: 'US' }, drafts: [] })
}))

// Order management store
interface OrderState {
  currentOrder: any
  orders: any[]
  samples: any[]
  setCurrentOrder: (order: any) => void
  addOrder: (order: any) => Promise<any>
  addSampleOrder: (samples: any) => Promise<void>
  fetchOrders: () => Promise<void>
  fetchSamples: () => Promise<void>
  startCheckout: (orderId: string, phase: 'deposit' | 'balance') => Promise<void>
}

export const useOrderStore = create<OrderState>((set, get) => ({
  currentOrder: null,
  orders: [],
  samples: [],

  setCurrentOrder: (order) => set({ currentOrder: order }),

  addOrder: async (order) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('orders')
        .insert([{
          user_id: user.id,
          // product_id expects a UUID; since our UI uses string keys (e.g., 't-shirt'), store it in customization_details and leave UUID null
          product_id: null,
          quantity: order.quantity,
          colors: order.colors,
          // sizes column is TEXT[] in DB; our UI uses a map. Store detailed sizes in customization_details and leave column null.
          sizes: null,
          customization_details: {
            ...order.customizationDetails,
            sizes: order.sizes,
            product_type_key: order.productId
          },
          artwork_files: order.artworkFiles,
          custom_text: order.customText,
          placement: order.placement,
          notes: order.notes,
          total_amount: order.totalAmount,
          status: 'draft'
        }])
        .select()
        .single()
      
      if (error) throw error

      // Compute 40/60 split for payments (in cents)
      const totalAmountCents = Math.round(((order.totalAmount as number) || 0) * 100)
      const depositCents = Math.round(totalAmountCents * 0.4)
      const balanceCents = Math.max(totalAmountCents - depositCents, 0)

      // Persist split amounts on order (best-effort)
      const _updateOrder = await (supabase as any)
        .from('orders')
        .update({
          deposit_amount_cents: depositCents,
          balance_amount_cents: balanceCents,
        })
        .eq('id', (data as any).id)

      // Initialize payments rows (best-effort; ignore errors but log)
      const _initPayments = await (supabase as any)
        .from('payments')
        .upsert([
          { order_id: (data as any).id, phase: 'deposit', amount_cents: depositCents, status: 'requires_payment_method' },
          { order_id: (data as any).id, phase: 'balance', amount_cents: balanceCents, status: 'requires_payment_method' },
        ], { onConflict: 'order_id,phase' })

      if (_initPayments.error) {
        console.warn('Failed to initialize payments rows', _initPayments.error)
      }

      set((state) => ({
        orders: [...state.orders, data],
        currentOrder: data
      }))
      
      toast({ 
        title: "Order created!", 
        description: `Order ${data.order_number} has been created successfully.` 
      })
      return data
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to create order. Please try again.",
        variant: "destructive"
      })
      throw error
    }
  },

  addSampleOrder: async (sampleData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      // Normalize incoming payload from UI
      const productNames: string[] =
        sampleData?.productNames
        || (Array.isArray(sampleData?.products) ? sampleData.products.map((p: any) => p?.name).filter(Boolean) : [])
        || []

      const shippingAddress = sampleData?.shippingAddress ?? sampleData?.shipping_address ?? null

      const totalAmount =
        (typeof sampleData?.totalAmount === 'number' ? sampleData.totalAmount : undefined)
        ?? (typeof sampleData?.total_price === 'number' ? sampleData.total_price : undefined)
        ?? (Array.isArray(sampleData?.products)
              ? sampleData.products.reduce((sum: number, p: any) => sum + (Number(p?.price) || 0), 0)
              : 0)

      const { data, error } = await supabase
        .from('samples')
        .insert([{
          user_id: user.id,
          product_names: productNames,
          shipping_address: shippingAddress,
          total_amount: totalAmount,
          status: 'pending'
        }])
        .select()
        .single()
      
      if (error) throw error
      
      set((state) => ({
        samples: [...state.samples, data]
      }))
      
      toast({ 
        title: "Sample order placed!", 
        description: `Your sample order has been placed successfully.` 
      })
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to place sample order. Please try again.",
        variant: "destructive"
      })
      throw error
    }
  },

  fetchOrders: async () => {
    try {
      const { data: auth } = await supabase.auth.getUser()
      const uid = auth?.user?.id
      const query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
      const { data, error } = uid
        ? await query.eq('user_id', uid)
        : await query
      
      if (error) throw error
      set({ orders: data || [] })
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  },

  fetchSamples: async () => {
    try {
      const { data: auth } = await supabase.auth.getUser()
      const uid = auth?.user?.id
      const query = supabase
        .from('samples')
        .select('*')
        .order('created_at', { ascending: false })
      const { data, error } = uid
        ? await query.eq('user_id', uid)
        : await query
      
      if (error) throw error
      set({ samples: data || [] })
    } catch (error) {
      console.error('Error fetching samples:', error)
    }
  },

  startCheckout: async (orderId, phase) => {
    try {
      // Try to get payment row first (may not exist for older orders)
      const { data: payment, error: payErr } = await (supabase as any)
        .from('payments')
        .select('amount_cents')
        .eq('order_id', orderId)
        .eq('phase', phase)
        .maybeSingle()

      let amountCents = payment?.amount_cents as number | undefined

      // If not found, fallback to recomputing a 40/60 split from the order's total
      if ((!amountCents || amountCents <= 0) || payErr) {
        const { data: orderRow, error: orderErr } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('id', orderId)
          .single()
        if (orderErr) throw orderErr

        const totalAmountCents = Math.round((Number((orderRow as any)?.total_amount) || 0) * 100)
        const fallbackDeposit = Math.round(totalAmountCents * 0.4)
        const fallbackBalance = Math.max(totalAmountCents - fallbackDeposit, 0)
        amountCents = phase === 'deposit' ? fallbackDeposit : fallbackBalance

        // Best-effort: upsert missing payments row so future calls succeed
        if (amountCents && amountCents > 0) {
          await (supabase as any)
            .from('payments')
            .upsert({ order_id: orderId, phase, amount_cents: amountCents, status: 'requires_payment_method' }, { onConflict: 'order_id,phase' })
        }
      }

      if (!amountCents || amountCents <= 0) throw new Error('Invalid payment amount')
      if (amountCents < 50) {
        throw new Error('Stripe requires a minimum charge of $0.50 USD. Please increase the order total or contact support to arrange payment.')
      }

      // Call Edge Function to create Checkout Session
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          orderId,
          phase,
          amountCents,
          currency: 'usd',
        },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })
      if (error) {
        // Try to extract text/JSON error returned by the Edge Function
        let serverMsg: string | undefined
        try {
          const anyErr: any = error as any
          const resp = anyErr?.context
          if (resp && typeof resp.text === 'function') {
            const raw = await resp.text()
            if (raw) {
              try {
                const body = JSON.parse(raw)
                serverMsg = body?.error || body?.message || raw
              } catch {
                serverMsg = raw
              }
            }
          }
        } catch {}
        console.warn('[functions.create-checkout] invoke failed, attempting direct fetch fallback...', serverMsg)

        // Fallback: direct fetch to Functions URL to ensure body is sent
        const functionsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
        const { data: sessionData } = await supabase.auth.getSession()
        const accessToken = sessionData?.session?.access_token || anonKey
        const fallbackResp = await fetch(functionsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ orderId, phase, amountCents, currency: 'usd' }),
        })
        if (!fallbackResp.ok) {
          let msg = `Edge function error (${fallbackResp.status})`
          try {
            const raw = await fallbackResp.text()
            if (raw) {
              try {
                const j = JSON.parse(raw)
                msg = j?.error || j?.message || raw
              } catch {
                msg = raw
              }
            }
          } catch {}
          console.error('[functions.create-checkout] direct fetch failed', msg)
          throw new Error(msg)
        }
        const j = await fallbackResp.json()
        const url = (j as any)?.url
        if (!url) throw new Error('Missing checkout URL')
        window.location.href = url
        return
      }

      const url = (data as any)?.url
      if (!url) throw new Error('Missing checkout URL')
      window.location.href = url
    } catch (err: any) {
      console.error('Failed to start checkout', err?.message || err, err)
      toast({
        title: 'Payment error',
        description: err?.message ? String(err.message) : 'Unable to start checkout. Please try again.',
        variant: 'destructive',
      })
      throw err
    }
  },
}))

// Pricing calculator store
export type PrintLocation = 'front' | 'back' | 'left_sleeve' | 'right_sleeve' | 'collar' | 'tag'
export type PrintMethod = 'screen-print' | 'embroidery' | 'dtf' | 'heat_transfer' | 'vinyl' | 'dtg'

export interface PrintPlacement {
  id: string
  location: PrintLocation
  method: PrintMethod
  colors: string[]
  colorCount: number
  size: { widthIn: number; heightIn: number }
  position: { x: number; y: number } // normalized -1..1 relative to center
  rotationDeg?: number
  artworkFiles: string[] | File[] // in UI, Files; persisted/email can use string names
  customText?: string
  notes?: string
  active: boolean
}

interface PricingState {
  quantity: number
  productType: string
  customization: string
  price: number
  savings: number
  // multiple print placements (cap at 4)
  prints: PrintPlacement[]
  addPrint: (print: Omit<Partial<PrintPlacement>, 'id'> & Pick<PrintPlacement, 'location' | 'method'>) => PrintPlacement | null
  updatePrint: (id: string, patch: Partial<PrintPlacement>) => void
  removePrint: (id: string) => void
  duplicatePrint: (id: string) => PrintPlacement | null
  updateQuantity: (quantity: number) => void
  updateProductType: (type: string) => void
  updateCustomization: (customization: string) => void
  calculatePrice: () => void
  priceBreakdown?: {
    baseUnit: number
    printsSurchargeUnit: number
    discountRate: number
    unitPrice: number
    totalPrice: number
  }
}

export const usePricingStore = create<PricingState>((set, get) => ({
  quantity: 100,
  productType: 't-shirt',
  customization: 'screen-print',
  price: 0,
  savings: 0,
  prints: [],

  addPrint: (print) => {
    const state = get()
    if ((state.prints?.length || 0) >= 4) {
      console.warn('[pricing] Max 4 prints reached')
      return null
    }
    const id = crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
    const defaults: PrintPlacement = {
      id,
      location: print.location,
      method: print.method,
      colors: [],
      colorCount: 1,
      size: defaultSizeForLocation(print.location),
      position: { x: 0, y: 0 },
      rotationDeg: 0,
      artworkFiles: [],
      customText: '',
      notes: '',
      active: true,
    }
    const next = { ...defaults, ...print, id }
    set({ prints: [...(state.prints || []), next] })
    get().calculatePrice()
    return next
  },

  updatePrint: (id, patch) => {
    set((state) => ({
      prints: (state.prints || []).map(p => (p.id === id ? { ...p, ...patch } : p))
    }))
    get().calculatePrice()
  },

  removePrint: (id) => {
    set((state) => ({
      prints: (state.prints || []).filter(p => p.id !== id)
    }))
    get().calculatePrice()
  },

  duplicatePrint: (id) => {
    const state = get()
    const src = state.prints.find(p => p.id === id)
    if (!src) return null
    if (state.prints.length >= 4) {
      console.warn('[pricing] Max 4 prints reached')
      return null
    }
    const newId = crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
    const copy: PrintPlacement = { ...src, id: newId, position: { ...src.position }, rotationDeg: src.rotationDeg ?? 0 }
    set({ prints: [...state.prints, copy] })
    get().calculatePrice()
    return copy
  },

  updateQuantity: (quantity) => {
    set({ quantity })
    get().calculatePrice()
  },

  updateProductType: (productType) => {
    set({ productType })
    get().calculatePrice()
  },

  updateCustomization: (customization) => {
    set({ customization })
    get().calculatePrice()
  },

  calculatePrice: () => {
    const { quantity, productType, prints } = get()

    const productPrices = {
      't-shirt': 12.99,
      'hoodie': 24.99,
      'polo': 18.99,
      'sweatshirt': 22.99
    }

    // Simple per-print surcharge model (per piece)
    const methodBase: Record<PrintMethod, number> = {
      'screen-print': 0.2, // per color below
      'embroidery': 0.5,
      'vinyl': 0.3,
      'dtg': 0.4,
      'dtf': 0.35,
      'heat_transfer': 0.25,
    }

    const locationMultiplier: Record<PrintLocation, number> = {
      front: 1,
      back: 1,
      left_sleeve: 0.6,
      right_sleeve: 0.6,
      collar: 0.5,
      tag: 0.5,
    }

    const basePrice = productPrices[productType as keyof typeof productPrices] || 12.99

    // Compute prints surcharge per piece
    const printsSurchargeUnit = (prints || []).reduce((sum, p) => {
      if (!p.active) return sum
      const locMul = locationMultiplier[p.location] ?? 1
      let add = 0
      if (p.method === 'screen-print') {
        add = methodBase['screen-print'] * Math.max(1, p.colorCount || 1)
      } else {
        add = methodBase[p.method as PrintMethod] ?? 0
      }
      return sum + add * locMul
    }, 0)

    const quantityTiers = [
      { min: 50, max: 99, discount: 0 },
      { min: 100, max: 249, discount: 0.05 },
      { min: 250, max: 499, discount: 0.10 },
      { min: 500, max: 999, discount: 0.15 },
      { min: 1000, max: Infinity, discount: 0.20 }
    ]

    const tier = quantityTiers.find(t => quantity >= t.min && quantity <= t.max)
    const discount = tier?.discount || 0

    const baseUnit = basePrice
    const unitPrice = (baseUnit + printsSurchargeUnit) * (1 - discount)
    const totalPrice = unitPrice * quantity
    const originalPrice = (baseUnit + printsSurchargeUnit) * quantity
    const currentSavings = originalPrice - totalPrice

    set({ 
      price: totalPrice, 
      savings: currentSavings,
      priceBreakdown: {
        baseUnit,
        printsSurchargeUnit,
        discountRate: discount,
        unitPrice,
        totalPrice,
      }
    })
  },
}))

// helpers
function defaultSizeForLocation(loc: PrintLocation): { widthIn: number; heightIn: number } {
  switch (loc) {
    case 'front':
    case 'back':
      return { widthIn: 10, heightIn: 12 }
    case 'left_sleeve':
    case 'right_sleeve':
      return { widthIn: 3, heightIn: 3 }
    case 'collar':
    case 'tag':
      return { widthIn: 2.5, heightIn: 1.5 }
    default:
      return { widthIn: 4, heightIn: 4 }
  }
}