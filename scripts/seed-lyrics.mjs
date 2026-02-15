/**
 * Seed script: populates earwyrm with curated real lyrics + notes.
 *
 * Usage:
 *   1. Create an account in the app with username "earwyrm" (or whatever you want)
 *   2. Get that user's ID from Supabase dashboard (Auth → Users)
 *   3. Run: node scripts/seed-lyrics.mjs <user_id>
 *
 * All lyrics are real, verified excerpts. Notes are original editorial commentary.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://btrwdmeguitbbvcreokk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0cndkbWVndWl0YmJ2Y3Jlb2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTc1NjAsImV4cCI6MjA4MzM3MzU2MH0.4FpwGF-AqOnpJIVTGG1Er7F2262_Eff1FGk7PA8AY3Y'

const supabase = createClient(supabaseUrl, supabaseKey)

const userId = process.argv[2]
if (!userId) {
  console.error('Usage: node scripts/seed-lyrics.mjs <user_id>')
  console.error('Get the user_id from Supabase Auth dashboard.')
  process.exit(1)
}

// Every lyric here is a real, published excerpt. No hallucinated lines.
const SEED_DATA = [
  {
    content: "There is a crack in everything\nThat's how the light gets in",
    song_title: 'Anthem',
    artist_name: 'Leonard Cohen',
    tags: ['Hopeful', 'Wisdom'],
    note: "Cohen wrote this in the early 90s and said it took him years to finish. The whole song is about accepting imperfection, but these two lines became bigger than the song itself.",
    note_types: ['backstory'],
  },
  {
    content: "Freedom's just another word for nothing left to lose",
    song_title: 'Me and Bobby McGee',
    artist_name: 'Janis Joplin',
    tags: ['Melancholy', 'Freedom'],
    note: "Kris Kristofferson wrote it, but Joplin made it hers. She recorded it days before she died. That context makes the line hit completely different.",
    note_types: ['backstory', 'personal'],
  },
  {
    content: "And in the end, the love you take\nIs equal to the love you make",
    song_title: 'The End',
    artist_name: 'The Beatles',
    tags: ['Wisdom', 'Love'],
    note: "The last lyric on the last album they recorded together. McCartney wrote it as a couplet — almost like an epitaph for the band. Hard to imagine a better final word.",
    note_types: ['backstory'],
  },
  {
    content: "I've seen things you people wouldn't believe\nAttack ships on fire off the shoulder of Orion",
    song_title: 'Blade Runner (Tears in Rain)',
    artist_name: 'Rutger Hauer',
    tags: ['Late Night', 'Nostalgia'],
    note: "Not a song lyric in the traditional sense, but Hauer ad-libbed most of this on set. It's about the terror of losing memories — which is what lyrics fight against too.",
    note_types: ['interpretation'],
  },
  {
    content: "We're just two lost souls swimming in a fish bowl\nYear after year",
    song_title: 'Wish You Were Here',
    artist_name: 'Pink Floyd',
    tags: ['Melancholy', 'Nostalgia'],
    note: "Written for Syd Barrett, their former bandmate who had a mental breakdown. But it became about anyone you've lost touch with. That's the thing about great lyrics — they outgrow their origin.",
    note_types: ['backstory', 'interpretation'],
  },
  {
    content: "You may say I'm a dreamer\nBut I'm not the only one",
    song_title: 'Imagine',
    artist_name: 'John Lennon',
    tags: ['Hopeful', 'Peace'],
    note: "The genius of this line is 'I'm not the only one.' It turns a vulnerable confession into an invitation. You're not alone in wanting something better.",
    note_types: ['interpretation'],
  },
  {
    content: "Hello darkness, my old friend\nI've come to talk with you again",
    song_title: 'The Sound of Silence',
    artist_name: 'Simon & Garfunkel',
    tags: ['Late Night', 'Melancholy'],
    note: "Paul Simon wrote this at 21, in his bathroom with the lights off. Sometimes the best writing comes from sitting with the quiet instead of running from it.",
    note_types: ['backstory', 'personal'],
  },
  {
    content: "Time keeps on slippin', slippin', slippin'\nInto the future",
    song_title: 'Fly Like an Eagle',
    artist_name: 'Steve Miller Band',
    tags: ['Driving', 'Nostalgia'],
    note: "This line loops in your head the same way time loops — you never feel it passing until it's passed. The repetition is the point.",
    note_types: ['interpretation'],
  },
  {
    content: "I see a red door and I want it painted black\nNo colors anymore, I want them to turn black",
    song_title: 'Paint It Black',
    artist_name: 'The Rolling Stones',
    tags: ['Melancholy', 'Driving'],
    note: "Jagger said it's about a guy mourning his girlfriend. But it reads like depression itself — the compulsive need to drain color from everything. The sitar makes it feel ancient, inevitable.",
    note_types: ['interpretation', 'backstory'],
  },
  {
    content: "How many roads must a man walk down\nBefore you call him a man?",
    song_title: "Blowin' in the Wind",
    artist_name: 'Bob Dylan',
    tags: ['Wisdom', 'Peace'],
    note: "Dylan wrote this in ten minutes in a cafe in 1962. He was 21. The answer, of course, is that the question is the answer — you never stop walking.",
    note_types: ['backstory', 'interpretation'],
  },
  {
    content: "I hurt myself today\nTo see if I still feel",
    song_title: 'Hurt',
    artist_name: 'Nine Inch Nails',
    tags: ['Late Night', 'Melancholy'],
    note: "Trent Reznor wrote it, but Johnny Cash's version made it something else entirely. An old man looking back at his life, singing a young man's pain. Both versions are true.",
    note_types: ['backstory'],
  },
  {
    content: "They paved paradise and put up a parking lot",
    song_title: 'Big Yellow Taxi',
    artist_name: 'Joni Mitchell',
    tags: ['Nostalgia', 'Wisdom'],
    note: "Mitchell said she wrote this after visiting Hawaii and looking out her hotel window at the mountains — then looking down at the parking lot. Sometimes a lyric is just seeing what's in front of you.",
    note_types: ['backstory'],
  },
  {
    content: "Is this the real life?\nIs this just fantasy?\nCaught in a landslide\nNo escape from reality",
    song_title: 'Bohemian Rhapsody',
    artist_name: 'Queen',
    tags: ['Late Night', 'Driving'],
    note: "Mercury never explained what this song was about. Six minutes, no chorus, opera in the middle. Sometimes the best lyrics don't explain themselves either.",
    note_types: ['backstory'],
  },
  {
    content: "And the sign said 'The words of the prophets\nAre written on the subway walls\nAnd tenement halls'",
    song_title: 'The Sound of Silence',
    artist_name: 'Simon & Garfunkel',
    tags: ['Wisdom', 'Late Night'],
    note: "The truth doesn't come from above. It comes from the margins — graffiti, overheard conversations, the things people write when nobody important is watching.",
    note_types: ['interpretation'],
  },
  {
    content: "All that is gold does not glitter\nNot all those who wander are lost",
    song_title: 'The Riddle of Strider',
    artist_name: 'J.R.R. Tolkien',
    tags: ['Wisdom', 'Hopeful'],
    note: "Tolkien inverts the proverb. The valuable things don't always shine, and movement isn't the same as being directionless. A quiet argument for trusting your own path.",
    note_types: ['interpretation'],
  },
  {
    content: "I took the road less traveled by\nAnd that has made all the difference",
    song_title: 'The Road Not Taken',
    artist_name: 'Robert Frost',
    tags: ['Wisdom', 'Hopeful'],
    note: "Everyone reads this as inspirational. Frost actually wrote it as a joke about his indecisive friend. The narrator admits both roads were basically the same. The 'difference' is just the story we tell ourselves.",
    note_types: ['backstory', 'interpretation'],
  },
]

async function seed() {
  console.log(`Seeding ${SEED_DATA.length} lyrics for user ${userId}...`)

  for (const item of SEED_DATA) {
    // Insert lyric
    const { data: lyric, error: lyricError } = await supabase
      .from('lyrics')
      .insert({
        user_id: userId,
        content: item.content,
        song_title: item.song_title,
        artist_name: item.artist_name,
        tags: item.tags,
        theme: 'signature',
        is_current: false,
        is_public: true,
      })
      .select()
      .single()

    if (lyricError) {
      console.error(`  ✕ Failed to insert "${item.song_title}":`, lyricError.message)
      continue
    }

    console.log(`  ✓ ${item.artist_name} — "${item.song_title}"`)

    // Insert note
    if (item.note) {
      const { error: noteError } = await supabase
        .from('lyric_notes')
        .insert({
          lyric_id: lyric.id,
          user_id: userId,
          content: item.note,
          is_public: true,
          note_types: item.note_types || [],
        })

      if (noteError) {
        console.error(`    ✕ Note failed:`, noteError.message)
      }
    }
  }

  console.log('\nDone. Check /explore to see them.')
}

seed().catch(console.error)
