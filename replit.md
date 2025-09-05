# AJAI

## Overview

This is a comprehensive AI-powered trading platform that combines real-time market data analysis, AI-driven signal generation, and automated trading capabilities. The platform monitors news feeds, analyzes market patterns, integrates with OpenAI API for intelligent decision-making, and provides predictive analytics for trading decisions. Built as a full-stack web application with modern technologies and real-time capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript for type safety and modern development
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design system
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Updates**: WebSocket connection for live market data and trading signals
- **Charts**: Chart.js for market data visualization and portfolio performance tracking
- **Build System**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for full-stack type safety
- **API Design**: RESTful API with structured error handling and logging middleware
- **Real-time Communication**: WebSocket server for broadcasting live updates to connected clients
- **AI Integration**: OpenAI API integration for market analysis and trading signal generation
- **Scheduled Tasks**: Node-cron for periodic market data collection and analysis
- **Session Management**: Session-based authentication with secure cookie handling

### Database Layer
- **Primary Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Cloud Provider**: Neon Database for serverless PostgreSQL hosting
- **Schema Management**: Drizzle Kit for database migrations and schema evolution
- **Data Models**: Structured tables for users, portfolios, positions, trading signals, news articles, market data, and risk metrics
- **Time-series Data**: Optimized for storing and querying historical market data and trading performance

### Data Storage Strategy
- **In-memory Storage**: Custom storage abstraction layer supporting both in-memory (development) and PostgreSQL (production)
- **Caching**: Redis integration ready for high-frequency market data caching
- **Session Storage**: PostgreSQL-based session storage with connect-pg-simple

### External Integrations
- **AI Services**: OpenAI API for market analysis, sentiment analysis, and trading signal generation
- **Market Data**: Integration ready for Binance API, Alpha Vantage, and other market data providers
- **News Sources**: NewsAPI and Reddit API integration for real-time news monitoring and sentiment analysis
- **Trading Execution**: Prepared for broker API integrations for automated trade execution

### Security Architecture
- **Authentication**: JWT-based authentication with secure token handling
- **Environment Variables**: Secure configuration management for API keys and database credentials
- **CORS**: Configured for secure cross-origin requests
- **Input Validation**: Zod schema validation for all API endpoints and data models

### Development & Deployment
- **Development Environment**: Hot-reload development server with Vite and Express
- **Build Process**: Optimized production builds with code splitting and asset optimization
- **TypeScript**: Full-stack TypeScript with shared types between frontend and backend
- **Code Quality**: ESLint and TypeScript strict mode for code quality enforcement
- **Asset Management**: Vite-based asset optimization and bundling

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity for serverless environments
- **drizzle-orm & drizzle-kit**: Type-safe ORM and migration toolkit for database operations
- **openai**: Official OpenAI API client for AI-powered market analysis
- **ws**: WebSocket server implementation for real-time communication
- **express**: Web application framework for REST API development
- **@tanstack/react-query**: Server state management and caching for React frontend

### UI Framework
- **@radix-ui/***: Comprehensive set of accessible UI primitives for component development
- **tailwindcss**: Utility-first CSS framework for responsive design
- **chart.js**: Canvas-based charting library for market data visualization
- **lucide-react**: Icon library for consistent iconography

### Development Tools
- **vite**: Fast build tool and development server with HMR support
- **typescript**: Static type checking for enhanced developer experience
- **@replit/vite-plugin-***: Replit-specific development tools and error handling

### Authentication & Session Management
- **connect-pg-simple**: PostgreSQL session store for Express sessions
- **bcrypt**: Password hashing for secure user authentication (planned)
- **jsonwebtoken**: JWT token generation and validation (planned)

### Utilities
- **date-fns**: Modern date utility library for time-based calculations
- **zod**: Schema validation library for runtime type checking
- **nanoid**: URL-safe unique string ID generator
- **clsx & tailwind-merge**: Utility functions for conditional CSS class management

### Planned Integrations
- **Redis**: High-performance caching for market data
- **RabbitMQ/Apache Kafka**: Message queuing for market data processing
- **TimescaleDB**: Time-series database extension for PostgreSQL
- **Trading APIs**: Binance, Alpha Vantage, IEX Cloud for market data and trade execution