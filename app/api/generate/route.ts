import { NextResponse } from 'next/server';

/**
 * Valid Suno API models
 */
const VALID_MODELS = ['V5', 'V4_5PLUS', 'V4_5ALL', 'V4_5', 'V4'] as const;
type SunoModel = (typeof VALID_MODELS)[number];

/**
 * Request body interface for generation
 */
interface GenerateRequestBody {
  // Existing
  prompt?: string;      // Required in non-custom mode (max 500 chars)
  apiKey?: string;      // Optional, falls back to header/env

  // Mode Controls
  customMode?: boolean; // Enable custom lyrics mode
  instrumental?: boolean; // Generate without vocals

  // Custom Mode Fields (required when customMode=true)
  lyrics?: string;      // Custom lyrics text
  title?: string;       // Track title
  style?: string;       // Genre/style tags (max 1000 chars for V5)

  // Model Selection
  model?: SunoModel;

  // Advanced (optional)
  personaId?: string;   // Voice persona ID

  // Advanced Voice Options
  vocalGender?: 'm' | 'f';        // Vocal gender preference
  negativeTags?: string;          // Styles to exclude (max 1000 chars)
  styleWeight?: number;           // Style guidance weight (0.00-1.00)
  weirdnessConstraint?: number;   // Creative deviation constraint (0.00-1.00)
}

export async function POST(request: Request) {
  const body = await request.json() as GenerateRequestBody;
  const {
    prompt,
    apiKey,
    customMode = false,
    instrumental = false,
    lyrics,
    title,
    style,
    model = 'V5',
    personaId,
    // Advanced voice options
    vocalGender,
    negativeTags,
    styleWeight,
    weirdnessConstraint
  } = body;

  const headerKey = request.headers.get('x-suno-api-key')?.trim();
  const defaultKey = process.env.SUNOAPI_KEY;
  const token = (typeof apiKey === 'string' ? apiKey.trim() : '') || headerKey || defaultKey;

  if (!token) {
    return NextResponse.json({ error: 'Missing Suno API key' }, { status: 400 });
  }

  // Validate model
  if (!VALID_MODELS.includes(model as SunoModel)) {
    return NextResponse.json(
      { error: `Invalid model. Must be one of: ${VALID_MODELS.join(', ')}` },
      { status: 400 }
    );
  }

  // Validation based on mode
  if (customMode) {
    // Custom mode requires title and style
    if (!title) {
      return NextResponse.json(
        { error: 'Title is required in custom mode' },
        { status: 400 }
      );
    }
    if (!style) {
      return NextResponse.json(
        { error: 'Style is required in custom mode' },
        { status: 400 }
      );
    }
    // If not instrumental, lyrics are required
    if (!instrumental && !lyrics) {
      return NextResponse.json(
        { error: 'Lyrics are required in custom mode (unless instrumental)' },
        { status: 400 }
      );
    }
    // Validate style length for V5 (max 1000 chars)
    if (style && style.length > 1000) {
      return NextResponse.json(
        { error: 'Style must be 1000 characters or less' },
        { status: 400 }
      );
    }
  } else {
    // Non-custom mode requires prompt
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }
    // Validate prompt length for non-custom mode (max 500 characters per API docs)
    if (prompt.length > 500) {
      return NextResponse.json(
        { error: 'Prompt must be 500 characters or less for non-custom mode' },
        { status: 400 }
      );
    }
  }

  try {
    // Construct callback URL - use the request origin
    const origin = request.headers.get('origin') || request.headers.get('referer')?.split('/').slice(0, 3).join('/') || 'http://localhost:3000';
    const callbackUrl = `${origin}/api/callback`;

    console.log('Initiating music generation with callback:', callbackUrl);
    console.log('Generation options:', {
      customMode,
      instrumental,
      model,
      hasTitle: !!title,
      hasStyle: !!style,
      hasLyrics: !!lyrics,
      hasPersonaId: !!personaId,
      vocalGender: vocalGender || 'auto',
      hasNegativeTags: !!negativeTags,
      styleWeight,
      weirdnessConstraint
    });

    // Build request payload
    const payload: Record<string, unknown> = {
      customMode,
      instrumental,
      model,
      callBackUrl: callbackUrl,
    };

    if (customMode) {
      payload.title = title;
      payload.style = style;
      if (!instrumental && lyrics) {
        // In custom mode, lyrics go in the prompt field
        payload.prompt = lyrics;
      }
      if (personaId) {
        payload.personaId = personaId;
      }
    } else {
      payload.prompt = prompt;
    }

    // Advanced voice options - only add if provided and not default
    if (vocalGender && !instrumental) {
      payload.vocalGender = vocalGender;
    }
    if (negativeTags && negativeTags.trim()) {
      payload.negativeTags = negativeTags.trim();
    }
    if (styleWeight !== undefined && styleWeight !== 0.5) {
      payload.styleWeight = styleWeight;
    }
    if (weirdnessConstraint !== undefined && weirdnessConstraint !== 0.5) {
      payload.weirdnessConstraint = weirdnessConstraint;
    }

    // Generate music using Suno API
    const generateResponse = await fetch('https://api.sunoapi.org/api/v1/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const generateData = await generateResponse.json();

    // Check if the API returned an error
    if (generateData.code !== 200) {
      console.error('Suno API error:', generateData);
      return NextResponse.json(
        { error: generateData.msg || 'Failed to generate song' },
        { status: 500 }
      );
    }

    const taskId = generateData.data?.taskId;

    if (!taskId) {
      return NextResponse.json({ error: 'No task ID returned' }, { status: 500 });
    }

    // Return task ID immediately so frontend can poll for progress
    return NextResponse.json({ taskId });

  } catch (error) {
    console.error('Generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: `Server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
