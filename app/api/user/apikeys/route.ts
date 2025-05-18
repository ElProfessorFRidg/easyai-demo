import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { AIProvider } from '@/lib/ai-providers'; // Assuming AIProvider enum is here
import { encryptApiKey, decryptApiKey } from '@/lib/encryption';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const userApiKeys = await prisma.userApiKey.findMany({
      where: { userId: userId },
      select: {
        providerName: true, // We only need to know for which providers a key is set
        // Do NOT select encryptedKey to send to client
      },
    });

    const configuredProviders = userApiKeys.map(key => key.providerName as AIProvider);

    return NextResponse.json({ configuredProviders }, { status: 200 });

  } catch (error) {
    console.error('Error in GET /api/user/apikeys:', error);
    return NextResponse.json(
      { error: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const { providerName, apiKey } = body as { providerName: AIProvider, apiKey: string };

    if (!providerName || !apiKey) {
      return NextResponse.json(
        { error: 'Provider name and API key are required.' },
        { status: 400 }
      );
    }

    // Validate providerName against our known AIProvider enum if necessary
    // For now, assuming it's a valid AIProvider string.

    const encryptedKey = encryptApiKey(apiKey);
    if (!encryptedKey) {
      return NextResponse.json(
        { error: 'Failed to encrypt API key.' },
        { status: 500 }
      );
    }

    await prisma.userApiKey.upsert({
      where: {
        userId_providerName: {
          userId: userId,
          providerName: providerName,
        },
      },
      update: {
        encryptedKey: encryptedKey,
      },
      create: {
        userId: userId,
        providerName: providerName,
        encryptedKey: encryptedKey,
      },
    });

    return NextResponse.json({ message: `API key for ${providerName} saved successfully.` }, { status: 201 });

  } catch (error: any) {
    console.error('Error in POST /api/user/apikeys:', error);
    if (error.code === 'P2002') { // Prisma unique constraint violation
        return NextResponse.json({ error: `An API key for this provider already exists. Use update or delete.` }, { status: 409 });
    }
    return NextResponse.json(
      { error: 'An internal server error occurred while saving the API key.' },
      { status: 500 }
    );
  }
}