import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/lib/store'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { signInSchema, signUpSchema, type SignInInput, type SignUpInput } from '@/lib/validation'
import { serverErrorMessage } from '@/lib/errors'

interface AuthDialogProps {
  trigger?: React.ReactNode
  defaultTab?: 'signin' | 'signup'
}

const AuthDialog = ({ trigger, defaultTab = 'signin' }: AuthDialogProps) => {
  const [open, setOpen] = useState(false)
  const { signIn, signUp, loading } = useAuthStore()
  const signInForm = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
  })

  const signUpForm = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { firstName: '', lastName: '', companyName: '', email: '', password: '' },
    mode: 'onSubmit',
  })

  const handleSignIn = async (values: SignInInput) => {
    try {
      await signIn(values.email, values.password)
      toast.success('Welcome back!')
      setOpen(false)
      signInForm.reset()
    } catch (error: any) {
      toast.error(serverErrorMessage(error, 'Failed to sign in'))
    }
  }

  const handleSignUp = async (values: SignUpInput) => {
    try {
      await signUp(values.email, values.password, values.companyName || '', values.firstName, values.lastName)
      toast.success("Account created! You're signed in.")
      setOpen(false)
      signUpForm.reset()
    } catch (error: any) {
      toast.error(serverErrorMessage(error, 'Failed to create account'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="hero">Sign In</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to PTRN</DialogTitle>
          <DialogDescription>
            Join our community. Sign in or create an account to serve together.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Join us</TabsTrigger>
            <TabsTrigger value="signup">Start together</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4">
            <Form {...signInForm}>
              <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                <FormField
                  control={signInForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input id="signin-email" type="email" placeholder="company@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signInForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input id="signin-password" type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Join community
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <Form {...signUpForm}>
              <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                <FormField
                  control={signUpForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input id="firstName" placeholder="Jane" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signUpForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input id="lastName" placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signUpForm.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company name</FormLabel>
                      <FormControl>
                        <Input id="company-name" placeholder="Your Company Inc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signUpForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business email</FormLabel>
                      <FormControl>
                        <Input id="signup-email" type="email" placeholder="admin@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signUpForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input id="signup-password" type="password" placeholder="8+ characters" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Start together
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>

        <div className="text-center text-sm text-muted-foreground">
          By continuing, you agree to our{' '}
          <Link to="/terms" className="underline hover:text-foreground">Terms of Service</Link>{' '}and{' '}
          <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AuthDialog