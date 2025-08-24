# 🚀 Spin AI - Advanced Code Generation Platform

<div align="center">

![Spin AI Logo](./public/logo.png)

**Build from a single prompt** - Go from idea to live app in minutes using natural language.

[![Next.js](https://img.shields.io/badge/Next.js-13.5.1-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-61dafb?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3.3-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.18.0-47a248?style=flat-square&logo=mongodb)](https://www.mongodb.com/)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fspin&env=ANTHROPIC_API_KEY,MONGODB_URI&envDescription=API%20keys%20for%20AI%20generation%20and%20database&envLink=https%3A%2F%2Fconsole.anthropic.com%2Fsettings%2Fapi-keys&project-name=spin-ai&repository-name=spin-ai)

</div>

## 🌟 Overview

Spin AI is a revolutionary code generation platform that transforms natural language prompts into fully functional React applications. Built with cutting-edge AI technology and modern web frameworks, it provides developers with an unprecedented way to create, iterate, and deploy web applications through natural language conversations.

### ✨ Core Features

- 🤖 **AI-Powered Code Generation** - Transform ideas into production-ready React apps using Anthropic's Claude AI
- 🔄 **Real-time Streaming** - Watch your code generate live with beautiful typewriter animations
- 🛠️ **Interactive Workspace** - Full-featured IDE with live preview, file management, and testing
- 🎨 **Modern UI/UX** - Beautiful dark/light themes with animated gradient backgrounds
- 🔗 **Blockchain Integration** - Seamless Phantom wallet connectivity for Web3 applications
- 📁 **Advanced File Management** - Upload context files, export projects, version control
- 💬 **Conversational Development** - Iterate and improve code through natural language chat
- 📱 **Responsive Design** - Perfect experience across desktop, tablet, and mobile devices
- 🔒 **Secure Architecture** - MongoDB persistence, error handling, and user session management

## 🏗️ System Architecture

```mermaid
graph TD
    A[User Interface] --> B[Next.js Frontend]
    B --> C[Anthropic Claude API]
    B --> D[MongoDB Database]
    B --> E[Phantom Wallet]
    
    C --> F[Code Generation Engine]
    F --> G[Streaming Response Handler]
    G --> H[Real-time UI Display]
    
    D --> I[User Sessions]
    D --> J[Project History]
    D --> K[Generated Files Storage]
    
    E --> L[Solana Blockchain]
    L --> M[Web3 Integration]
    
    H --> N[SandPack Preview]
    N --> O[Live Code Execution]
```

## 🚀 Quick Start Guide

### Prerequisites

- Node.js 18.x or higher
- MongoDB database (local or cloud)
- Anthropic API key
- Phantom Wallet (for blockchain features)

### Installation

1. **Clone and Setup**
   ```bash
   git clone https://github.com/yourusername/spin-ai.git
   cd spin-ai
   npm install
   ```

2. **Environment Configuration**
   Create `.env.local` with required variables:
   ```env
   # Required
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   MONGODB_URI=your_mongodb_connection_string
   
   # Optional
   NEXTAUTH_SECRET=your_secure_random_string
   NODE_ENV=development
   ```

3. **Launch Development Server**
   ```bash
   npm run dev
   ```

4. **Access Application**
   Open [http://localhost:3000](http://localhost:3000)

## 🎯 Feature Deep Dive

### 1. 🧠 AI Code Generation System

**Natural Language Processing**
- Convert plain English descriptions into React applications
- Support for complex multi-component architectures
- Automatic dependency management and best practices integration

**Code Quality Assurance**
- TypeScript support with proper type definitions
- Modern React patterns (Hooks, Context API, Custom Hooks)
- Accessibility compliance (ARIA labels, keyboard navigation)
- Mobile-first responsive design implementation

**Template Library**
- Pre-built templates for common use cases
- Industry-specific application templates
- Component library integration

### 2. ⚡ Real-time Streaming Interface

**Live Generation Display**
- Character-by-character code streaming visualization
- File-by-file progress tracking with status indicators
- Interactive pause/resume functionality during generation
- Beautiful animations and visual feedback systems

**Error Handling & Recovery**
- Graceful error recovery with fallback generation
- Partial code recovery from incomplete responses
- User-friendly error messages with suggested actions

### 3. 🛠️ Interactive Development Workspace

**Advanced Code Editor**
- Monaco Editor integration with full IntelliSense
- Syntax highlighting for multiple languages
- Auto-completion and error detection
- Code folding and minimap navigation

**Live Preview System**
- Real-time application preview with hot reloading
- Mobile and desktop viewport simulation
- Console output and error logging
- Network request monitoring

**File Management**
- Intuitive file explorer with search functionality
- Drag-and-drop file organization
- Context menu operations (rename, delete, duplicate)
- File history and version tracking

### 4. 💬 Conversational Development Engine

**Iterative Code Improvement**
- Natural language modification requests
- Context-aware code updates maintaining project integrity
- Diff visualization showing exactly what changed
- Undo/redo functionality for all modifications

**Smart Context Management**
- Conversation history persistence across sessions
- Project-aware suggestions and improvements
- File relationship understanding for complex modifications

### 5. 🎨 Modern UI/UX Design

**Theme System**
- Dark and light mode with smooth transitions
- Animated gradient backgrounds with particle effects
- Consistent design language throughout the application
- Customizable accent colors and preferences

**Responsive Layout**
- Mobile-first design principles
- Adaptive layouts for all screen sizes
- Touch-friendly interface for mobile devices
- Progressive Web App (PWA) capabilities

### 6. 🔗 Blockchain & Web3 Integration

**Phantom Wallet Connectivity**
- Seamless wallet connection and session persistence
- Auto-reconnection on page refresh
- Secure transaction handling and user authentication
- Multi-wallet support preparation

**Solana Integration**
- Ready for token transactions and smart contract interactions
- NFT minting and trading capabilities foundation
- DeFi protocol integration preparation

## 📁 Detailed Project Structure

```
spin-ai/
├── 📁 app/                          # Next.js App Router
│   ├── 📁 api/                      # API Routes
│   │   └── 📁 anthropic/            # AI generation endpoints
│   │       └── route.ts             # Main AI API handler
│   ├── 📁 streaming/                # Real-time generation page
│   │   └── page.tsx                 # Streaming interface
│   ├── 📁 workspace/                # Development environment
│   │   └── page.tsx                 # Interactive workspace
│   ├── 📁 themecontext/            # Theme management
│   │   └── ThemeContext.tsx         # Theme provider and hooks
│   ├── 📁 walletcontext/           # Blockchain integration
│   │   └── WalletContext.tsx        # Wallet provider and hooks
│   ├── globals.css                  # Global styles and animations
│   ├── layout.tsx                   # Root layout with providers
│   ├── page.tsx                     # Homepage and prompt interface
│   └── providers.tsx                # Context providers wrapper
├── 📁 components/                   # Reusable React components
│   ├── 📁 ui/                       # Radix UI component library
│   │   ├── button.tsx               # Button variants
│   │   ├── card.tsx                 # Card layouts
│   │   ├── dialog.tsx               # Modal dialogs
│   │   ├── input.tsx                # Input fields
│   │   ├── textarea.tsx             # Text areas
│   │   └── ... (30+ UI components)
│   ├── StreamingCodeDisplay.tsx     # Real-time code display
│   └── ThemeToggle.tsx              # Theme switching component
├── 📁 hooks/                        # Custom React hooks
│   └── use-toast.ts                 # Toast notification system
├── 📁 lib/                          # Utility functions
│   └── utils.ts                     # Common utilities and helpers
├── 📁 public/                       # Static assets
│   └── logo.png                     # Application logo
├── 📁 types/                        # TypeScript type definitions
│   └── jsx.d.ts                     # JSX type extensions
├── components.json                  # shadcn/ui configuration
├── next.config.js                   # Next.js configuration
├── postcss.config.js               # PostCSS configuration
├── tailwind.config.ts              # Tailwind CSS configuration
├── tsconfig.json                    # TypeScript configuration
└── vercel.json                      # Vercel deployment config
```

## 🔌 API Reference

### POST `/api/anthropic` - Generate Code

Transform natural language prompts into React applications.

**Request Body:**
```typescript
{
  prompt?: string;                    // Natural language description
  existingFiles?: Record<string, string>;  // Current project files
  uploadedFiles?: UploadedFile[];     // Context files
  streaming?: boolean;                // Enable streaming response
  userId?: string;                    // User identifier
  conversationId?: string;            // Conversation context
  isIterativeUpdate?: boolean;        // Modification request
}
```

**Streaming Response Events:**
```typescript
// Status updates
{ type: "status", message: "Starting generation..." }

// Progress indicators
{ type: "progress", content: "Generated component structure" }

// File generation
{ 
  type: "file", 
  fileName: "/src/App.tsx", 
  content: "import React...",
  changeType: "new" | "updated" | "deleted"
}

// Generation complete
{ 
  type: "complete", 
  conversationId: "conv_123",
  fullFiles: Record<string, string>,
  changedFiles: FileChange[]
}

// Error handling
{ type: "error", error: "Error message" }
```

### GET `/api/anthropic` - Conversation History

Retrieve user's project history and conversations.

**Query Parameters:**
- `userId` (required): User identifier

**Response:**
```typescript
{
  conversations: Array<{
    _id: string;
    userId: string;
    prompt?: string;
    uploadedFiles: UploadedFile[];
    generatedFiles: Record<string, string>;
    timestamp: Date;
  }>
}
```

## 🛠️ Technology Stack

### Core Framework
- **Next.js 13.5.1** - React framework with App Router architecture
- **React 18.2.0** - Component library with concurrent features
- **TypeScript 5.2.2** - Static type checking and developer experience

### AI & Backend
- **Anthropic Claude API** - Advanced language model for code generation
- **MongoDB 6.18.0** - NoSQL database for data persistence  
- **Mongoose 8.17.0** - MongoDB object modeling for Node.js

### UI & Styling
- **Tailwind CSS 3.3.3** - Utility-first CSS framework
- **Radix UI Primitives** - Accessible, unstyled UI components
- **Lucide React** - Beautiful SVG icon library
- **Class Variance Authority** - Component variant management

### Development Tools
- **CodeSandbox Sandpack** - In-browser code editor and preview
- **JSZip** - Client-side file compression for exports
- **File-saver** - File download utilities
- **React Hook Form** - Performant form management

### Blockchain Integration
- **Phantom Wallet SDK** - Solana wallet connectivity
- **Web3.js** (Planned) - Blockchain interaction library

## 🎨 UI Component Library

The application features a comprehensive design system built on Radix UI primitives:

### Layout & Navigation
- **Accordion** - Collapsible content sections
- **Breadcrumb** - Navigation hierarchy
- **Navigation Menu** - Site navigation with dropdowns
- **Pagination** - Large dataset navigation
- **Tabs** - Content organization and switching

### Data Entry & Forms
- **Button** - Interactive elements with variants
- **Form** - Validated form components
- **Input** - Text input with validation
- **Textarea** - Multi-line text input
- **Select** - Dropdown selection components
- **Checkbox** - Boolean input controls
- **Radio Group** - Single selection from options
- **Switch** - Toggle controls
- **Slider** - Range input controls

### Feedback & Overlays  
- **Alert** - Important messages and notifications
- **Alert Dialog** - Critical action confirmations
- **Dialog** - Modal windows and overlays
- **Toast** - Temporary notification messages
- **Progress** - Loading and progress indicators
- **Skeleton** - Loading state placeholders

### Data Display
- **Avatar** - User profile images
- **Badge** - Status indicators and labels
- **Card** - Content containers with headers
- **Table** - Data tables with sorting
- **Chart** - Data visualization components
- **Calendar** - Date selection interface

## 🔒 Security & Best Practices

### API Security
- **Environment Variable Protection** - Secure credential management
- **Request Validation** - Input sanitization and validation
- **Rate Limiting** - API abuse prevention
- **Error Handling** - Secure error messages without information leakage

### Frontend Security
- **XSS Prevention** - Input sanitization and content security policies
- **CORS Configuration** - Proper cross-origin request handling
- **Authentication State** - Secure session management
- **Wallet Security** - Safe blockchain transaction handling

### Performance Optimization
- **Code Splitting** - Lazy loading for optimal bundle sizes
- **Image Optimization** - Next.js automatic image optimization
- **Caching Strategies** - Efficient data caching and invalidation
- **Bundle Analysis** - Regular performance monitoring

## 🚀 Deployment Guide

### Vercel (Recommended)

1. **Repository Setup**
   ```bash
   git remote add origin https://github.com/yourusername/spin-ai.git
   git push -u origin main
   ```

2. **Vercel Deployment**
   - Import project to Vercel dashboard
   - Configure environment variables
   - Enable automatic deployments

3. **Environment Variables**
   ```env
   ANTHROPIC_API_KEY=your_production_api_key
   MONGODB_URI=your_production_mongodb_uri
   NEXTAUTH_SECRET=your_secure_production_secret
   NODE_ENV=production
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Build application
FROM base AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
```

### Manual Server Deployment

```bash
# Build the application
npm run build

# Start production server
npm start

# Or use PM2 for process management
npm install -g pm2
pm2 start npm --name "spin-ai" -- start
pm2 save
pm2 startup
```

## 📊 Usage Analytics & Monitoring

### Built-in Metrics
- **Generation Success Rate** - AI response quality tracking
- **User Session Duration** - Engagement analytics
- **Feature Usage Statistics** - Popular functionality identification
- **Error Rate Monitoring** - System reliability tracking

### Integration Options
- **Google Analytics 4** - User behavior tracking
- **Sentry** - Error monitoring and performance tracking
- **LogRocket** - Session replay and debugging
- **Mixpanel** - Product analytics and user funnels

## 🤝 Contributing Guidelines

We welcome contributions from the community! Here's how to get involved:

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/spin-ai.git
   cd spin-ai
   npm install
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Development Standards**
   - Follow TypeScript best practices
   - Write comprehensive tests for new features
   - Maintain consistent code formatting (ESLint + Prettier)
   - Update documentation for new features

4. **Testing Requirements**
   ```bash
   npm run test          # Unit tests
   npm run test:e2e      # End-to-end tests
   npm run lint          # Code quality checks
   npm run type-check    # TypeScript validation
   ```

### Pull Request Process

1. **Quality Checklist**
   - [ ] All tests pass
   - [ ] Code follows style guidelines
   - [ ] Documentation updated
   - [ ] No console errors or warnings
   - [ ] Responsive design verified

2. **Review Process**
   - Code review by maintainers
   - Automated testing pipeline
   - Performance impact assessment
   - Security vulnerability scanning

## 📚 Examples & Tutorials

### Basic Code Generation

```typescript
// Simple component generation
const prompt = "Create a responsive card component with image, title, and description";

// Result: Complete React component with proper styling
import React from 'react';

interface CardProps {
  image: string;
  title: string;
  description: string;
}

export function Card({ image, title, description }: CardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <img src={image} alt={title} className="w-full h-48 object-cover" />
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
}
```

### Advanced Application Generation

```typescript
// Complex application with multiple features
const prompt = `
Create a task management application with:
- User authentication and profiles
- Task creation, editing, and deletion
- Priority levels and due dates
- Category filtering and search
- Dark mode support
- Local storage persistence
- Responsive mobile design
`;

// Results in complete application with:
// - Authentication context and components
// - Task management logic and state
// - UI components with proper accessibility
// - Responsive design and mobile optimization
// - Local storage integration
// - Type-safe TypeScript throughout
```

### Iterative Development

```typescript
// Initial generation
const initialPrompt = "Create a simple counter app";

// Follow-up improvements
const improvementPrompts = [
  "Add increment and decrement animations",
  "Include reset functionality with confirmation dialog", 
  "Add keyboard shortcuts for all operations",
  "Implement undo/redo for counter operations",
  "Add sound effects for button interactions"
];

// Each iteration builds upon previous version
// maintaining code quality and adding features seamlessly
```

## 🐛 Troubleshooting Guide

### Common Issues & Solutions

**🔴 API Connection Errors**
```bash
# Check environment variables
echo $ANTHROPIC_API_KEY

# Test API connectivity
curl -H "x-api-key: $ANTHROPIC_API_KEY" https://api.anthropic.com/v1/messages

# Restart development server
npm run dev
```

**🔴 MongoDB Connection Issues**
```bash
# Verify MongoDB URI format
# mongodb://localhost:27017/spinai (local)
# mongodb+srv://user:pass@cluster.mongodb.net/spinai (Atlas)

# Test connection
mongosh "your_mongodb_uri"
```

**🔴 Build Failures**
```bash
# Clear cache and dependencies
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

**🔴 Wallet Connection Problems**
- Ensure Phantom wallet extension is installed
- Check browser console for detailed error messages
- Verify wallet permissions in extension settings
- Try disconnecting and reconnecting wallet

**🔴 Streaming Issues**
- Check network connectivity and stability
- Verify Anthropic API key permissions
- Monitor browser console for WebSocket errors
- Clear browser cache and cookies

### Performance Optimization

**🚀 Slow Generation Times**
- Check Anthropic API rate limits and usage
- Optimize prompt complexity and length
- Implement request caching for similar prompts
- Monitor server response times

**🚀 UI Responsiveness**
- Enable React concurrent features
- Implement proper loading states
- Use virtualization for large file lists
- Optimize bundle size with code splitting

## 📄 License & Legal

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for complete details.

### Third-Party Acknowledgments

- **Anthropic** - Claude AI API for code generation
- **Next.js Team** - React framework and development tools
- **Vercel** - Hosting platform and deployment infrastructure
- **Radix UI** - Accessible component primitives
- **Tailwind CSS** - Utility-first CSS framework
- **CodeSandbox** - Sandpack in-browser development environment

## 📞 Support & Community

### Getting Help
- 🐛 **Bug Reports** - [GitHub Issues](https://github.com/yourusername/spin-ai/issues)
- 💬 **Discussions** - [GitHub Discussions](https://github.com/yourusername/spin-ai/discussions) 
- 📧 **Email Support** - support@spin-ai.com
- 💬 **Discord Community** - [Join our server](https://discord.gg/spin-ai)

### Community Resources
- 📖 **Documentation** - Comprehensive guides and API reference
- 🎥 **Video Tutorials** - Step-by-step usage examples
- 📱 **Social Media** - [@SpinAI](https://twitter.com/spinai) for updates
- 🗞️ **Newsletter** - Monthly feature updates and tips

---

<div align="center">

**Built with ❤️ by the Spin AI Team**

*Empowering developers to create faster, smarter, and more efficiently*

[🌐 Website](https://spin-ai.com) • [🐦 Twitter](https://twitter.com/spinai) • [💬 Discord](https://discord.gg/spin-ai) • [📧 Contact](mailto:hello@spin-ai.com)

</div>
