# UX Design Decisions

## Design Principles

1. **Mobile-first**: 80%+ of target users are on mobile
2. **Dark theme**: Professional, reduces eye strain, matches Stellar/Pollar branding
3. **Color coding**: Green (Nigeria) and Red (Bolivia) for visual corridor identity
4. **Minimal steps**: 3 clicks to create a corridor
5. **Transparent pricing**: Show exact fees, exchange rate, and receive amount

## Component Design

### Header
- Nigeria (green) ↔ Bolivia (red) with arrow
- Tagline: "Two parallel-FX economies meeting at a USDC midpoint"
- Non-custodial badge for trust

### Send Tab
- Large NGN input with minimum validation
- Phone number for Bolivian receiver
- Live quote preview: NGN → fee → BOB
- Confirmation screen before submission

### Track Tab
- Corridor cards with NG ↔ BO flags
- Progress bar: Created → Matched → NGN Paid → Settled
- Status badges with color coding
- Agent info when matched

### Agent Dashboard
- Stats: active agents, corridors today, total collateral
- Agent list with reputation color coding
- Activity feed with recent transactions

## Accessibility

- Semantic HTML (`<main>`, `<nav>`, `<button>`)
- Form labels for all inputs
- Error messages with `aria-live`
- Keyboard navigation (tab order)
- Color contrast: WCAG AA on dark background
- Focus indicators on interactive elements

## Responsive Behavior

- Mobile: single column, full-width cards
- Tablet: 2-column stats grid
- Desktop: max-width 4xl, centered

## Empty States

- Track tab: "No corridors yet" with icon
- Agent tab: Mock data for demo (replace with real data in production)

## Loading States

- Button spinner during corridor creation
- Pulse animation on progress bar for active step
- Skeleton loading for agent list (future)
