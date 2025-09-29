// Server configuration
export const config = {
  MONGODB_URI: 'mongodb+srv://youssefiahmedis_db_user:3gUXx0zIzz0C4jGD@cluster0.nmqffov.mongodb.net/prism-craft-studio',
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  // Add other config as needed
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY
};
