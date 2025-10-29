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
  - `ReceiptForm.tsx` - Interactive form component for customizing receipt data
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

Receipt data follows a structured interface with the type od receipt, store information tax information and item information.
The data is structured to mimic a Macedonain fiscal receipt:
- ФИСКАЛНА СМЕТКА
- #0123
- Legal company name
- Store info
- Tax number: 1234567890123
- VAT number: МК1234567890123
- item  {right aligned- 1 x 50,00}
- item  {right aligned-   50,00 Г} // where Г is the Macedonian Cyrillic VAT type (А, Б, В, Г)
- SPACER // the spacer consists of dashes
- ПРОМЕТ ОД МАКЕДОНСКИ ПР. {right aligned-   50,00}

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
  vatTypeA: number;  // 18% VAT rate percentage
  vatTypeB: number;  // 5% VAT rate percentage
  vatTypeV: number;  // 0% VAT rate percentage
  vatTypeG: number;  // 0% VAT rate percentage
  total: number;     // Tax-inclusive total

  // Receipt metadata
  paymentMethod: string;
  receiptNumber: string;
  date: string;      // Date in DD-MM-YYYY format
  dateTextFlag: boolean;  // Show/hide "ДАТУМ" label before date
  time: string;      // Time in HH:MM:SS format

  // Data matrix barcode
  datamatrixCode: string;  // Content for data matrix barcode
  datamatrixSize: number;  // Display size in pixels

  // Fiscal logo
  fiscalLogoSize: number;  // Logo width in pixels

  // Typography settings
  headerFontSize: number;     // Header font size in pixels
  headerFontSpacing: number;  // Header line spacing in pixels
  bodyFontSize: number;       // Body font size in pixels
  bodyFontSpacing: number;    // Body line spacing in pixels
  fontFamily: string;         // Font family for receipt text
}
```

### Form Integration
The `ReceiptForm` component provides comprehensive controls for:
- **Store Information**: Company name, address, tax numbers, receipt number
- **Payment Details**: Payment method selection (cash, credit, debit, mobile)
- **Date & Time Controls**:
  - Date field with DD-MM-YYYY format
  - Time field with HH:MM:SS format
  - Toggle for "ДАТУМ" label visibility
- **Item Management**:
  - Add/remove items dynamically
  - Set quantity, price, VAT type (А/Б/В/Г)
  - Mark items as domestic products
  - Automatic total calculation
- **VAT Display**: Shows all four VAT types in the totals summary
- **Data Matrix Barcode**: Text input and size control (50-300px slider)
- **Fiscal Logo**: Size control (50-384px slider)
- **Typography Controls**:
  - Header font size (10-50px) and line spacing (5-50px)
  - Body font size (10-50px) and line spacing (5-50px)
  - Font family selection (Courier New, Monospace, Arial, Times New Roman, Consolas, Monaco, Lucida Console)

### Receipt Display
The `ReceiptRenderer` component:
- **Canvas Rendering**: Uses HTML5 Canvas API to generate receipt image at 384px width
- **Dynamic Height**: Automatically calculates canvas height based on content
- **Receipt Elements**:
  - Header with receipt type and number in bold, using selected font family
  - Store information and tax numbers
  - Itemized list with quantities, prices, and VAT type indicators (А/Б/В/Г)
  - Domestic products VAT breakdown (ПРОМЕТ ОД МАКЕДОНСКИ ПР.)
  - Total VAT calculations for all types
  - Grand total (ВКУПЕН ПРОМЕТ)
  - Payment method and amount
  - 2x2 Data matrix barcode with visual cross overlay (scannable)
  - Date and time display with optional "ДАТУМ" label
  - Fiscal verification logo
  - Verification codes
- **Formatting**:
  - Customizable font family applied to all text elements
  - Macedonian Cyrillic characters for labels
  - Right-aligned prices with comma decimal separator
  - Dash separators between sections
- **Live Preview**: Updates in real-time as form data changes
- **Download**: PNG export functionality with filename based on receipt number
- **Scrollable**: Preview container scrolls to view full receipt on long receipts

## Internationalization

The application supports multiple languages using `next-intl`:
- **Supported Locales**: English (en), Macedonian (mk)
- **Default Locale**: English
- **Language Switcher**: Component in top-right corner for easy locale switching
- **Middleware**: Handles locale routing at `/[locale]/` paths
- **Translation Files**: Located in `messages/` directory (en.json, mk.json)

## Utility Functions

### VAT Calculations (`src/utils/VATCalc.ts`)
- `calculateVAT(data, vatType)`: Calculates total VAT amount for a specific VAT type across all items
- `calculateDomesticVAT(data, vatType)`: Calculates VAT amount for domestic products only
- Both functions return tax-inclusive amounts rounded to 2 decimal places

### Styling Utilities (`src/lib/utils.ts`)
- `cn()`: Utility for merging Tailwind CSS classes using clsx and tailwind-merge

## Important Notes

- Canvas width is fixed at 384px to match thermal printer resolution
- Canvas height dynamically adjusts based on receipt content
- Uses `'use client'` directive for canvas and form components (client-side rendering)
- Form state drives live preview updates in real-time
- Download functionality uses HTML5 canvas `toDataURL()` method
- VAT calculations assume tax-inclusive pricing model
- Date format: DD-MM-YYYY (using dash separators)
- Time format: HH:MM:SS (24-hour format)
- Decimal separator: Comma (,) for currency display on receipts
- Receipt preview is scrollable when content exceeds viewport height
- Data matrix barcode uses `bwip-js` library for generation
- Fiscal logo aspect ratio: 2120:981 (original image dimensions)
- **Font Customization**: Users can select from 7 different font families (Courier New, Monospace, Arial, Times New Roman, Consolas, Monaco, Lucida Console). The selected font applies to all text on the receipt including headers and body text. Default is Courier New.
- Project intended for fair use only (as noted in README)