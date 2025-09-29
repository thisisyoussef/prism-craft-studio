import { z } from 'zod'

// Guest details schema used for guest checkout/quote flows
export const guestDetailsSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be under 100 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z
    .string()
    .trim()
    .max(30, 'Phone number is too long')
    .optional()
    .or(z.literal('')),
  company: z.string().max(120, 'Company name is too long').optional().or(z.literal('')),
  address: z.string().max(200, 'Address is too long').optional().or(z.literal('')),
  city: z.string().max(80, 'City is too long').optional().or(z.literal('')),
  state: z.string().max(80, 'State/Region is too long').optional().or(z.literal('')),
  zip: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9\-\s]*$/, 'ZIP/Postal code contains invalid characters')
    .max(20, 'ZIP/Postal code is too long')
    .optional()
    .or(z.literal('')),
  country: z
    .string()
    .min(2, 'Country must be at least 2 characters')
    .max(56, 'Country name is too long')
    .default('US'),
})

export type GuestDetailsInput = z.infer<typeof guestDetailsSchema>

// Auth schemas
export const signInSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export const signUpSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  companyName: z.string().min(2, 'Company name must be at least 2 characters').optional().or(z.literal('')),
  email: z.string().email('Enter a valid business email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type SignInInput = z.infer<typeof signInSchema>
export type SignUpInput = z.infer<typeof signUpSchema>

// Product Customizer schemas
const sizeQtySchema = z.record(z.string(), z.number().nonnegative())

export const customizerSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  selectedColors: z.array(z.string()).optional().default([]),
  sizesQty: sizeQtySchema.refine(
    (rec) => Object.values(rec).reduce((a, b) => a + (b || 0), 0) >= 50,
    'Enter size quantities totaling at least 50 pieces'
  ),
  prints: z
    .array(
      z.object({
        id: z.string(),
        location: z.string(),
        method: z.string(),
        size: z.object({ widthIn: z.number().positive(), heightIn: z.number().positive() }),
        active: z.boolean().optional(),
      })
    )
    .min(1, 'Add at least one print placement'),
})

export type CustomizerInput = z.infer<typeof customizerSchema>

// Address book schema (user-managed addresses)
export const addressSchema = z.object({
  label: z.string().max(80, 'Label is too long').optional().or(z.literal('')),
  full_name: z.string().max(120, 'Name is too long').optional().or(z.literal('')),
  company: z.string().max(120, 'Company is too long').optional().or(z.literal('')),
  phone: z.string().trim().max(30, 'Phone is too long').optional().or(z.literal('')),
  address1: z.string().min(2, 'Address line 1 is required').max(200, 'Address is too long'),
  address2: z.string().max(200, 'Address line 2 is too long').optional().or(z.literal('')),
  city: z.string().min(2, 'City is required').max(80, 'City is too long'),
  state: z.string().max(80, 'State/Region is too long').optional().or(z.literal('')),
  postal_code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9\-\s]*$/, 'ZIP/Postal code contains invalid characters')
    .max(20, 'ZIP/Postal code is too long')
    .optional()
    .or(z.literal('')),
  country: z.string().min(2, 'Country is required').max(56, 'Country name is too long'),
  is_default_shipping: z.boolean().optional(),
  is_default_billing: z.boolean().optional(),
})

export type AddressInput = z.infer<typeof addressSchema>
