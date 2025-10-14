# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js application for generating fiscal receipts using HTML canvas rendering. The app allows users to create receipt images that can be downloaded as PNG files. The target thermal printer has a printing resolution width of 384px.

## Development Commands

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production application with Turbopack  
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Architecture

The application follows Next.js 15 App Router structure:

- **Main Route**: `src/app/page.tsx` - Contains the primary interface with a form for customizing receipts and live preview
- **Components**: `src/components/` - Reusable React components
  - `ReceiptRenderer.tsx` - Core canvas-based receipt rendering component with download functionality
- **Styling**: Uses Tailwind CSS v4 with custom CSS variables for theming
- **TypeScript**: Configured with strict mode and path aliases (`@/*` maps to `./src/*`)

## Key Technologies

- Next.js 15 with App Router
- React 19
- TypeScript with strict configuration
- Tailwind CSS v4
- HTML Canvas API for receipt rendering
- Geist font family (sans and mono variants)

## Receipt System Architecture

### Form-Based Interface
The main route features:
- Interactive form for customizing receipt data with default values
- Live preview that updates as form fields change
- Form fields include store information, items, pricing, and payment details

### Receipt Rendering System
The `ReceiptRenderer` component handles:
- Canvas-based receipt image generation with 384px width (thermal printer resolution)
- Real-time rendering triggered by form state changes
- Proper typography and layout for thermal receipt format
- PNG download functionality
- Dynamic height calculation based on receipt content

Receipt data follows a structured interface with store information, itemized purchases, VAT calculations, and payment details.

## VAT System Architecture

### VAT Types
The application supports four distinct VAT types following fiscal printer standards:

- **VAT Type A (18%)**: Standard rate VAT for most goods and services
- **VAT Type B (5%)**: Reduced rate VAT for specific categories
- **VAT Type V (0%)**: VAT-exempt transactions 
- **VAT Type G (0%)**: Zero-rated goods and services

### VAT Calculation Logic
VAT calculations work backward from tax-inclusive totals:

**For VAT Type A (18%):**
```typescript
const vatTypeA = total - (total / 1.18);
```

**Key Features:**
- **Tax-inclusive pricing**: Item totals include VAT amounts
- **Backward calculation**: VAT extracted from inclusive totals rather than added
- **Multi-VAT support**: Each transaction can contain multiple VAT types
- **Dynamic display**: Only VAT types with amounts > $0.00 appear on receipts
- **Precision handling**: All calculations rounded to 2 decimal places

### Interface Structure
```typescript
interface ReceiptData {
  // Store information
  receiptType: string;
  storeName: string;
  address: string;
  taxNumber: string;
  vatNumber: string;
  
  // Transaction data
  items: ReceiptItem[];
  vatTypeA: number;  // 18% VAT amount in dollars
  vatTypeB: number;  // 5% VAT amount in dollars
  vatTypeV: number;  // 0% VAT amount in dollars
  vatTypeG: number;  // 0% VAT amount in dollars
  total: number;     // Tax-inclusive total
  
  // Receipt metadata
  paymentMethod: string;
  receiptNumber: string;
  date: string;
}
```

### Form Integration
The `ReceiptForm` component:
- Automatically recalculates VAT when item totals change
- Displays all four VAT types in the totals summary
- Updates VAT Type A based on current 18% rate
- Maintains other VAT types as set values

### Receipt Display
The `ReceiptRenderer` component:
- Shows only VAT types with values > 0
- Formats VAT amounts as "VAT A: $X.XX"
- Positions VAT information between items and total
- Maintains proper fiscal receipt formatting

## Important Notes

- Canvas width is fixed at 384px to match thermal printer resolution
- Uses `'use client'` directive for canvas components due to client-side rendering requirements
- Form state drives live preview updates
- Download functionality uses HTML5 canvas `toDataURL()` method
- VAT calculations assume tax-inclusive pricing model
- Project intended for fair use only (as noted in README)