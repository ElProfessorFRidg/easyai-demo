import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { decrypt } from '@/lib/encryption'; // Import decrypt function

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const conversations = await prisma.conversation.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        updatedAt: 'desc', // Show most recently updated conversations first
      },
      include: {
        // Optionally include a count of messages or the last message
        _count: {
          select: { messages: true },
        },
        // messages: { // Or include the last message
        //   orderBy: { timestamp: 'desc' },
        //   take: 1,
        // }
      },
    });

    // Note: We are not decrypting message content here as we are only fetching
    // conversation metadata (title, counts, etc.) and not individual messages.
    // If we were to include the last message's content as a snippet,
    // then decryption would be needed for that specific field.

    return NextResponse.json({ conversations }, { status: 200 });

  } catch (error) {
    console.error('Error in GET /api/conversations:', error);
    return NextResponse.json(
      { error: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}