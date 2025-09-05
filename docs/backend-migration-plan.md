## Backend Migration Blueprint: Supabase → Node.js (Express) + Mongoose

### 1) Purpose and Scope
- Replace Supabase (PostgREST, SQL/RLS policies, Storage, Functions, Realtime) with a self-hosted Node.js backend using Express, Mongoose (MongoDB), and complementary services.
- Deliverables:
  - New backend codebase (Express API + Mongoose models)
  - Data migration scripts from Supabase Postgres → MongoDB
  - Endpoint parity for existing features used by the frontend
  - Strategy to replace Supabase Functions (Stripe/webhooks, emails) and Realtime
  - Auth and authorization strategy replacing Supabase Auth

---

### 2) Tech Stack and Dependencies
- Runtime: Node.js 18+
- Server: Express 4+
- DB: MongoDB 6+, ODM: Mongoose 8+
- Auth: JWT (access + refresh), bcrypt for password hashing
- Validation: zod or joi
- Security: helmet, cors, express-rate-limit
- Logging: morgan, pino-http (optional)
- Uploads: multer + S3 SDK (recommended) or local disk for dev
- Realtime: socket.io (preferred) or Server-Sent Events
- Payments: stripe
- Email: nodemailer (or Resend/SendGrid provider)
- Utilities: dotenv, uuid, dayjs, http-errors

Install (backend workspace):
- npm i express mongoose zod jsonwebtoken bcrypt helmet cors express-rate-limit morgan socket.io stripe multer @aws-sdk/client-s3 nodemailer dotenv dayjs http-errors uuid
- npm i -D typescript ts-node-dev @types/node @types/express @types/jsonwebtoken @types/bcrypt @types/cors @types/morgan @types/http-errors @types/uuid

---

### 3) Environment Variables (.env)
- PORT=4000
- NODE_ENV=development
- MONGODB_URI=mongodb://user:pass@host:27017/app
- JWT_ACCESS_SECRET=...
- JWT_REFRESH_SECRET=...
- JWT_ACCESS_TTL=15m
- JWT_REFRESH_TTL=7d
- STRIPE_SECRET_KEY=sk_live_...
- STRIPE_WEBHOOK_SECRET=whsec_...
- EMAIL_FROM=noreply@example.com
- SMTP_HOST=...
- SMTP_PORT=587
- SMTP_USER=...
- SMTP_PASS=...
- S3_BUCKET=...
- S3_REGION=...
- S3_ACCESS_KEY_ID=...
- S3_SECRET_ACCESS_KEY=...
- APP_ORIGIN=https://app.example.com
- ADMIN_ORIGIN=https://admin.example.com

---

### 4) Project Structure (server/)
- server/
  - src/
    - app.ts (express app setup: middleware, routes, errors)
    - server.ts (http server bootstrap + socket.io)
    - config/
      - env.ts (env loader/validator)
      - db.ts (mongoose connect)
    - middleware/
      - auth.ts (JWT auth, role + company scoping)
      - error.ts (error handler)
      - validate.ts (zod/joi validator)
      - rateLimit.ts
    - models/
      - Company.ts
      - Profile.ts
      - Product.ts
      - ProductVariant.ts
      - Order.ts
      - Payment.ts
      - ProductionUpdate.ts
      - OrderTimeline.ts
      - Sample.ts
      - DesignerBooking.ts
      - FileUpload.ts
      - PricingRule.ts
      - Address.ts (if needed)
      - User.ts (if migrating away from Supabase Auth)
    - controllers/
      - authController.ts
      - companyController.ts
      - profileController.ts
      - productController.ts
      - orderController.ts
      - paymentController.ts
      - productionController.ts
      - timelineController.ts
      - sampleController.ts
      - bookingController.ts
      - fileController.ts
      - pricingController.ts
      - emailController.ts
      - stripeWebhookController.ts
    - routes/
      - authRoutes.ts
      - companyRoutes.ts
      - profileRoutes.ts
      - productRoutes.ts
      - orderRoutes.ts
      - paymentRoutes.ts
      - productionRoutes.ts
      - timelineRoutes.ts
      - sampleRoutes.ts
      - bookingRoutes.ts
      - fileRoutes.ts
      - pricingRoutes.ts
      - emailRoutes.ts
      - webhookRoutes.ts (stripe)
      - index.ts (aggregate)
    - services/
      - authService.ts
      - productService.ts
      - orderService.ts
      - paymentService.ts
      - emailService.ts
      - fileService.ts
      - pricingService.ts
      - realtimeService.ts (socket.io events)
    - utils/
      - crypto.ts
      - jwt.ts
      - s3.ts
      - pagination.ts
      - roles.ts
      - errors.ts
    - types/
      - api.ts
      - domain.ts
    - jobs/ (optional)
      - emailJobs.ts
      - invoiceJobs.ts
    - migration/
      - export-postgres.sql (reference)
      - import-mongo.ts (runner)
      - transformers/
        - companies.ts
        - profiles.ts
        - products.ts
        - productVariants.ts
        - orders.ts
        - payments.ts
        - productionUpdates.ts
        - orderTimeline.ts
        - samples.ts
        - designerBookings.ts
        - fileUploads.ts
        - pricingRules.ts
  - package.json, tsconfig.json, .env.example, Dockerfile

