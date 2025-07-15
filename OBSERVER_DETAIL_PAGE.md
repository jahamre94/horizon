# Observer Detail Page

This document describes the new observer detail page feature added to the CosmosWatcher Horizon frontend.

## Routes Added

### `/home/[id]` - Observer Detail Page

Displays detailed historical metrics for a single observer with interactive charts.

## Files Created

1. **`src/routes/(app)/home/[id]/+page.js`** - Page loader
   - Fetches observer details from `/api/observer/:id`
   - Fetches 24-hour metric history from `/api/observer/:id/history?hours=24`
   - Handles 404 errors for missing observers

2. **`src/routes/(app)/home/[id]/+page.svelte`** - Main page component
   - Displays observer metadata (name, type, ID, uptime, last seen, tags)
   - Shows interactive charts for each metric type
   - Includes time range selector (6h, 12h, 24h, 3d, 1w)
   - Responsive design with mobile-friendly layout

3. **`src/lib/MetricChart.svelte`** - Reusable chart component
   - Built with Chart.js for time-series visualization
   - Supports different colors and units per metric
   - Handles empty data states gracefully

4. **`src/lib/chart-adapter.d.ts`** - Type declaration for Chart.js adapter

## Features

### Observer Information Card
- **Name and Type**: Display observer name and type badge
- **ID**: Shortened observer ID for easy identification
- **Status**: Color-coded status indicator based on last seen time
- **Uptime**: Formatted uptime display (HH:MM:SS)
- **Tags**: Visual tag display with key=value pairs

### Interactive Charts
- **Time Range Selector**: Choose from 6h, 12h, 24h, 3d, 1w
- **Metric Types Supported**:
  - CPU Usage (%)
  - Memory Used/Free (MB)
  - Disk Usage (%)
  - Network Sent/Received (Bytes)
  - Temperature (°C)
- **Empty State**: Shows helpful message when no data available

### Navigation
- **Breadcrumb Navigation**: Easy navigation back to home
- **Home Page Integration**: Added "View Details" buttons to observer cards

## API Endpoints Expected

The page expects these backend endpoints:

```typescript
// Get observer details with latest metrics
GET /api/observer/:id
Response: ObserverWithMetrics

// Get historical metrics for specified time range
GET /api/observer/:id/history?hours=24
Response: Record<string, MetricSnapshot[]>
```

## Type Definitions

```typescript
interface ObserverWithMetrics {
  id: string;
  name: string;
  type: string;
  tags: Record<string, any>;
  last_seen: string; // ISO timestamp
  last_uptime_seconds: number;
  metrics: Record<string, MetricSnapshot>;
}

interface MetricSnapshot {
  time: string;
  value: number;
  metric_name: string;
  labels?: Record<string, any>;
}
```

## Dependencies Added

- `chart.js`: Interactive charts library
- `chartjs-adapter-date-fns`: Date adapter for time-based charts

## Usage

1. Navigate to the home page (`/home`)
2. Click "View Details" on any observer card
3. View detailed metrics and historical data
4. Use the time range selector to adjust the view period
5. Use the refresh button to update data

## Error Handling

- **404 Error**: Displayed when observer is not found
- **Network Errors**: Graceful error messages for API failures
- **Empty Data**: Helpful empty states when no metrics available
- **Loading States**: Spinner indicators during data fetching

## Responsive Design

- **Desktop**: 2-column chart layout
- **Mobile**: Single-column layout with compact cards
- **Tablet**: Responsive grid that adapts to screen size
