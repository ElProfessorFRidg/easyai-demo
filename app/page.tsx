import ChatInterface from "@/components/feature/ChatInterface";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start pt-8 md:pt-16 px-4">
      {/* <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex mb-8">
        <h1 className="text-4xl font-bold text-center w-full">Chat App</h1>
      </div> */}
      <ChatInterface />
    </main>
  );
}