---

### 5) Models to Create (Mongoose Schemas)
Note: Preserve Supabase UUIDs in fields like externalId for traceability; use ObjectId for _id.

- Company
  - name: string, industry?: string, size?: string, address?: string, phone?: string, logoUrl?: string
  - billingAddress?: JSON
  - createdAt, updatedAt

- Profile
  - userId: ObjectId (ref User)
  - companyId: ObjectId (ref Company)
  - firstName, lastName, role: 'admin'|'member', phone?
  - createdAt, updatedAt

- User (if replacing Supabase Auth)
  - email (unique), passwordHash, lastLoginAt, isActive, roles: string[]
  - companyId?: ObjectId

- Product
  - name, category, basePrice: number
  - description?, images?: string[], materials?: string[], colors?: string[], sizes?: string[]
  - moq?: number, active: boolean
  - createdAt, updatedAt

- ProductVariant
  - productId: ObjectId (ref Product)
  - colorName, colorHex, price?: number, stock: number
  - imageUrl?, frontImageUrl?, backImageUrl?, sleeveImageUrl?
  - active: boolean
  - createdAt, updatedAt

- Order
  - companyId: ObjectId (ref Company), userId: ObjectId (ref User)
  - orderNumber (unique), productCategory, productId?: ObjectId, productName
  - quantity: number, unitPrice: number, totalAmount: number
  - customization: JSON, colors: string[], sizes: JSON, printLocations: JSON
  - status: string ('deposit_pending', 'in_production', ...), priority?: string, labels?: string[]
  - depositAmount: number, balanceAmount: number
  - depositPaidAt?: Date, balancePaidAt?: Date
  - shippingAddress?: JSON, trackingNumber?: string
  - estimatedDelivery?: Date, actualDelivery?: Date
  - artworkFiles?: string[]
  - productionNotes?, customerNotes?, adminNotes?
  - stripeDepositPaymentIntent?, stripeBalancePaymentIntent?
  - createdAt, updatedAt

- Payment
  - orderId: ObjectId (ref Order)
  - phase: 'deposit'|'balance'
  - amountCents: number, currency: string
  - status: 'pending'|'requires_action'|'paid'|'failed'
  - stripePaymentIntentId?, stripeCheckoutSessionId?, stripeChargeId?
  - paidAt?: Date, metadata?: JSON
  - createdAt, updatedAt

- ProductionUpdate
  - orderId: ObjectId (ref Order)
  - stage: string, status: string, title?: string
  - description?: string, photos?: string[], documents?: string[]
  - estimatedCompletion?: Date, actualCompletion?: Date
  - createdBy?: ObjectId (ref User)
  - visibleToCustomer: boolean
  - createdAt, updatedAt

- OrderTimeline
  - orderId: ObjectId (ref Order)
  - eventType: string, description: string
  - eventData: JSON, triggerSource: 'manual'|'system'|'webhook'|'api'
  - triggeredBy?: ObjectId (ref User)
  - createdAt

