import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://apex-wealth-api.onrender.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('[CHAT API] Forwarding request to backend:', API_URL);

    // Build headers - forward auth tokens
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Forward ID token from header
    const idToken = request.headers.get('X-ID-Token');
    if (idToken) {
      headers['X-ID-Token'] = idToken;
    }
    
    // Forward Authorization (access token) for Token Vault
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages: body.messages,
        session_id: body.session_id
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CHAT API] Backend error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Backend API error', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[CHAT API] Response received, tools_called:', data.tools_called?.join(', ') || 'none');

    return NextResponse.json(data);
  } catch (error) {
    console.error('[CHAT API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: String(error) },
      { status: 500 }
    );
  }
}
