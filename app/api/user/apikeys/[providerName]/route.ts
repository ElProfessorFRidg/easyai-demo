import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { AIProvider } from '@/lib/ai-providers';

interface DeleteRouteContext {
  params: {
    providerName: string;
  };
}

export async function DELETE(request: Request, { params }: DeleteRouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    const { providerName } = params;

    if (!providerName) {
      return NextResponse.json(
        { error: 'Provider name is required in the path.' },
        { status: 400 }
      );
    }

    // Optional: Validate providerName against AIProvider enum
    const isValidProvider = Object.values(AIProvider).includes(providerName as AIProvider);
    if (!isValidProvider) {
        return NextResponse.json({ error: 'Invalid provider name.' }, { status: 400 });
    }

    const result = await prisma.userApiKey.deleteMany({
      where: {
        userId: userId,
        providerName: providerName as AIProvider,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: `No API key found for provider ${providerName} to delete.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: `API key for ${providerName} deleted successfully.` }, { status: 200 });

  } catch (error) {
    console.error(`Error in DELETE /api/user/apikeys/[providerName]:`, error);
    return NextResponse.json(
      { error: 'An internal server error occurred while deleting the API key.' },
      { status: 500 }
    );
  }
}