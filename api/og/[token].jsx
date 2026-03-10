import { ImageResponse } from '@vercel/og';
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token') || req.url.split('/og/')[1]?.split('?')[0];

  if (!token) {
    return new Response('Missing token', { status: 400 });
  }

  // Fetch lyric data
  const { data: lyric, error } = await supabase
    .from('lyrics')
    .select('content, song_title, artist_name, cover_art_url, card_art_url')
    .eq('share_token', token)
    .single();

  if (error || !lyric) {
    return new Response('Lyric not found', { status: 404 });
  }

  const content = lyric.content.length > 200
    ? lyric.content.substring(0, 200) + '...'
    : lyric.content;

  const attribution = [lyric.song_title, lyric.artist_name]
    .filter(Boolean)
    .join(' — ');

  const bgImageUrl = lyric.card_art_url || lyric.cover_art_url;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200',
          height: '630',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          fontFamily: 'serif',
        }}
      >
        {/* Background */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#252220',
            display: 'flex',
          }}
        >
          {bgImageUrl && (
            <img
              src={bgImageUrl}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: 0.25,
              }}
            />
          )}
        </div>

        {/* Gradient overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(180deg, rgba(37,34,32,0.4) 0%, rgba(37,34,32,0.8) 100%)',
            display: 'flex',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '60px 80px',
            position: 'relative',
            gap: '24px',
          }}
        >
          {/* Lyric text */}
          <div
            style={{
              fontSize: '48px',
              color: '#FAF8F5',
              lineHeight: 1.4,
              fontStyle: 'italic',
              display: 'flex',
            }}
          >
            {content}
          </div>

          {/* Divider */}
          <div
            style={{
              width: '80px',
              height: '2px',
              backgroundColor: '#C8B8A8',
              opacity: 0.6,
              display: 'flex',
            }}
          />

          {/* Attribution */}
          {attribution && (
            <div
              style={{
                fontSize: '24px',
                color: '#C8B8A8',
                fontStyle: 'italic',
                display: 'flex',
              }}
            >
              {attribution}
            </div>
          )}

          {/* Brand */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              right: '80px',
              fontSize: '32px',
              color: '#C8B8A8',
              opacity: 0.7,
              fontStyle: 'italic',
              display: 'flex',
            }}
          >
            earwyrm
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    }
  );
}
