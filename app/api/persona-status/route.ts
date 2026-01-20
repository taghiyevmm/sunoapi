import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');
  const headerKey = request.headers.get('x-suno-api-key')?.trim();
  const defaultKey = process.env.SUNOAPI_KEY;
  const token = headerKey || defaultKey;

  if (!taskId) {
    return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: 'Missing Suno API key' }, { status: 400 });
  }

  try {
    // Check persona generation status
    const checkResponse = await fetch(
      `https://api.sunoapi.org/api/v1/generate/record-info?taskId=${taskId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const checkData = await checkResponse.json();

    console.log('Persona status check response:', JSON.stringify(checkData, null, 2));

    if (checkData.code !== 200) {
      console.error('API returned error:', checkData);
      return NextResponse.json(
        { error: checkData.msg || 'Failed to check persona status' },
        { status: 500 }
      );
    }

    const status = checkData.data?.status;
    const personaData = checkData.data?.response;

    // Parse persona ID from response
    // The persona ID might be in different locations depending on the API response structure
    let personaId = null;
    if (status === 'SUCCESS' && personaData) {
      // Try different possible locations for the persona ID
      personaId = personaData.personaId || personaData.id || personaData.sunoData?.[0]?.personaId;
    }

    return NextResponse.json({
      status,
      personaId,
      data: personaData,
    });

  } catch (error) {
    console.error('Persona status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