- Sample
  - companyId: ObjectId, userId: ObjectId
  - sampleNumber (unique), products: JSON[], totalPrice: number
  - status: 'ordered'|'processing'|'shipped'|'delivered'|'converted_to_order'
  - shippingAddress?: JSON, trackingNumber?: string
  - convertedOrderId?: ObjectId (ref Order)
  - stripePaymentIntentId?: string
  - createdAt, updatedAt

- DesignerBooking
  - companyId: ObjectId, userId: ObjectId
  - designerId: string, consultationType: string
  - scheduledDate: Date, durationMinutes: number
  - status: 'scheduled'|'confirmed'|'in_progress'|'completed'|'cancelled'|'rescheduled'
  - price: number, meetingLink?: string, notes?: string
  - projectFiles?: string[], stripePaymentIntentId?: string
  - createdAt, updatedAt

- FileUpload
  - userId: ObjectId, orderId?: ObjectId, bookingId?: ObjectId
  - fileName, fileSize, fileType, fileUrl, filePurpose: 'artwork'|'tech_pack'|'reference'|'proof'|'final_design'
  - uploadedAt

- PricingRule
  - productType: string, customizationType: string
  - quantityMin: number, quantityMax?: number
  - basePrice: number, customizationCost: number, discountPercentage: number
  - active: boolean, createdAt, updatedAt

- Address (optional standalone or embedded)
  - userId: ObjectId
  - fields: address1, address2?, city, state?, postalCode?, country, phone?, label?, isDefaultShipping, isDefaultBilling
  - createdAt, updatedAt

---

### 6) REST API Endpoints to Create
Auth (JWT):
- POST /api/auth/register { email, password, companyName? } → { user, tokens }
- POST /api/auth/login { email, password } → { user, tokens }
- POST /api/auth/refresh { refreshToken } → { accessToken }
- GET /api/auth/me (auth) → { user }

Companies/Profiles:
- GET /api/company (auth) → { company }
- PATCH /api/company (auth, admin) → { company }
- GET /api/profile (auth) → { profile }
- PATCH /api/profile (auth) → { profile }

Products/Variants:
- GET /api/products → Product[] (public)
- GET /api/products/:id → Product
- POST /api/products (admin) → Product
- PATCH /api/products/:id (admin) → Product
- GET /api/products/:id/variants → ProductVariant[]
- POST /api/products/:id/variants (admin) → ProductVariant
- PATCH /api/variants/:id (admin) → ProductVariant

Orders:
- GET /api/orders?status=&limit=&offset= (auth, company-scoped) → Order[]
- GET /api/orders/:id (auth, company-scoped) → Order
- POST /api/orders (auth) → Order (also create deposit/balance Payment docs)
- PATCH /api/orders/:id (auth, company-scoped) → Order
- POST /api/orders/:id/status { status, adminNotes? } (admin) → Order

Order Timeline:
- GET /api/orders/:id/timeline (auth) → OrderTimeline[]
- POST /api/orders/:id/timeline { eventType, description, eventData?, triggerSource? } (admin) → OrderTimeline

Production Updates:
- GET /api/orders/:id/production-updates (auth) → ProductionUpdate[]
- POST /api/orders/:id/production-updates (admin) → ProductionUpdate

Payments:
- GET /api/orders/:id/payments (auth) → Payment[]
- PATCH /api/payments/:id (admin) → Payment
- POST /api/payments/:id/mark-paid (admin) → Payment

Stripe (Supabase functions replacement):
- POST /api/payments/create-checkout { orderId, phase } → { url | sessionId }
- POST /api/payments/create-invoice { orderId } → { invoiceUrl }
- POST /api/webhooks/stripe (raw body, signature) → 200 (updates Payment + Order state)

Samples:
- GET /api/samples (auth) → Sample[]
- GET /api/samples/:id (auth) → Sample
- POST /api/samples (auth) → Sample
- PATCH /api/samples/:id (auth) → Sample

Designer Bookings:
- GET /api/bookings (auth) → DesignerBooking[]
- POST /api/bookings (auth) → DesignerBooking
- PATCH /api/bookings/:id (auth) → DesignerBooking

Files/Uploads (replace Supabase Storage):
- POST /api/files/upload (auth, multipart) → { fileUrl }
- GET /api/orders/:id/files (auth) → FileUpload[]
- GET /api/bookings/:id/files (auth) → FileUpload[]

