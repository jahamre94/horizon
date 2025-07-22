## CosmosWatcher System Overview

CosmosWatcher is a modular monitoring platform, composed of three main components:

- [Singularity](https://github.com/jahamre94/singularity)
- [**Horizon**](https://github.com/jahamre94/horizon) <span style="color: #2ecc40; font-weight: bold;">(current component)</span>
- [Observer](https://github.com/jahamre94/observer)

Learn more at [cosmoswatcher.com](https://cosmoswatcher.com/).

---

# Horizon

> **Horizon** is the CosmosWatcher web frontend for visualizing system metrics, observer status, and orchestrating actions across your infrastructure. Built with SvelteKit and Vite.

## Features

- Multi-tenant dashboard for all registered Observers
- Real-time and historical metrics: CPU, memory, disk, network, temperature
- Per-observer drilldown with time range selection
- Grouping and sorting by tenant, observer, and metric labels
- Secure authentication and role-based access
- Responsive, modern UI

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm, pnpm, or yarn

### Install dependencies

```bash
npm install
```

### Development server

```bash
npm run dev -- --open
```

### Build for production

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

> To deploy Horizon, you may need to install a [SvelteKit adapter](https://kit.svelte.dev/docs/adapters) for your target environment (e.g., Node, Vercel, Netlify).

## Project Structure

- `src/routes/` — SvelteKit routes and pages
- `src/lib/` — UI components, charts, API clients, stores
- `static/` — Static assets (icons, images)
- `build/` — Production build output
- `package.json` — Project metadata and scripts

## License

This project is licensed under the Business Source License 1.1 (BSL 1.1). See the LICENSE file for details. After 2029-01-01, the license will convert to Apache License 2.0.

## Contributing

Issues and pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## Links

- [CosmosWatcher System](https://cosmoswatcher.com/)
- [Singularity Backend](https://github.com/jahamre94/singularity)
- [Observer Agent](https://github.com/jahamre94/observer)
