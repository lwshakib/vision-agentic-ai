# <img src="./public/logo.svg" width="40" alt="Vision Agentic AI Logo" style="vertical-align: middle;"> Vision Agentic AI

Vision Agentic AI is a state-of-the-art agentic AI platform built with **Next.js 15+** and **React 19**. It empowers users with a sophisticated suite of AI tools, including real-time web exploration, automated content extraction, high-quality image generation, and natural voice synthesis.

![Vision Agentic AI Demo](./public/demo.png)

## ✨ Key Features

- 🤖 **Agentic Chat System**: Context-aware AI interactions powered by Google's Gemini models.
- 📂 **Workspace & Project Management**: Organize specialized chats into dedicated projects for streamlined workflows.
- 🔍 **Real-time Web Search**: Integrated Tavily search for up-to-the-minute information retrieval.
- 📄 **Deep Web Extraction**: Automated tools to scrape and analyze content from any URL.
- 🎨 **Creative Image Generation**: Generate stunning visuals directly within your conversation flow.
- 🎙️ **Text-to-Speech (TTS)**: Convert AI responses into natural-sounding speech.
- 🔒 **Enterprise-Grade Auth**: Secure user accounts and session management via BetterAuth.
- 🖼️ **Media Asset Library**: Centralized management for all generated and uploaded images.
- ⚡ **Optimistic UI Engine**: High-performance interface with immediate feedback using Framer Motion.
- 🌗 **Adaptive Theming**: Fully responsive design with support for System, Light, and Dark modes.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and Bun (recommended)
- Git
- A modern web browser

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/lwshakib/vision-agentic-ai.git
   cd vision-agentic-ai
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   # Update the environment variables in .env
   ```

4. Initialize the database:

   ```bash
   bun run db:migrate
   ```

5. Run the development server:

   ```bash
   bun run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Testing

Run unit and snapshot tests with Jest:

```bash
bun run test
```

Run E2E tests with Playwright:

```bash
# Ensure your dev server is running or use the built-in webServer config
bun run test:e2e
```

## 🛠️ Tech Stack

- **Runtime & Package Manager**: [Bun](https://bun.sh/)
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js Server Actions, Prisma ORM
- **Authentication**: [Better-Auth](https://better-auth.com/)
- **AI Integration**: [Google Gemini Pro Vision](https://ai.google.dev/), [Vercel AI SDK](https://sdk.vercel.ai/)
- **Web Intelligence**: [Tavily AI Search](https://tavily.com/)
- **Database**: PostgreSQL (via Prisma)
- **Image Hosting**: [Cloudinary](https://cloudinary.com/)
- **UI & Motion**: Radix UI, shadcn/ui, Framer Motion
- **Testing**: Jest, Playwright

## 📂 Project Architecture

The codebase follows a modern Next.js 15 App Router architecture with a strong emphasis on modularity and type safety:

- **`actions/`**: Server-side logic for data mutations and external integrations.
- **`app/`**: Route definitions and layout configurations.
  - `(auth)`: Encapsulated authentication flows.
  - `(main)`: Core application views and user workspace.
  - `api/`: REST endpoints for authentication and tool execution triggers.
- **`components/`**: React components hierarchy.
  - `ai-elements/`: Interactive components for rendering AI-generated content (e.g., search cards, image galleries).
  - `chats/`: Core chat interface and conversation state management.
  - `ui/`: Design system primitives built with Tailwind and Radix UI.
- **`llm/`**: The brain of the application. Contains tool definitions, specialized prompts, and streaming logic.
- **`lib/`**: Centralized utilities, database clients (Prisma), and shared constants.
- **`prisma/`**: Data modeling and migration history for PostgreSQL.

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) to get started.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [Vercel](https://vercel.com/) for deployment
- The open-source community for their invaluable contributions
