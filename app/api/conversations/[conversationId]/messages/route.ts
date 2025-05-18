import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { decrypt } from '@/lib/encryption'; // Import decrypt function

interface RouteContext {
  params: {
    conversationId: string;
  };
}

export async function GET(request: Request, context: { params: Promise<{ conversationId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    
    // Await params as per Next.js 15 guidance for Route Handlers
    const routeParams = await context.params;
    const conversationId = routeParams.conversationId;

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required.' },
        { status: 400 }
      );
    }

    // Verify the conversation belongs to the user before fetching messages
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: userId,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied.' },
        { status: 404 }
      );
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId: conversationId,
      },
      orderBy: {
        timestamp: 'asc', // Show messages in chronological order
      },
    });

    const decryptedMessages = messages.map(msg => {
      const decryptedContent = decrypt(msg.content);
      if (decryptedContent === null) {
        console.error(`Failed to decrypt message ID: ${msg.id} in conversation ${conversationId}`);
        return { ...msg, content: '[Contenu chiffré - Erreur de déchiffrement]' };
      }
      return { ...msg, content: decryptedContent };
    });

    return NextResponse.json({ messages: decryptedMessages }, { status: 200 });

  } catch (error) {
    console.error(`Error in GET /api/conversations/[conversationId]/messages:`, error);
    return NextResponse.json(
      { error: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}