# FactNews

A news aggregation and AI-powered consensus platform that analyzes multiple news sources to find common ground and divergent perspectives.

## Features

- **Search** - Query across indexed news articles with AI-powered consensus analysis
- **Sources** - Browse and filter news from 20+ major outlets (BBC, CNN, Reuters, NYT, etc.)
- **Feed** - Real-time news feed with categorized articles
- **ConsentAI Arena** - Compare responses from multiple AI models side-by-side
- **Bookmarks** - Save and organize consensus reports
- **History** - Track your search history
- **Trending** - Discover trending topics

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand
- **Icons**: Lucide React

## Getting Started

Install dependencies:

```bash
npm install
```

Create a `.env.local` file with your API endpoint:

```
NEXT_PUBLIC_API_URL=your_api_url
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
├── app/              # Next.js app router pages
│   ├── arena/        # AI model comparison arena
│   ├── bookmarks/    # Saved reports
│   ├── feed/         # News feed
│   ├── history/      # Search history
│   ├── search/       # Main search interface
│   ├── sources/      # News sources browser
│   └── trending/     # Trending topics
├── components/       # React components
├── hooks/           # Custom React hooks
├── lib/             # Utilities, types, API client
└── stores/          # Zustand state stores
```