Pricing Rules:
- GET /api/pricing (public) → PricingRule[]

Realtime (socket.io):
- Namespace: /realtime
- Rooms: order:<orderId>, production:<orderId>, payments:<orderId>
- Server emits:
  - order.updated, production.created, production.updated, payment.updated, timeline.created
- Client subscribes after auth using access token

---

### 7) Mapping Supabase → Express/Mongoose
- Supabase Tables/Views:
  - companies → Company collection
  - profiles → Profile collection
  - products → Product collection
  - product_variants → ProductVariant collection
  - orders → Order collection
  - payments → Payment collection
  - production_updates → ProductionUpdate collection
  - order_timeline → OrderTimeline collection
  - samples → Sample collection
  - designer_bookings → DesignerBooking collection
  - file_uploads → FileUpload collection
  - pricing_rules → PricingRule collection
  - addresses (if used) → Address collection (or embedded in Profile)
- Supabase Functions to replace:
  - supabase/functions/create-checkout → POST /api/payments/create-checkout
  - supabase/functions/create-invoice → POST /api/payments/create-invoice
  - supabase/functions/stripe-webhook → POST /api/webhooks/stripe
  - supabase/functions/send-email, send-order-emails → POST /api/emails/send (or background job)
- Supabase Realtime:
  - Replace with socket.io rooms based on resource IDs
- Supabase Storage:
  - Replace with S3 (signed uploads + public/private ACL) or local in dev

---

### 8) Auth and Authorization
- Replace Supabase Auth with JWT-based auth.
- Options:
  1) Full migration: create User collection; re-register users; send password reset invites.
  2) Transitional: keep Supabase Auth for a short period while moving data; not recommended if the goal is to remove Supabase entirely.
- Access control:
  - Company scoping middleware: ensure requests operate within requester’s companyId.
  - Roles: admin vs member.
  - Resource ownership checks on Orders, Samples, Files, Bookings.

---

### 9) Frontend Changes (high-level)
- Replace `src/integrations/supabase/client.ts` with an API client (axios/fetch) configured with base URL and access token handling.
- Replace `src/lib/services/orderService.ts` data access (supabase.from...) with REST calls to the new endpoints.
- Realtime subscriptions: swap Supabase channels for socket.io subscriptions.
- Env: replace VITE_SUPABASE_* with VITE_API_BASE_URL, VITE_SOCKET_URL.
- File uploads: use multipart form to /api/files/upload; consume returned URLs.

---

### 10) Data Migration Plan
1) Snapshot export from Supabase Postgres
- Use SQL to export JSON per table: companies, profiles, products (+variants), orders, payments, production_updates, order_timeline, samples, designer_bookings, file_uploads, pricing_rules, addresses.
- Preserve primary keys as externalId (UUID strings) to maintain cross-references.

2) Transformations
- products: base_price (DECIMAL) → basePrice (number)
- orders: total_price/total_amount to totalAmount, etc.
- payments: amount_cents → amountCents
- timestamps: TIMESTAMPTZ → ISO strings → Date objects
- foreign keys: map UUIDs to ObjectId via a shared map constructed during import

3) Import sequencing (respect FK → ObjectId mapping)
- companies → profiles → users (if any) → products → productVariants → orders → payments → productionUpdates → orderTimeline → samples → designerBookings → fileUploads → pricingRules

4) Scripts
- server/src/migration/import-mongo.ts
  - Reads exported JSON files
  - Creates mapping tables: uuidToObjectId per collection
  - Inserts documents in sequence; updates references post-insert

5) Validation and Reconciliation
- Cross-counts per table
- Spot-check orders with payments and timeline entries
- Generate audit report (IDs mapped, missing refs)

6) Cutover
- Freeze writes on Supabase
- Final delta export and import
- Update DNS/clients to point to new API

---

### 11) Endpoint Parity with Current Usage
Based on current frontend usage (`src/lib/services/orderService.ts`):
- Create Order → POST /api/orders
- Initialize Payments (deposit + balance) → handled server-side on order creation
- Get Order → GET /api/orders/:id
- List Orders with filters → GET /api/orders?status=&userId=&limit=&offset=
- Get User Orders → GET /api/orders?userId=me
- Update Order → PATCH /api/orders/:id
- Get Payments → GET /api/orders/:id/payments
- Update Payment → PATCH /api/payments/:id
- Create Production Update → POST /api/orders/:id/production-updates
- Get Production Updates → GET /api/orders/:id/production-updates
- Get Timeline → GET /api/orders/:id/timeline
- Create Timeline Event → POST /api/orders/:id/timeline
- Realtime subscriptions → socket.io rooms order:<id>, production:<id>, payments:<id>

