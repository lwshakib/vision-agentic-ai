# Vision Agentic AI

Vision Agentic AI is an advanced agentic chatbot platform designed to provide a seamless and powerful user experience. Built with Next.js 15 and powered by state-of-the-art AI, it allows users to chat and utilize a suite of agentic tools, including real-time web search, detailed web content extraction, and high-quality image generation.

![Vision Agentic AI Demo](./public/demo.png)

## ✨ Features

- 🤖 **Agentic Chatbot**: Engage in meaningful conversations with an AI that understands context and intent.
- 📂 **Project Management**: Organize your chats into dedicated projects for better workflow.
- ⚡ **Optimistic UI**: Experience instant interactions with immediate feedback for actions like deletion.
- 🔍 **Web Search Tool**: Real-time access to the web to find up-to-date information during chats.
- 📄 **Web Extraction**: Deeply extract and analyze content from any web URL for research and insights.
- 🎨 **Image Generation**: Generate high-quality images directly within the chat interface.
- 🔒 **Secure Authentication**: Built-in security with BetterAuth.
- 🖼️ **Image Library**: Automatically collect and manage all images generated or attached in your chats.

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

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js Server Actions, Prisma
- **Auth**: BetterAuth
- **AI**: Google AI SDK, Tavily for Web Search
- **Database**: PostgreSQL
- **UI Components**: Radix UI, shadcn/ui, motion

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) to get started.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [Vercel](https://vercel.com/) for deployment
- The open-source community for their invaluable contributions
