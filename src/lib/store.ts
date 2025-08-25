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

// Order management store
interface OrderState {
  currentOrder: any
  orders: any[]
  samples: any[]
  setCurrentOrder: (order: any) => void
  addOrder: (order: any) => Promise<void>
  addSampleOrder: (samples: any) => Promise<void>
  fetchOrders: () => Promise<void>
  fetchSamples: () => Promise<void>
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
          product_id: order.productId,
          quantity: order.quantity,
          colors: order.colors,
          sizes: order.sizes,
          customization_details: order.customizationDetails,
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
      
      set((state) => ({
        orders: [...state.orders, data],
        currentOrder: data
      }))
      
      toast({ 
        title: "Order created!", 
        description: `Order ${data.order_number} has been created successfully.` 
      })
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

      const { data, error } = await supabase
        .from('samples')
        .insert([{
          user_id: user.id,
          product_names: sampleData.productNames,
          shipping_address: sampleData.shippingAddress,
          total_amount: sampleData.totalAmount,
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
        description: `Sample order ${data.sample_number} has been placed successfully.` 
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
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      set({ orders: data || [] })
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  },

  fetchSamples: async () => {
    try {
      const { data, error } = await supabase
        .from('samples')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      set({ samples: data || [] })
    } catch (error) {
      console.error('Error fetching samples:', error)
    }
  },
}))

// Pricing calculator store
interface PricingState {
  quantity: number
  productType: string
  customization: string
  price: number
  savings: number
  updateQuantity: (quantity: number) => void
  updateProductType: (type: string) => void
  updateCustomization: (customization: string) => void
  calculatePrice: () => void
}

export const usePricingStore = create<PricingState>((set, get) => ({
  quantity: 100,
  productType: 't-shirt',
  customization: 'screen-print',
  price: 0,
  savings: 0,

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
    const { quantity, productType, customization } = get()
    
    const productPrices = {
      't-shirt': 12.99,
      'hoodie': 24.99,
      'polo': 18.99,
      'sweatshirt': 22.99
    }

    const customizationPrices = {
      'screen-print': 3.99,
      'embroidery': 5.99,
      'vinyl': 2.99,
      'dtg': 4.99
    }

    const quantityTiers = [
      { min: 50, max: 99, discount: 0 },
      { min: 100, max: 249, discount: 0.05 },
      { min: 250, max: 499, discount: 0.10 },
      { min: 500, max: 999, discount: 0.15 },
      { min: 1000, max: Infinity, discount: 0.20 }
    ]

    const basePrice = productPrices[productType as keyof typeof productPrices] || 12.99
    const customizationCost = customizationPrices[customization as keyof typeof customizationPrices] || 3.99
    
    const tier = quantityTiers.find(t => quantity >= t.min && quantity <= t.max)
    const discount = tier?.discount || 0
    
    const unitPrice = (basePrice + customizationCost) * (1 - discount)
    const totalPrice = unitPrice * quantity
    
    const originalPrice = (basePrice + customizationCost) * quantity
    const currentSavings = originalPrice - totalPrice
    
    set({ price: totalPrice, savings: currentSavings })
  },
}))