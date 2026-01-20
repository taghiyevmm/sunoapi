'use client';
import { useState, useRef } from 'react';
import Navigation from './components/Navigation';
import LyricsDisplay from './components/LyricsDisplay';

interface Song {
  id: string;
  title: string;
  audioUrl: string;
  prompt: string;
  createdAt: string;
  taskId: string;
  audioId: string;
  coverImages?: string[];
}

interface GeneratedTrack {
  audioUrl: string;
  title: string;
  audioId: string;
  duration?: number;
  imageUrl?: string;
  tags?: string;
}

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [credits, setCredits] = useState<number | null>(null);
  const [showSongs, setShowSongs] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [showTips, setShowTips] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState('');
  const [currentAudioId, setCurrentAudioId] = useState('');
  const [videoGenerating, setVideoGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [coverImages, setCoverImages] = useState<string[]>([]);
  const [coverGenerating, setCoverGenerating] = useState(false);
  const [generatedTracks, setGeneratedTracks] = useState<GeneratedTrack[]>([]);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  // Use default API key - no user input needed
  const apiKey = '55fc5a26ff12dd6a1ab709d8d37e0cd4';
  const clientApiKey = 'dacf3ada40b69f623d6ad37c08d7c21b7ae1d14e66aeeb909cdaab1ccc2010ac';

  // Custom generation options
  const [activeTab, setActiveTab] = useState<'simple' | 'custom'>('simple');
  const [instrumental, setInstrumental] = useState(false);
  const [model, setModel] = useState<'V5' | 'V4_5PLUS' | 'V4_5ALL' | 'V4_5' | 'V4'>('V5');
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('');
  const [lyrics, setLyrics] = useState('');

  // Advanced voice options
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [vocalGender, setVocalGender] = useState<'m' | 'f' | ''>('');
  const [negativeTags, setNegativeTags] = useState('');
  const [styleWeight, setStyleWeight] = useState(0.5);
  const [weirdnessConstraint, setWeirdnessConstraint] = useState(0.5);

  const checkStatus = async (taskId: string, key: string) => {
    const maxAttempts = 20; // 10 minutes max (20 * 30 seconds) - following API recommendations
    let attempts = 0;
    const startTime = Date.now();

    const funMessages = [
      '🎵 Mixing the perfect beat...',
      '🎸 Tuning the virtual guitars...',
      '🎹 Composing your masterpiece...',
      '🎤 Warming up the AI vocals...',
      '🎼 Writing musical magic...',
      '🎧 Adding that special sauce...',
      '✨ Sprinkling some creativity...',
      '🎺 Orchestrating the symphony...',
      '🥁 Laying down the rhythm...',
      '🎻 Fine-tuning the melody...',
      '🎸 Strumming the perfect chords...',
      '🎹 Tickling the ivories...',
      '🎵 Harmonizing the vocals...',
      '🎼 Arranging the perfect score...',
      '🎤 Polishing the lyrics...',
      '🎧 Mastering the audio...',
      '🎺 Adding brass brilliance...',
      '🥁 Programming the drum machine...',
      '🎻 Bowing the strings...',
      '🎸 Shredding some solos...',
      '🎹 Synthesizing soundscapes...',
      '🎵 Crafting catchy hooks...',
      '🎤 Recording vocal takes...',
      '🎼 Conducting the orchestra...',
      '🎧 Mixing the tracks...',
      '✨ Adding sonic sparkle...',
      '🎺 Blowing some jazz...',
      '🥁 Keeping the tempo...',
      '🎻 Adding string sections...',
      '🎸 Plugging in the amp...'
    ];

    // Shuffle messages for randomization
    const shuffledMessages = [...funMessages].sort(() => Math.random() - 0.5);
    let messageIndex = 0;

    // Update timer display every 10 seconds with fun messages
    const timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const elapsedMinutes = Math.floor(elapsed / 60);
      const elapsedSeconds = elapsed % 60;
      const timeStr = `${elapsedMinutes}:${elapsedSeconds.toString().padStart(2, '0')}`;
      
      // Rotate through fun messages every 10 seconds
      if (elapsed % 10 === 0 && elapsed > 0) {
        messageIndex = (messageIndex + 1) % shuffledMessages.length;
      }
      
      const tipText = elapsed < 30 ? ' • Typical generation: 2-4 minutes' : '';
      setStatusMessage(`${shuffledMessages[messageIndex]} (${timeStr})${tipText}`);
    }, 1000);

    while (attempts < maxAttempts) {
      attempts++;

      try {
        const response = await fetch(`/api/status?taskId=${taskId}`, {
          headers: {
            'x-suno-api-key': key,
            'X-API-Key': clientApiKey,
          },
        });
        
        if (!response.ok) {
          console.error('Status check failed:', response.status);
          await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds as recommended
          continue;
        }

        const data = await response.json();
        
        // Log for debugging
        console.log('Poll response:', data);

        if (data.error) {
          // Check if it's a sensitive word error
          if (data.sensitiveWordError) {
            setError('⚠️ Content Moderation: Your prompt contains words that are not allowed. Please try:\n• Avoiding violent, explicit, or offensive content\n• Using more general descriptions\n• Focusing on musical style and mood instead of specific topics');
          } else {
            setError(data.error);
          }
          setLoading(false);
          return;
        }

        // Handle different status stages with user feedback
        if (data.status === 'TEXT_SUCCESS') {
          setStatusMessage('📝 Lyrics generated! Creating music...');
        } else if (data.status === 'FIRST_SUCCESS') {
          setStatusMessage('🎵 First song ready! Generating second version...');
        }
        
        if (data.status === 'SUCCESS' && data.audioUrl) {
          clearInterval(timerInterval); // Stop the timer
          
          // Store all generated tracks with their built-in cover art
          const tracks = data.tracks || [{
            audioUrl: data.audioUrl,
            title: data.title,
            audioId: data.audioId,
            imageUrl: data.imageUrl,
            duration: data.duration,
            tags: data.tags
          }];
          setGeneratedTracks(tracks);
          setSelectedTrackIndex(0);
          
          // Set first track as default and use its built-in cover art
          setAudioUrl(tracks[0].audioUrl);
          setSongTitle(tracks[0].title || 'Your Song');
          setCurrentTaskId(taskId);
          setCurrentAudioId(tracks[0].audioId || '');
          
          // Use the built-in cover art from the track
          if (tracks[0].imageUrl) {
            setCoverImages([tracks[0].imageUrl]);
          }
          
          setStatusMessage(`🎉 ${tracks.length} song${tracks.length > 1 ? 's' : ''} ready with cover art!`);
          setLoading(false);
          
          // Save all tracks to localStorage with cover art
          const saved = JSON.parse(localStorage.getItem('sunoSongs') || '[]') as Song[];
          tracks.forEach((track: GeneratedTrack, index: number) => {
            const song: Song = {
              id: `${taskId}-${index}`,
              title: track.title || `Your Song ${index + 1}`,
              audioUrl: track.audioUrl,
              prompt: prompt,
              createdAt: new Date().toISOString(),
              taskId: taskId,
              audioId: track.audioId || '',
              coverImages: track.imageUrl ? [track.imageUrl] : []
            };
            saved.unshift(song);
          });
          localStorage.setItem('sunoSongs', JSON.stringify(saved.slice(0, 50))); // Keep last 50
          
          return;
        } else if (data.status === 'FAILED') {
          clearInterval(timerInterval); // Stop the timer
          setError('Music generation failed. Please try again.');
          setLoading(false);
          return;
        } else if (data.status === 'GENERATING' || data.status === 'PENDING') {
          await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds as recommended by API docs
        } else {
          // Unknown status, keep polling
          await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds as recommended
        }
      } catch {
        console.error('Status check error');
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds as recommended
      }
    }

    clearInterval(timerInterval); // Stop the timer on timeout
    setError('Generation timed out after 10 minutes. The song may still be processing. Please check back later or try again.');
    setLoading(false);
  };

  const generateSong = async () => {
    // Validation based on active tab
    if (activeTab === 'custom') {
      if (!title.trim()) {
        setError('Please enter a song title');
        return;
      }
      if (!style.trim()) {
        setError('Please enter a style/genre');
        return;
      }
      if (!instrumental && !lyrics.trim()) {
        setError('Please enter lyrics or enable instrumental mode');
        return;
      }
      if (style.length > 1000) {
        setError('Style must be under 1000 characters');
        return;
      }
    } else {
      if (!prompt.trim()) {
        setError('Please enter a song idea');
        return;
      }
      if (prompt.length > 500) {
        setError('Prompt must be under 500 characters');
        return;
      }
    }

    const activeKey = apiKey;

    // Basic content validation
    const contentToCheck = activeTab === 'custom' ? `${title} ${style} ${lyrics}` : prompt;
    const sensitivePatterns = /\b(kill|death|violence|explicit|nsfw|sexual|drug|hate)\b/i;
    if (sensitivePatterns.test(contentToCheck)) {
      setError('⚠️ Warning: Your content may contain sensitive words that could be rejected. Consider using more neutral language.');
      // Still allow submission, just warn
    }

    setLoading(true);
    setError('');
    setAudioUrl('');
    setSongTitle('');
    setStatusMessage('Starting generation...');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': clientApiKey,
        },
        body: JSON.stringify({
          ...(activeTab === 'custom' ? {
            customMode: true,
            title,
            style,
            ...(instrumental ? {} : { lyrics }),
          } : {
            prompt,
          }),
          instrumental,
          model,
          apiKey: activeKey,
          // Advanced voice options - only include if not default
          ...(vocalGender && !instrumental ? { vocalGender } : {}),
          ...(negativeTags.trim() ? { negativeTags: negativeTags.trim() } : {}),
          ...(styleWeight !== 0.5 ? { styleWeight } : {}),
          ...(weirdnessConstraint !== 0.5 ? { weirdnessConstraint } : {}),
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setLoading(false);
      } else if (data.taskId) {
        setStatusMessage('Task created, waiting for generation...');
        await checkStatus(data.taskId, activeKey);
      }
    } catch (error) {
      console.error('Generation error:', error);
      setError('Failed to generate song. Please try again. Check console for details.');
      setLoading(false);
    }
  };

  const downloadSong = async () => {
    if (!audioUrl) return;

    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${songTitle || 'song'}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      setError('Failed to download song. Please try again.');
    }
  };

  const checkCredits = async () => {
    const activeKey = apiKey;

    try {
      const response = await fetch('/api/credits', {
        headers: {
          'x-suno-api-key': activeKey,
          'X-API-Key': clientApiKey,
        },
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setCredits(data.credits);
      }
    } catch {
      setError('Failed to fetch credits');
    }
  };

  const loadSongHistory = () => {
    const saved = JSON.parse(localStorage.getItem('sunoSongs') || '[]') as Song[];
    setSongs(saved);
    setShowSongs(!showSongs);
  };

  const generateVideo = async () => {
    if (!currentTaskId || !currentAudioId) {
      setError('No song available to create video');
      return;
    }

    // Check if video already exists
    if (videoUrl) {
      setStatusMessage('✅ Video already generated! Playing existing video.');
      return;
    }

    setVideoGenerating(true);
    setError('');
    setVideoUrl('');

    try {
      const response = await fetch('/api/video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': clientApiKey,
        },
        body: JSON.stringify({
          taskId: currentTaskId,
          audioId: currentAudioId,
          apiKey: apiKey,
          author: '@DrLeeAPP',
          domainName: 'DrLee.App'
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setVideoGenerating(false);
      } else if (data.taskId) {
        setStatusMessage('Video generation started. This may take a few minutes...');
        await checkVideoStatus(data.taskId);
      }
    } catch (error) {
      console.error('Video generation error:', error);
      setError('Failed to generate video. Please try again.');
      setVideoGenerating(false);
    }
  };

  const checkVideoStatus = async (taskId: string) => {
    const maxAttempts = 40; // 20 minutes max (40 * 30 seconds)
    let attempts = 0;
    const startTime = Date.now();

    const videoMessages = [
      '🎬 Lights, camera, action!',
      '🌈 Painting colorful visuals...',
      '✨ Adding sparkle and shine...',
      '🎨 Creating stunning effects...',
      '🎪 Setting up the stage...',
      '🎭 Choreographing the scenes...',
      '🌟 Making it spectacular...',
      '🎆 Adding fireworks and flair...',
      '🎡 Building the perfect show...',
      '🎢 Taking you on a visual journey...',
      '🎬 Directing the masterpiece...',
      '🌈 Blending vibrant colors...',
      '✨ Sprinkling visual magic...',
      '🎨 Painting each frame...',
      '🎪 Preparing the grand finale...',
      '🎭 Setting the mood...',
      '🌟 Adding star quality...',
      '🎆 Creating explosive visuals...',
      '🎡 Spinning up animations...',
      '🎢 Crafting smooth transitions...',
      '🎬 Rolling the cameras...',
      '🌈 Rendering rainbow effects...',
      '✨ Polishing every pixel...',
      '🎨 Composing visual art...',
      '🎪 Orchestrating the show...',
      '🎭 Perfecting the performance...',
      '🌟 Illuminating the scenes...',
      '🎆 Launching visual fireworks...',
      '🎡 Animating the story...',
      '🎢 Building cinematic moments...'
    ];

    // Shuffle messages for randomization
    const shuffledMessages = [...videoMessages].sort(() => Math.random() - 0.5);
    let messageIndex = 0;

    while (attempts < maxAttempts) {
      attempts++;
      
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const elapsedMinutes = Math.floor(elapsed / 60);
      const elapsedSeconds = elapsed % 60;
      const timeStr = `${elapsedMinutes}:${elapsedSeconds.toString().padStart(2, '0')}`;
      
      // Rotate through fun messages every 30 seconds
      if (attempts > 1 && (attempts - 1) % 1 === 0) {
        messageIndex = (messageIndex + 1) % shuffledMessages.length;
      }

      try {
        const response = await fetch(`/api/video-status?taskId=${taskId}`, {
          headers: {
            'x-suno-api-key': apiKey,
            'X-API-Key': clientApiKey,
          },
        });

        const data = await response.json();

        if (data.error) {
          setError(data.error);
          setVideoGenerating(false);
          return;
        }

        // Handle video generation status
        if (data.status === 'PENDING') {
          // Show rotating fun messages with timer
          const tipText = elapsed < 240 ? ' • Typical generation: 2-4 minutes' : '';
          setStatusMessage(`${shuffledMessages[messageIndex]} (${timeStr})${tipText}`);
          await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
        } else if (data.status === 'SUCCESS' && data.videoUrl) {
          setVideoUrl(data.videoUrl);
          setStatusMessage('🎉 Video ready!');
          setVideoGenerating(false);
          return;
        } else if (data.status === 'CREATE_TASK_FAILED' || data.status === 'GENERATE_MP4_FAILED') {
          setError(data.errorMessage || 'Video generation failed. Please try again.');
          setVideoGenerating(false);
          return;
        }
      } catch (error) {
        console.error('Video status check error:', error);
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    setError('Video generation timed out. Please try again later.');
    setVideoGenerating(false);
  };

  const downloadVideo = async () => {
    if (!videoUrl) return;

    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${songTitle || 'song'}_video.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      setError('Failed to download video. Please try again.');
    }
  };

  const generateCover = async (taskId: string) => {
    setCoverGenerating(true);
    console.log('Starting cover generation for task:', taskId);

    try {
      const response = await fetch('/api/cover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': clientApiKey,
        },
        body: JSON.stringify({
          taskId: taskId,
          apiKey: apiKey
        }),
      });

      const data = await response.json();

      if (data.error) {
        console.error('Cover generation error:', data.error);
        setCoverGenerating(false);
      } else if (data.taskId) {
        console.log('Cover generation started, polling for results...');
        await checkCoverStatus(data.taskId, taskId);
      }
    } catch (error) {
      console.error('Cover generation error:', error);
      setCoverGenerating(false);
    }
  };

  const checkCoverStatus = async (coverTaskId: string, songTaskId: string) => {
    const maxAttempts = 120; // 2 minutes max
    let attempts = 0;
    const startTime = Date.now();

    const coverMessages = [
      '🎨 Painting the perfect cover...',
      '✨ Adding artistic flair...',
      '🖌️ Brushing on creativity...',
      '🌈 Blending vibrant colors...',
      '🎭 Designing visual themes...',
      '🖼️ Framing the masterpiece...',
      '🎨 Mixing color palettes...',
      '✨ Polishing the artwork...',
      '🖌️ Sketching the concept...',
      '🌈 Creating rainbow gradients...',
      '🎭 Setting the artistic mood...',
      '🖼️ Composing the layout...',
      '🎨 Applying finishing touches...',
      '✨ Adding visual magic...',
      '🖌️ Crafting unique designs...',
      '🌈 Illuminating with color...',
      '🎭 Expressing the vibe...',
      '🖼️ Perfecting the composition...',
      '🎨 Rendering artistic details...',
      '✨ Sprinkling creative dust...',
      '🖌️ Drawing inspiration...',
      '🌈 Painting with light...',
      '🎭 Capturing the essence...',
      '🖼️ Finalizing the artwork...',
      '🎨 Creating visual harmony...',
      '✨ Enhancing the aesthetics...',
      '🖌️ Styling the cover...',
      '🌈 Balancing the palette...',
      '🎭 Designing with passion...',
      '🖼️ Showcasing the art...'
    ];

    // Shuffle messages for randomization
    const shuffledMessages = [...coverMessages].sort(() => Math.random() - 0.5);
    let messageIndex = 0;

    // Update timer display every second with fun messages
    const timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const elapsedMinutes = Math.floor(elapsed / 60);
      const elapsedSeconds = elapsed % 60;
      const timeStr = `${elapsedMinutes}:${elapsedSeconds.toString().padStart(2, '0')}`;
      
      // Rotate through fun messages every 10 seconds
      if (elapsed % 10 === 0 && elapsed > 0) {
        messageIndex = (messageIndex + 1) % shuffledMessages.length;
      }
      
      const tipText = elapsed < 120 ? ' • Typical generation: 2-4 minutes' : '';
      setStatusMessage(`${shuffledMessages[messageIndex]} (${timeStr})${tipText}`);
    }, 1000);

    while (attempts < maxAttempts) {
      attempts++;

      try {
        const response = await fetch(`/api/cover-status?taskId=${coverTaskId}`, {
          headers: {
            'x-suno-api-key': apiKey,
            'X-API-Key': clientApiKey,
          },
        });

        const data = await response.json();
        console.log('Cover status response:', data);

        if (data.images && data.images.length > 0) {
          console.log('Cover images ready:', data.images);
          clearInterval(timerInterval);
          setCoverImages(data.images);
          setCoverGenerating(false);
          setStatusMessage('🎉 Cover art ready!');

          // Update localStorage with cover images
          const saved = JSON.parse(localStorage.getItem('sunoSongs') || '[]') as Song[];
          const songIndex = saved.findIndex(s => s.taskId === songTaskId);
          if (songIndex !== -1) {
            saved[songIndex].coverImages = data.images;
            localStorage.setItem('sunoSongs', JSON.stringify(saved));
          }

          return;
        }

        // Check if there's an error status
        if (data.status && (data.status === 'FAILED' || data.status.includes('FAILED'))) {
          console.error('Cover generation failed:', data);
          setError('Cover generation failed. Please try again.');
          setCoverGenerating(false);
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
      } catch (error) {
        console.error('Cover status check error:', error);
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    clearInterval(timerInterval);
    console.log('Cover generation timed out');
    setError('Cover generation timed out. The API may be experiencing delays. Please try again later.');
    setCoverGenerating(false);
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4 relative overflow-hidden pt-24">
        {/* Animated Music Notes Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-10 text-6xl opacity-10 animate-float text-purple-300">🎵</div>
          <div className="absolute top-20 right-20 text-4xl opacity-10 animate-float-delayed text-blue-300">🎶</div>
          <div className="absolute bottom-40 left-20 text-5xl opacity-10 animate-float-slow text-teal-300">🎼</div>
          <div className="absolute bottom-20 right-32 text-7xl opacity-10 animate-float text-purple-200">🎹</div>
          <div className="absolute top-1/3 left-1/4 text-3xl opacity-10 animate-float-delayed text-blue-200">🎸</div>
          <div className="absolute top-2/3 right-1/4 text-4xl opacity-10 animate-float-slow text-teal-200">🎤</div>
          <div className="absolute bottom-1/2 left-10 text-5xl opacity-10 animate-float text-purple-200">🎺</div>
          <div className="absolute top-1/2 right-10 text-6xl opacity-10 animate-float-delayed text-blue-200">🎧</div>
        </div>

        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 relative z-10 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1"></div>
            <h1 className="text-4xl font-serif font-bold text-center flex-1 text-[#556FB5]">
              DrLee.App
            </h1>
            <div className="flex-1 flex justify-end">
              <span className="text-xs text-gray-500 italic">Created by Dr. Lee</span>
            </div>
          </div>
          <p className="text-gray-700 mb-2 text-center font-medium">
            Describe your song idea and let AI create it
          </p>
          <p className="text-sm text-gray-500 mb-2 text-center">
            ⏱️ Generation typically takes 2-4 minutes
          </p>
          <div className="mb-4">
            <button
              onClick={() => setShowTips(!showTips)}
              className="w-full text-xs text-[#556FB5] hover:text-[#4ECDC4] transition flex items-center justify-center gap-2"
            >
              <span>💡</span>
              <span className="font-medium">
                {showTips ? 'Hide' : 'Show'} Prompt Tips & Best Practices
              </span>
              <svg 
                className={`w-4 h-4 transition-transform ${showTips ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showTips && (
              <div className="mt-3 p-4 bg-gradient-to-br from-blue-50 to-teal-50 rounded-lg text-left space-y-3 border border-[#4ECDC4]/30">
                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-2">✅ Best Practices:</h3>
                  <ul className="text-xs text-gray-700 space-y-1 ml-4">
                    <li>• Keep prompts <strong>under 200 characters</strong> for best results</li>
                    <li>• Focus on <strong>musical style and mood</strong> (e.g., upbeat jazz)</li>
                    <li>• Describe <strong>instruments and genre</strong> specifically</li>
                    <li>• Use <strong>generic themes</strong> instead of specific names or places</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-2">❌ Avoid:</h3>
                  <ul className="text-xs text-gray-700 space-y-1 ml-4">
                    <li>• Real names of people or specific locations</li>
                    <li>• Violent, explicit, or controversial content</li>
                    <li>• Very long, detailed stories (over 200 chars)</li>
                    <li>• Personal or private information</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-2">🎵 Example Prompts:</h3>
                  <div className="space-y-2">
                    <div className="bg-white p-2 rounded border border-[#4ECDC4]/40 hover:border-[#4ECDC4] transition">
                      <p className="text-xs text-gray-600 italic">An upbeat hip-hop song about new beginnings and confidence</p>
                    </div>
                    <div className="bg-white p-2 rounded border border-[#4ECDC4]/40 hover:border-[#4ECDC4] transition">
                      <p className="text-xs text-gray-600 italic">Smooth jazz ballad with piano, perfect for a romantic evening</p>
                    </div>
                    <div className="bg-white p-2 rounded border border-[#4ECDC4]/40 hover:border-[#4ECDC4] transition">
                      <p className="text-xs text-gray-600 italic">Energetic rock anthem about chasing dreams and never giving up</p>
                    </div>
                    <div className="bg-white p-2 rounded border border-[#4ECDC4]/40 hover:border-[#4ECDC4] transition">
                      <p className="text-xs text-gray-600 italic">Mellow acoustic folk song with themes of nostalgia and home</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 mb-6">
            <button
              onClick={checkCredits}
              className="flex-1 bg-[#4ECDC4] hover:bg-[#4ECDC4]/90 text-white py-2 px-4 rounded-lg font-semibold transition text-sm hover:shadow-md"
            >
              💰 Check Credits {credits !== null && `(${credits})`}
            </button>
            <button
              onClick={loadSongHistory}
              className="flex-1 bg-[#556FB5] hover:bg-[#556FB5]/90 text-white py-2 px-4 rounded-lg font-semibold transition text-sm hover:shadow-md"
            >
              🎵 {showSongs ? 'Hide' : 'Show'} Song History
            </button>
          </div>
          {showSongs && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto border border-gray-200">
              <h3 className="font-bold mb-3 text-gray-800">Your Songs ({songs.length})</h3>
              {songs.length === 0 ? (
                <p className="text-gray-500 text-sm">No songs yet. Generate your first one!</p>
              ) : (
                <div className="space-y-2">
                  {songs.map((song: Song) => (
                    <div key={song.id} className="p-3 bg-white rounded border border-gray-200 flex items-start justify-between hover:border-[#4ECDC4] hover:shadow-sm transition">
                      <div className="flex-1 mr-3">
                        <p className="font-semibold text-sm text-gray-800">{song.title}</p>
                        <p className="text-xs text-gray-500">{new Date(song.createdAt).toLocaleString()}</p>
                        <p className="text-xs text-[#556FB5] break-words">{song.prompt}</p>
                      </div>
                      <button
                        onClick={() => {
                          setAudioUrl(song.audioUrl);
                          setSongTitle(song.title);
                          setCurrentTaskId(song.taskId || '');
                          setCurrentAudioId(song.audioId || '');
                          setCoverImages(song.coverImages || []);
                          setShowSongs(false);
                        }}
                        className="ml-2 px-3 py-1 bg-[#556FB5] hover:bg-[#556FB5]/90 text-white text-xs rounded transition hover:shadow-md"
                      >
                        ▶️ Play
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="space-y-4">
            {/* Tab Buttons */}
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              <button
                onClick={() => setActiveTab('simple')}
                disabled={loading}
                className={`flex-1 py-3 px-4 font-semibold transition flex items-center justify-center gap-2 ${
                  activeTab === 'simple'
                    ? 'bg-[#556FB5] text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>🎵</span>
                <span>Simple</span>
              </button>
              <button
                onClick={() => setActiveTab('custom')}
                disabled={loading}
                className={`flex-1 py-3 px-4 font-semibold transition flex items-center justify-center gap-2 ${
                  activeTab === 'custom'
                    ? 'bg-[#556FB5] text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>✏️</span>
                <span>Custom</span>
              </button>
            </div>

            {/* Shared Options Bar */}
            <div className="flex flex-wrap items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={instrumental}
                  onChange={(e) => setInstrumental(e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4 text-[#556FB5] border-gray-300 rounded focus:ring-[#4ECDC4] cursor-pointer"
                />
                <span className="text-sm text-gray-700 font-medium">🎻 Instrumental (no vocals)</span>
              </label>
              <div className="flex items-center gap-2 ml-auto">
                <label className="text-sm text-gray-700 font-medium">Model:</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value as typeof model)}
                  disabled={loading}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:border-[#4ECDC4] focus:ring-2 focus:ring-[#4ECDC4]/20 focus:outline-none cursor-pointer"
                >
                  <option value="V5">V5 (Recommended)</option>
                  <option value="V4_5PLUS">V4.5 Plus</option>
                  <option value="V4_5ALL">V4.5 All</option>
                  <option value="V4_5">V4.5</option>
                  <option value="V4">V4</option>
                </select>
              </div>
            </div>

            {/* Advanced Voice Options Toggle */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                disabled={loading}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-sm font-medium text-gray-700 transition disabled:opacity-50"
              >
                <span>🎤 Advanced Voice Options</span>
                <svg
                  className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showAdvanced && (
                <div className="p-4 space-y-4 bg-white border-t border-gray-200">
                  {/* Vocal Gender - only show if not instrumental */}
                  {!instrumental && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vocal Gender
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="vocalGender"
                            value=""
                            checked={vocalGender === ''}
                            onChange={() => setVocalGender('')}
                            disabled={loading}
                            className="text-[#556FB5] focus:ring-[#4ECDC4]"
                          />
                          <span className="text-sm text-gray-700">Auto</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="vocalGender"
                            value="m"
                            checked={vocalGender === 'm'}
                            onChange={() => setVocalGender('m')}
                            disabled={loading}
                            className="text-[#556FB5] focus:ring-[#4ECDC4]"
                          />
                          <span className="text-sm text-gray-700">Male</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="vocalGender"
                            value="f"
                            checked={vocalGender === 'f'}
                            onChange={() => setVocalGender('f')}
                            disabled={loading}
                            className="text-[#556FB5] focus:ring-[#4ECDC4]"
                          />
                          <span className="text-sm text-gray-700">Female</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Negative Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Exclude Styles
                    </label>
                    <input
                      type="text"
                      value={negativeTags}
                      onChange={(e) => setNegativeTags(e.target.value)}
                      placeholder="Heavy Metal, Screaming, Autotune"
                      disabled={loading}
                      maxLength={1000}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-800 placeholder:text-gray-400 focus:border-[#4ECDC4] focus:ring-2 focus:ring-[#4ECDC4]/20 focus:outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Comma-separated styles to avoid in generation
                    </p>
                  </div>

                  {/* Style Weight Slider */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Style Strength: {styleWeight.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={styleWeight}
                      onChange={(e) => setStyleWeight(parseFloat(e.target.value))}
                      disabled={loading}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#556FB5]"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Subtle</span>
                      <span>Strong</span>
                    </div>
                  </div>

                  {/* Weirdness Constraint Slider */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Creativity: {weirdnessConstraint.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={weirdnessConstraint}
                      onChange={(e) => setWeirdnessConstraint(parseFloat(e.target.value))}
                      disabled={loading}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#556FB5]"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Conservative</span>
                      <span>Experimental</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Simple Mode Content */}
            {activeTab === 'simple' && (
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A melancholic jazz ballad about coffee shops..."
                  className="w-full h-32 p-4 border-2 border-gray-200 bg-white text-gray-800 placeholder:text-gray-400 rounded-lg focus:border-[#4ECDC4] focus:ring-2 focus:ring-[#4ECDC4]/20 focus:outline-none resize-none"
                  disabled={loading}
                  maxLength={500}
                />
                <div className={`absolute bottom-2 right-2 text-xs font-semibold ${
                  prompt.length > 450 ? 'text-red-500' :
                  prompt.length > 200 ? 'text-orange-500' :
                  'text-gray-400'
                }`}>
                  {prompt.length}/500 {prompt.length > 200 && '⚠️ Long prompts may have issues'}
                </div>
              </div>
            )}

            {/* Custom Mode Content */}
            {activeTab === 'custom' && (
              <div className="space-y-4">
                {/* Title Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="My Song Title"
                    className="w-full p-3 border-2 border-gray-200 bg-white text-gray-800 placeholder:text-gray-400 rounded-lg focus:border-[#4ECDC4] focus:ring-2 focus:ring-[#4ECDC4]/20 focus:outline-none"
                    disabled={loading}
                  />
                </div>

                {/* Style Input */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Style / Genre</label>
                  <input
                    type="text"
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    placeholder="upbeat pop, dance, energetic"
                    className="w-full p-3 border-2 border-gray-200 bg-white text-gray-800 placeholder:text-gray-400 rounded-lg focus:border-[#4ECDC4] focus:ring-2 focus:ring-[#4ECDC4]/20 focus:outline-none"
                    disabled={loading}
                    maxLength={1000}
                  />
                  <p className="text-xs text-gray-500 mt-1">e.g., 'jazz, melancholic, piano' or 'rock, energetic, guitar solo'</p>
                  <div className={`absolute top-9 right-3 text-xs font-semibold ${
                    style.length > 900 ? 'text-red-500' :
                    style.length > 700 ? 'text-orange-500' :
                    'text-gray-400'
                  }`}>
                    {style.length}/1000
                  </div>
                </div>

                {/* Lyrics Textarea - Hidden if instrumental */}
                {!instrumental && (
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lyrics</label>
                    <textarea
                      value={lyrics}
                      onChange={(e) => setLyrics(e.target.value)}
                      placeholder={`[Verse 1]\nWalking down the street...\n\n[Chorus]\nThis is my song...`}
                      className="w-full h-40 p-4 border-2 border-gray-200 bg-white text-gray-800 placeholder:text-gray-400 rounded-lg focus:border-[#4ECDC4] focus:ring-2 focus:ring-[#4ECDC4]/20 focus:outline-none resize-none font-mono text-sm"
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-500 mt-1">Use [Verse], [Chorus], [Bridge] tags to structure your lyrics</p>
                  </div>
                )}

                {instrumental && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-purple-700 text-sm flex items-center gap-2">
                      <span>🎻</span>
                      <span>Instrumental mode enabled - no lyrics needed</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={generateSong}
              disabled={loading}
              className={`w-full text-white py-4 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg ${
                loading ? 'bg-gray-400' : 'bg-[#556FB5] hover:bg-[#556FB5]/90'
              }`}
            >
              {loading ? 'Creating your song...' : 'Generate Song'}
            </button>
          </div>
          {loading && statusMessage && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
              <div className="flex items-center space-x-3">
                <svg className="animate-spin h-5 w-5 text-[#556FB5]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-gray-700">{statusMessage}</span>
              </div>
            </div>
          )}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <div className="whitespace-pre-line">{error}</div>
            </div>
          )}
          {audioUrl && (
            <div className="p-6 bg-green-50 border border-green-200 rounded-lg space-y-4">
              <p className="text-green-800 font-semibold text-lg">{songTitle}</p>
              
              {/* Track selector if multiple tracks available */}
              {generatedTracks.length > 1 && (
                <div className="flex gap-2">
                  {generatedTracks.map((track, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedTrackIndex(index);
                        setAudioUrl(track.audioUrl);
                        setSongTitle(track.title || `Song ${index + 1}`);
                        setCurrentAudioId(track.audioId || '');
                        // Switch to this track's cover art
                        if (track.imageUrl) {
                          setCoverImages([track.imageUrl]);
                        }
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg font-semibold transition ${
                        selectedTrackIndex === index
                          ? 'bg-green-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      🎵 Version {index + 1}
                      {track.duration && (
                        <span className="text-xs ml-1">({Math.floor(track.duration)}s)</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              
              <audio ref={audioRef} controls className="w-full" src={audioUrl}>
                Your browser does not support audio playback.
              </audio>
              {coverImages.length > 0 && (
                <div className="flex justify-center">
                  <img
                    src={coverImages[0]}
                    alt="Album Cover"
                    className="max-w-md w-full rounded-lg shadow-lg hover:shadow-xl transition"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => generateCover(currentTaskId)}
                  disabled={coverGenerating || !currentTaskId || coverImages.length > 0}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition flex items-center justify-center space-x-2 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>🎨</span>
                  <span>{coverGenerating ? 'Creating Cover...' : coverImages.length > 0 ? 'Cover Ready' : 'Create Cover Art'}</span>
                </button>
                <button
                  onClick={generateVideo}
                  disabled={videoGenerating || !currentTaskId || !currentAudioId}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition flex items-center justify-center space-x-2 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>🎬</span>
                  <span>{videoGenerating ? 'Creating Video...' : videoUrl ? 'Video Ready ✓' : 'Create Video'}</span>
                </button>
              </div>
              {coverGenerating && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-purple-700 text-sm">
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{statusMessage || '🎨 Creating cover art...'}</span>
                  </div>
                </div>
              )}
              {videoGenerating && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{statusMessage || '🎬 Preparing your video...'}</span>
                  </div>
                </div>
              )}
              {videoUrl && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 font-semibold mb-3">🎬 Video Ready!</p>
                  <video controls className="w-full rounded-lg" src={videoUrl}>
                    Your browser does not support video playback.
                  </video>
                </div>
              )}
              {currentTaskId && currentAudioId && (
                <LyricsDisplay
                  taskId={currentTaskId}
                  audioId={currentAudioId}
                  apiKey={apiKey}
                  audioRef={audioRef.current}
                />
              )}
            </div>
          )}
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Created with ❤️ by <span className="font-semibold text-[#556FB5]">Dr. Lee</span>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