---

### 12) Error Handling and Validation
- Use zod schemas per endpoint for request validation
- Central error handler converts domain errors → HTTP responses
- Include error codes for frontend handling (e.g., ORDER_NOT_FOUND, PAYMENT_INVALID_PHASE)

---

### 13) Security Hardening
- helmet, cors (origins), rate-limit
- JWT in Authorization: Bearer, short TTL for access token + refresh flow
- Input sanitation, payload size limits
- Stripe webhook: raw body parser + signature verification
- S3: presigned URLs, private bucket for sensitive files

---

### 14) Dev, Testing, and CI/CD
- Local dev: docker-compose (mongo, mailhog, minio optional)
- Testing: jest/supertest for controllers; seed data factories
- CI: lint, typecheck, unit + integration tests; ephemeral Mongo service
- CD: build docker image; deploy (Render/Heroku/Fly.io/K8s)

---

### 15) Timeline & Milestones
- Week 1: Backend scaffolding, core models (User, Company, Product, Order, Payment) + auth
- Week 2: Orders/Payments endpoints, Stripe integration, Products/Variants
- Week 3: Production/TImeline, Samples, Bookings, Files (S3)
- Week 4: Data migration dry-run; frontend integration; realtime
- Week 5: Final migration, freeze, cutover, monitoring

---

### 16) File Checklist to Create
- server/src/app.ts, server/src/server.ts, server/src/config/{env.ts,db.ts}
- server/src/middleware/{auth.ts,error.ts,validate.ts,rateLimit.ts}
- server/src/models/{Company.ts,Profile.ts,Product.ts,ProductVariant.ts,Order.ts,Payment.ts,ProductionUpdate.ts,OrderTimeline.ts,Sample.ts,DesignerBooking.ts,FileUpload.ts,PricingRule.ts,Address.ts,User.ts}
- server/src/controllers/{authController.ts,companyController.ts,profileController.ts,productController.ts,orderController.ts,paymentController.ts,productionController.ts,timelineController.ts,sampleController.ts,bookingController.ts,fileController.ts,pricingController.ts,emailController.ts,stripeWebhookController.ts}
- server/src/routes/{authRoutes.ts,companyRoutes.ts,profileRoutes.ts,productRoutes.ts,orderRoutes.ts,paymentRoutes.ts,productionRoutes.ts,timelineRoutes.ts,sampleRoutes.ts,bookingRoutes.ts,fileRoutes.ts,pricingRoutes.ts,emailRoutes.ts,webhookRoutes.ts,index.ts}
- server/src/services/{authService.ts,productService.ts,orderService.ts,paymentService.ts,emailService.ts,fileService.ts,pricingService.ts,realtimeService.ts}
- server/src/utils/{crypto.ts,jwt.ts,s3.ts,pagination.ts,roles.ts,errors.ts}
- server/src/migration/{import-mongo.ts,transformers/*.ts}
- server/.env.example, server/tsconfig.json, server/package.json, server/Dockerfile

---

### 17) Open Questions / Decisions
- Auth migration: Will users re-register or do we attempt invite-based password reset? (Recommend re-invite)
- Storage provider: S3 vs GCS vs Cloudflare R2 (Recommend S3-compatible)
- Realtime transport: socket.io vs SSE (Recommend socket.io)
- Email provider: SMTP vs API-based (Recommend provider API in prod)

---

### 18) Rollback Plan
- Keep Supabase in read-only standby for 2 weeks
- Feature-flag new API in frontend; quick toggle back to Supabase endpoints
- Backup Mongo before cutover; snapshot for restore

---

### 19) Success Criteria
- Endpoint parity achieved; frontend works without code paths referencing Supabase
- All critical data migrated with referential integrity preserved
- Payments and webhooks operate reliably; orders update correctly
- Realtime updates delivered for order, production, payments