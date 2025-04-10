"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mic, Square, Play, Pause, Volume2, Coins } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Slider } from "@/components/ui/slider";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";

interface RecordAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RecordAudioModal({ isOpen, onClose }: RecordAudioModalProps) {
  const [title, setTitle] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState<number[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  const { toast } = useToast();
  const router = useRouter();
  const userTokens = useQuery(api.tokens.getUserTokens);
  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const savePost = useMutation(api.posts.savePost);

  // Clean up when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopRecording();
      setTitle("");
      setRecordingTime(0);
      setAudioBlob(null);
      setAudioUrl(null);
      setIsPlaying(false);
      setAudioLevel([]);
      setDuration(0); // Reset duration
      setCurrentTime(0); // Reset current time

      // Clean up audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Clean up mic stream
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
      }
    }
  }, [isOpen]);

  // Update timer during recording
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  // Clean up audio URL when component unmounts
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Handle audio element setup and events
  useEffect(() => {
    if (!audioRef.current || !audioUrl) return;

    const audio = audioRef.current;

    // Reset state when audio changes
    setCurrentTime(0);

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      console.log("Audio loaded, duration:", audio.duration);
      // Only set duration from audio element if it's a valid number
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      } else {
        // If duration is not valid, use recording time as fallback
        console.log("Using recording time as fallback duration:", recordingTime);
        setDuration(recordingTime);
      }
    };

    const handleCanPlay = () => {
      console.log("Audio can play, duration:", audio.duration);
      // Double-check duration again
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      } else if (duration <= 0) {
        // Still no valid duration, use recording time
        console.log("Still no valid duration, using recording time:", recordingTime);
        setDuration(recordingTime);
      }
    };

    // Add event listeners
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('durationchange', () => {
      // Handle any duration changes
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        console.log("Duration changed to:", audio.duration);
        setDuration(audio.duration);
      }
    });

    // If the audio is already loaded (from browser cache)
    if (audio.readyState >= 3) { // HAVE_FUTURE_DATA or higher
      handleCanPlay();
    } else if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
      handleLoadedMetadata();
    }

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('durationchange', () => { });
    };
  }, [audioUrl, recordingTime]);

  const startRecording = async () => {
    try {
      // Reset audio levels
      setAudioLevel([]);

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      // Set up audio context and analyzer for visualization
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Start visualizing microphone input
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      // Create a separate function for visualization that doesn't depend on isRecording state
      const visualizeMic = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average volume level (0-100)
        const average = Array.from(dataArray).reduce((sum, value) => sum + value, 0) / dataArray.length;
        const normalizedVolume = Math.min(100, Math.max(0, average * 2.5)); // Scale for better visualization

        // Keep a history of levels for visualization
        setAudioLevel(prev => {
          const newLevels = [...prev, normalizedVolume];
          // Keep only the last 20 levels
          return newLevels.slice(-20);
        });
      };

      // Set up animation frame loop
      let animationId: number | null = null;
      const updateMicVisualization = () => {
        visualizeMic();
        animationId = requestAnimationFrame(updateMicVisualization);
      };

      // Start the visualization loop
      updateMicVisualization();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Define the onstop handler
      mediaRecorder.onstop = () => {
        // Cancel the animation frame
        if (animationId) {
          cancelAnimationFrame(animationId);
          animationId = null;
        }
        // Determine the correct MIME type
        let mimeType = 'audio/mpeg';
        if (!MediaRecorder.isTypeSupported('audio/mpeg')) {
          mimeType = 'audio/webm;codecs=opus';
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Store the recording time as a fallback duration
        const recordedDuration = recordingTime;
        console.log("Recording stopped, duration:", recordedDuration);

        // Set initial duration to recording time
        setDuration(recordedDuration);

        setAudioBlob(audioBlob);
        setAudioUrl(audioUrl);

        // Clear visualization
        setAudioLevel([]);

        // Clean up audio context
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }

        // Stop all tracks from the stream
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach(track => track.stop());
          micStreamRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast({
        title: "Microphone Access Error",
        description: "Please allow microphone access to record audio.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioLevel([]); // Clear visualization
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }

    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current || !audioUrl) return;
    if (!value.length || !Number.isFinite(value[0])) return;

    const newTime = value[0];

    // Get the effective duration (either from audio or from recording time)
    const effectiveDuration = getEffectiveDuration();

    // Ensure the value is within valid range
    const safeTime = Math.max(0, Math.min(newTime, effectiveDuration));

    try {
      audioRef.current.currentTime = safeTime;
      setCurrentTime(safeTime);
    } catch (error) {
      console.error('Error setting currentTime:', error);
    }
  };

  // Function to get an effective, valid duration
  const getEffectiveDuration = (): number => {
    // If we have a valid audio duration, use it
    if (audioRef.current && Number.isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
      return audioRef.current.duration;
    }

    // Otherwise, use the recording time
    return recordingTime > 0 ? recordingTime : 1; // Fallback to at least 1 second
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds)) {
      seconds = 0;
    }

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSubmit = async () => {
    if (!audioBlob) {
      toast({
        title: "No Recording",
        description: "Please record some audio before posting.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please add a title for your audio post.",
        variant: "destructive",
      });
      return;
    }

    // Check if user has enough tokens
    if (!userTokens || userTokens.tokens < 1) {
      toast({
        title: "Not Enough Tokens",
        description: "You need at least 1 token to create a post. Please purchase more tokens.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Get the upload URL from Convex
      const {
        uploadUrl,
        userId,
        userName,
        userImage,
        userDocId,
        currentTokens
      } = await generateUploadUrl({
        title: title.trim(),
        duration: getEffectiveDuration(),
      });

      // Step 2: Upload the actual file to Convex storage
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": audioBlob.type || 'audio/mpeg',
        },
        body: audioBlob,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload audio file");
      }

      // Step 3: Get the storage ID from the response
      const { storageId } = await uploadResponse.json();

      // Step 4: Save the post with the storage ID
      await savePost({
        title: title.trim(),
        storageId,
        duration: getEffectiveDuration(),
        userId,
        userName,
        userImage,
        userDocId,
        currentTokens,
      });

      toast({
        title: "Success!",
        description: "Your audio post has been created.",
      });

      // Refresh the posts page
      router.refresh();

      onClose();
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Error",
        description: typeof error === 'object' && error !== null && 'message' in error
          ? String(error.message)
          : "Failed to create your audio post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Audio Post</DialogTitle>
          <DialogDescription>
            Record a short audio clip to share with others.
          </DialogDescription>
          {/* Token balance indicator */}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
              <Coins className="h-4 w-4" />
              <span>
                {userTokens === undefined ? "Loading..." :
                  userTokens === null ? "Sign in to view tokens" :
                    `${userTokens.tokens} Token${userTokens.tokens !== 1 ? "s" : ""}`}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              Creating a post costs 1 token
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Give your audio post a title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex flex-col items-center justify-center space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
            {/* Recording timer */}
            <div className="text-2xl font-mono">
              {formatTime(recordingTime)}
            </div>

            {/* Microphone visualization */}
            <div className="w-full h-12 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex items-end justify-center gap-1 p-1">
              {isRecording ? (
                // Show active visualization during recording
                audioLevel.map((level, index) => (
                  <div
                    key={index}
                    className="w-2 bg-blue-500 dark:bg-blue-400 rounded-t transition-all duration-75"
                    style={{
                      height: `${level}%`,
                      opacity: (index / audioLevel.length) * 0.5 + 0.5 // Fade out older bars
                    }}
                  />
                ))
              ) : audioUrl ? (
                // Show static waveform for recorded audio
                Array.from({ length: 20 }).map((_, index) => (
                  <div
                    key={index}
                    className="w-2 bg-green-500 dark:bg-green-400 rounded-t"
                    style={{
                      height: `${Math.sin((index / 20) * Math.PI) * 70 + 10}%`
                    }}
                  />
                ))
              ) : (
                // Show empty bars when not recording and no audio
                Array.from({ length: 20 }).map((_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="w-2 bg-gray-300 dark:bg-gray-700 rounded-t"
                    style={{ height: '10%' }}
                  />
                ))
              )}
            </div>

            {/* Recording controls */}
            <div className="flex items-center gap-4">
              {!isRecording && !audioUrl && (
                <Button
                  onClick={startRecording}
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-full bg-red-100 hover:bg-red-200 text-red-600"
                >
                  <Mic className="h-6 w-6" />
                </Button>
              )}

              {isRecording && (
                <Button
                  onClick={stopRecording}
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-full bg-red-100 hover:bg-red-200 text-red-600"
                >
                  <Square className="h-6 w-6" />
                </Button>
              )}

              {audioUrl && !isRecording && (
                <Button
                  onClick={togglePlayback}
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600"
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6" />
                  )}
                </Button>
              )}
            </div>

            {/* Audio playback controls */}
            {audioUrl && !isRecording && (
              <div className="w-full space-y-2">
                {/* Always show controls, use recording time as fallback if needed */}
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{formatTime(Math.floor(currentTime))}</span>
                  <span>{formatTime(Math.floor(getEffectiveDuration()))}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-gray-500" />
                  <Slider
                    value={[Math.min(currentTime, getEffectiveDuration())]}
                    min={0}
                    max={getEffectiveDuration()}
                    step={0.01}
                    onValueChange={handleSeek}
                    className="w-full"
                    aria-label="Audio position"
                  />
                </div>
              </div>
            )}

            {/* Audio playback element */}
            {audioUrl && (
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={handleAudioEnded}
                preload="auto"
                className="hidden"
              />
            )}

            {/* Recording status */}
            <div className="text-sm text-gray-500">
              {isRecording ? (
                <span className="flex items-center">
                  <span className="h-2 w-2 rounded-full bg-red-500 mr-2 animate-pulse"></span>
                  Recording...
                </span>
              ) : audioUrl ? (
                "Recording complete. Click play to preview."
              ) : (
                "Click the microphone to start recording."
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex space-x-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!audioBlob || isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <span className="h-2 w-2 rounded-full bg-white mr-2 animate-pulse"></span>
                Posting...
              </span>
            ) : (
              "Post Audio"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}