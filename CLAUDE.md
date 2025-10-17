# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Node.js/Express backend API for a restaurant management system with features for order management, inventory tracking, purchasing, staff management, and customer operations. The system uses MongoDB with Mongoose ODM and implements role-based access control.

## Commands

### Development
- `npm start` - Start the server (runs on port from .env PORT or default 5000)
- Node.js version required: `>=20.0.0`

### Database
- MongoDB connection string is in `.env` as `DATABASEONLINE`
- No migrations needed - Mongoose handles schema validation

## Architecture

### Project Structure
```
├── DataBase/
│   ├── connection.js           # MongoDB connection setup
│   └── models/                 # Mongoose schemas
├── src/
│   ├── Routes/                 # Express route definitions
│   ├── controllers/            # Business logic handlers
│   ├── middleware/
│   │   ├── auth/              # JWT auth and role-based access
│   │   └── validation/        # Joi schema validation
│   ├── services/              # File upload, cloudinary, utilities
│   └── utilities/             # Error handling, async wrappers
└── index.js                   # App entry point with route registration
```

### Key Patterns

**Authentication & Authorization:**
- JWT tokens passed via `req.headers.token`
- Auth middleware: `auth(["role1", "role2"])` validates token and checks user role
- Role middleware: `checkRole(["role1"])` provides additional permission checks
- User roles: `admin`, `staff`, `customer`, `operation`, `waiter`
- Secret key stored in `.env` as `SECRETEKEY`

**Validation:**
- All route handlers use Joi schemas from `src/middleware/validation/schema.js`
- Validation middleware: `validate(schemaName)` returns 400 on validation errors
- Schemas validate `req.body` with `abortEarly: false` to return all errors

**Error Handling:**
- Custom `AppError` class in `src/utilities/AppError.js` for consistent error responses
- `handlerAsync` wrapper catches async errors and passes to Express error handler
- Global error handler in `index.js:57-64` returns JSON with status, message, and stack (dev only)

**Database Models:**
- All models use Mongoose schemas with timestamps
- Reference fields use `mongoose.Schema.Types.ObjectId` with `ref` to related models
- Common patterns: populate on queries, pre/post hooks for business logic

### Domain Models

**Orders** (`order.mdoel.js`):
- Core entity linking customers, products, tables, and payments
- Status flow: `pending` → `preparing` → `ready` → `completed` → `checkout`
- Inner item status tracked separately for kitchen workflow
- Supports dine-in, takeaway, and delivery order types
- Payment methods: cash, visa, hybrid (split payment)
- UTP (Units per Person) metric calculated: total quantity / guest count
- Order merging supported via `MergeOrder` endpoint for combining table orders

**Inventory** (`inventory.model.js`):
- Tracks stock with FIFO cost accounting via StockBatch model
- Status: `in-stock`, `low-stock` (≤5 units), `out-of-stock`
- Fields: `quantity`, `averagePrice`, `totalValue`
- Updated automatically during purchase creation

**Purchases** (`purchase.model.js`):
- Links suppliers to inventory items
- Payment status: `paid`, `partial`, `unpaid`
- Invoice numbers generated with nanoid (7 digits)
- Uses MongoDB transactions for atomic inventory updates
- Cannot be updated after `exported: true`

**Products:**
- Belong to category and subcategory
- Assigned to specific kitchens for preparation routing
- Support extras (add-ons with prices) and customizations
- Linked to user wishlists via `is_favourite` virtual field

**Users:**
- Roles determine API access and features
- Staff have shift times, salaries, and section assignments
- Permissions array for granular access control
- Customers have wishlists and order history

### API Conventions

**Route Structure:**
- All routes prefixed with `/api/v1/`
- Resource-based naming: `/api/v1/order`, `/api/v1/product`, etc.
- Authentication required on most endpoints except public stats

**Query Parameters:**
- Pagination: `?page=1&limit=10`
- Search: `?search=query` (regex-based, case-insensitive)
- Filters: `?filter=status` or `?from=1` (delivery) / `?from=2` (dine-in)

**Response Format:**
```json
{
  "message": "descriptive success message",
  "data": {},
  "pagination": { "total": 100, "page": 1, "limit": 10, "totalPages": 10 }
}
```

**Error Format:**
```json
{
  "success": false,
  "status": "error",
  "message": "error description",
  "stack": "..." // only in development
}
```

### Important Business Logic

**Order Creation Flow:**
1. Validate order type and required fields (location for delivery, table for dine-in)
2. Calculate total price from product prices + extras
3. Generate 6-digit order number with nanoid
4. Set table status to "Occupied" if dine-in
5. Calculate UTP metric if guestCount provided
6. Create order with customer from JWT token

**Checkout Process:**
1. Verify order is `completed` status and not already checked out or cancelled
2. Validate payment amounts match total price (exact for cash/visa, sum for hybrid)
3. Require visa number for visa/hybrid payments
4. Update order with payment details and set status to `checkout`
5. Free table by setting status to "Available"

**Purchase/Inventory Integration:**
- Uses MongoDB transactions for atomicity
- Creates StockBatch records for FIFO tracking
- Updates inventory quantity, totalValue, and averagePrice
- Auto-updates inventory status based on quantity thresholds
- Supplier must be "active" status to create purchases

**Kitchen Order Display:**
- Filters orders by kitchen assignment on products
- Shows today and yesterday orders only
- Excludes cancelled orders
- Populates both regular products and custom products with ingredient details

### Date/Time Handling

- All date operations use Africa/Cairo timezone for Egyptian local time
- Weekly stats start from Monday
- Revenue aggregations group by Egypt timezone date parts
- Use `getEgyptDate()` helper in order controller for consistent timezone handling

## Common Pitfalls

1. **File Note:** The order model file is named `order.mdoel.js` (typo in "model")
2. **Payment Validation:** Checkout requires exact amount matching for cash/visa modes
3. **Table Status:** Always free tables on checkout/cancel to prevent blocking
4. **Transaction Safety:** Purchase operations must use sessions for rollback capability
5. **Populate Depth:** Kitchen orders require nested populates for custom products → ingredients
6. **Status Dependencies:** Order items have separate `innerStatus` - overall order status auto-updates based on all items
7. **Token Header:** Auth token sent as `req.headers.token`, not `Authorization: Bearer`
8. **Waiter Filtering:** Waiters only see their own orders (customer field filtered by user ID)
