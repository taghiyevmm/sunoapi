import { NextResponse } from 'next/server';

/**
 * Request body interface for persona creation
 */
interface PersonaRequestBody {
  taskId: string;       // Task ID from original generation
  audioId: string;      // Audio ID of the track
  name: string;         // Name for the persona
  description?: string; // Description of the voice/style characteristics
  apiKey?: string;      // Optional, falls back to header/env
}

export async function POST(request: Request) {
  const body = await request.json() as PersonaRequestBody;
  const { taskId, audioId, name, description, apiKey } = body;

  const headerKey = request.headers.get('x-suno-api-key')?.trim();
  const defaultKey = process.env.SUNOAPI_KEY;
  const token = (typeof apiKey === 'string' ? apiKey.trim() : '') || headerKey || defaultKey;

  if (!token) {
    return NextResponse.json({ error: 'Missing Suno API key' }, { status: 400 });
  }

  if (!taskId) {
    return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
  }

  if (!audioId) {
    return NextResponse.json({ error: 'Audio ID is required' }, { status: 400 });
  }

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Persona name is required' }, { status: 400 });
  }

  try {
    // Construct callback URL
    const origin = request.headers.get('origin') || request.headers.get('referer')?.split('/').slice(0, 3).join('/') || 'http://localhost:3000';
    const callbackUrl = `${origin}/api/persona-callback`;

    console.log('Creating persona with:', {
      taskId,
      audioId,
      name: name.trim(),
      hasDescription: !!description,
      callbackUrl,
    });

    // Call Suno API to create persona
    const response = await fetch('https://api.sunoapi.org/api/v1/generate/generate-persona', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        taskId,
        audioId,
        name: name.trim(),
        description: description?.trim() || '',
        callBackUrl: callbackUrl,
      }),
    });

    const data = await response.json();

    console.log('Persona creation response:', data);

    // Check if the API returned an error
    if (data.code !== 200) {
      console.error('Suno API error:', data);
      return NextResponse.json(
        { error: data.msg || 'Failed to create persona' },
        { status: 500 }
      );
    }

    const responseTaskId = data.data?.taskId;

    if (!responseTaskId) {
      return NextResponse.json({ error: 'No task ID returned' }, { status: 500 });
    }

    // Return task ID so frontend can poll for status
    return NextResponse.json({ taskId: responseTaskId });

  } catch (error) {
    console.error('Persona creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: `Server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
