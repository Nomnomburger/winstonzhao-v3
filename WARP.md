# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is the third version of Winston's portfolio website built with Next.js 15, TypeScript, and Tailwind CSS.

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Linting**: ESLint with Next.js config
- **Build Tool**: Turbopack (enabled by default)

## Common Development Commands

```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linter
npm run lint

# Install dependencies
npm install
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx    # Root layout component
│   ├── page.tsx      # Home page
│   ├── globals.css   # Global styles with Tailwind
│   └── favicon.ico   # Site favicon
public/              # Static assets
```

## Architecture Notes

- **App Router**: Uses Next.js 15's App Router for file-based routing
- **Server Components**: Default to React Server Components for better performance
- **TypeScript**: Fully typed with strict TypeScript configuration
- **Import Alias**: `@/*` maps to `src/*` for cleaner imports
- **Styling**: Tailwind CSS v4 with PostCSS configuration

## Development Workflow

1. **Development**: Run `npm run dev` to start the dev server with hot reload
2. **Building**: Use `npm run build` to create production build
3. **Linting**: Run `npm run lint` to check code quality
4. **Deployment**: Optimized for Vercel deployment (Next.js creator)

## Git Workflow

- Main branch: `main`
- Status: Next.js project initialized with TypeScript and Tailwind CSS
