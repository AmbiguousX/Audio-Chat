"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface AudioPostCardProps {
  postId: Id<"posts">;
}

export default function AudioPostCard({ postId }: AudioPostCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioReady, setAudioReady] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Fetch post data
  const post = useQuery(api.posts.getPost, { postId });
  const audioUrl = useQuery(api.posts.getAudioUrl, { postId });
  
  // Handle audio element setup and events
  useEffect(() => {
    if (!audioRef.current || !audioUrl) return;
    
    const audio = audioRef.current;
    
    // Reset state when audio changes
    setCurrentTime(0);
    setAudioReady(false);
    
    const updateTime = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const handleLoadedMetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        setAudioReady(true);
      }
    };
    
    const handleCanPlay = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        setAudioReady(true);
      }
    };
    
    // Add event listeners
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    
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
    };
  }, [audioUrl]);
  
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
    if (!audioRef.current || !audioUrl || !audioReady) return;
    if (!value.length || !Number.isFinite(value[0])) return;
    
    const newTime = value[0];
    const audioDuration = audioRef.current.duration;
    
    // Double-check that we have a valid audio duration
    if (!Number.isFinite(audioDuration) || audioDuration <= 0) {
      console.warn('Invalid audio duration, cannot seek');
      return;
    }
    
    // Ensure the value is within valid range
    const safeTime = Math.max(0, Math.min(newTime, audioDuration));
    
    try {
      audioRef.current.currentTime = safeTime;
      setCurrentTime(safeTime);
    } catch (error) {
      console.error('Error setting currentTime:', error);
    }
  };
  
  const handleAudioEnded = () => {
    setIsPlaying(false);
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  if (!post) {
    return (
      <Card className="w-full max-w-3xl mx-auto mb-4 animate-pulse">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded mt-2"></div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="w-full h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full max-w-3xl mx-auto mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarImage src={post.userImage || undefined} alt={post.userName} />
            <AvatarFallback>{post.userName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{post.userName}</div>
            <div className="text-sm text-gray-500">
              {new Date(post.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
        <h3 className="text-lg font-semibold mt-2">{post.title}</h3>
      </CardHeader>
      
      <CardContent className="pb-2">
        {/* Audio visualization */}
        <div className="w-full h-20 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
          <div className="w-full h-full flex items-end justify-center gap-1 p-1">
            {Array.from({ length: 20 }).map((_, index) => (
              <div
                key={index}
                className={`w-2 rounded-t transition-all duration-75 ${
                  index / 20 < currentTime / duration
                    ? "bg-blue-500 dark:bg-blue-400"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
                style={{
                  height: `${Math.sin((index / 20) * Math.PI) * 70 + 10}%`
                }}
              />
            ))}
          </div>
        </div>
        
        {/* Audio controls */}
        <div className="mt-4 flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={togglePlayback}
            disabled={!audioUrl}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          
          <div className="flex-1">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration || post.duration)}</span>
            </div>
            
            {duration > 0 && (
              <Slider
                value={[Math.min(currentTime, duration)]}
                min={0}
                max={duration}
                step={0.01}
                onValueChange={handleSeek}
                className="w-full"
                aria-label="Audio position"
              />
            )}
          </div>
          
          <Volume2 className="h-4 w-4 text-gray-500 ml-2" />
        </div>
      </CardContent>
      
      {/* Hidden audio element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={handleAudioEnded}
          preload="auto"
          className="hidden"
        />
      )}
    </Card>
  );
}
