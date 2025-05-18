import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { AIProvider, getProviderConfigById } from '@/lib/ai-providers';
import { encrypt, decryptApiKey, decrypt } from '@/lib/encryption';
import { getLLMCompletion } from '@/lib/llm-service'; // Import the new LLM service

// Define a type for the expected request body
interface PostRequestBody {
  content: string;
  conversationId?: string;
  aiProvider?: AIProvider; // Use the enum for type safety
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = (await request.json()) as PostRequestBody;

    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json(
        { error: 'Message content is required and must be a string.' },
        { status: 400 }
      );
    }

    const selectedProviderConfig = body.aiProvider ? getProviderConfigById(body.aiProvider) : null;
    if (body.aiProvider && !selectedProviderConfig) {
      return NextResponse.json(
        { error: 'Invalid AI provider specified.' },
        { status: 400 }
      );
    }

    let conversationId = body.conversationId;

    // If no conversationId is provided, create a new conversation
    if (!conversationId) {
      const newConversation = await prisma.conversation.create({
        data: {
          userId: userId,
          // title: `Chat started on ${new Date().toLocaleDateString()}` // Optional: generate a title
        },
      });
      conversationId = newConversation.id;
    } else {
      // Verify the existing conversation belongs to the user
      const existingConversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: userId },
      });
      if (!existingConversation) {
        return NextResponse.json(
          { error: 'Conversation not found or access denied.' },
          { status: 404 }
        );
      }
    }

    // Encrypt user's message content
    const encryptedUserContent = encrypt(body.content);
    if (!encryptedUserContent) {
      return NextResponse.json({ error: 'Failed to encrypt user message.' }, { status: 500 });
    }

    const userMessage = await prisma.message.create({
      data: {
        content: encryptedUserContent, // Store encrypted content
        sender: 'USER',
        conversationId: conversationId,
        aiProvider: selectedProviderConfig?.id,
      },
    });

    let apiKey = null;
    if (selectedProviderConfig) {
      const userApiKey = await prisma.userApiKey.findUnique({
        where: {
          userId_providerName: {
            userId: userId,
            providerName: selectedProviderConfig.id,
          },
        },
      });

      if (userApiKey && userApiKey.encryptedKey) {
        apiKey = decryptApiKey(userApiKey.encryptedKey);
        if (!apiKey) {
          console.warn(`Failed to decrypt API key for user ${userId} and provider ${selectedProviderConfig.id}. Proceeding without API key.`);
          // Optionally, you could return an error here or notify the user
        }
      } else {
        console.warn(`No API key found for user ${userId} and provider ${selectedProviderConfig.id}. Proceeding without API key.`);
        // Optionally, return an error or prompt user to add a key
      }
    }

    let aiMessageContent = '';
    let modelUsedByAI: string | undefined = selectedProviderConfig?.id || 'mockAI';

    if (selectedProviderConfig && apiKey) {
      const llmResponse = await getLLMCompletion({
        prompt: body.content,
        provider: selectedProviderConfig.id,
        apiKey: apiKey,
        // model: 'specific-model-if-needed', // Optionally specify a model
      });

      if (llmResponse.error) {
        console.error(`LLM Error from ${selectedProviderConfig.name}: ${llmResponse.error}`);
        // Fallback or specific error handling
        aiMessageContent = `Error from ${selectedProviderConfig.name}: ${llmResponse.error}. Falling back to mock response.`;
        // Potentially, do not save this AI message or save it with an error flag.
      } else {
        aiMessageContent = llmResponse.content;
        modelUsedByAI = llmResponse.modelUsed || selectedProviderConfig.id;
      }
    } else if (selectedProviderConfig) {
      // No API key available, but a provider was selected
      aiMessageContent = `Mock response from ${selectedProviderConfig.name} (No API Key configured/found) for: "${body.content}"`;
      console.warn(`No API key for ${selectedProviderConfig.name}, using mock response.`);
    } else {
      // No provider selected (should ideally not happen if UI forces a default)
      aiMessageContent = `Mock response from default AI (No provider specified) for: "${body.content}"`;
      modelUsedByAI = 'mockAI_default';
    }

    const encryptedAiContent = encrypt(aiMessageContent);
    if (!encryptedAiContent) {
      // Handle AI message encryption failure, maybe don't save AI message or return error
      console.error('Failed to encrypt AI message. AI response will not be saved.');
      // For now, we'll proceed without saving the AI message if encryption fails,
      // but return the user message and a temporary AI response to the client.
      // This part needs robust error handling.
      return NextResponse.json({
        userMessage: { ...userMessage, content: body.content }, // Return decrypted for immediate display
        aiMessage: { id: 'temp-ai-error', content: "Error: AI response could not be saved securely.", sender: 'AI', timestamp: new Date() },
        conversation: body.conversationId ? undefined : await prisma.conversation.findUnique({ where: { id: conversationId }})
      }, { status: 201 });
    }

    const aiMessage = await prisma.message.create({
      data: {
        content: encryptedAiContent,
        sender: 'AI',
        conversationId: conversationId,
        aiProvider: modelUsedByAI, // Store the actual model or provider ID used
      },
    });

    // DEBUG LOG: Check IDs
    console.log('[API/messages] userMessage.id:', userMessage.id, 'aiMessage.id:', aiMessage.id);


    if (!body.conversationId) {
      // If it was a new conversation, return the conversation object along with messages
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { timestamp: 'asc' } // Ensure messages are ordered
          }
        }
      });
      // Decrypt messages for the response if a new conversation is returned
      const decryptedConversation = conversation ? {
        ...conversation,
        messages: conversation.messages.map(m => ({...m, content: decrypt(m.content) || "[Decryption Error]" }))
      } : null;

      return NextResponse.json({
        conversation: decryptedConversation,
        userMessage: { ...userMessage, content: body.content }, // Return decrypted for immediate display
        aiMessage: { ...aiMessage, content: aiMessageContent } // Return decrypted for immediate display
      }, { status: 201 });
    }

    return NextResponse.json({
      userMessage: { ...userMessage, content: body.content }, // Return decrypted for immediate display
      aiMessage: { ...aiMessage, content: aiMessageContent } // Return decrypted for immediate display
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/messages:', error);
    if (error instanceof SyntaxError) { // Handle JSON parsing errors
        return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}