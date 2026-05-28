import AIChat from "@/components/portal/ai-chat";

export default function AIAssistPage() {
  return (
    <div className="space-y-4 h-full flex flex-col">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
        <p className="text-gray-500 text-sm mt-0.5">Describe your issue and get instant help from DADA HOUSE AI</p>
      </div>
      <div className="flex-1">
        <AIChat />
      </div>
    </div>
  );
}
