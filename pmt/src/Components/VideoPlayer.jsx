import React, { useRef, useState } from 'react';

const VideoPlayer = () => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayPause = () => {
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (event) => {
    videoRef.current.volume = event.target.value;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <video ref={videoRef} width="600" controls={false} style={{ border: '1px solid #ccc' }}>
        <source src="example-video.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div>
        <button onClick={handlePlayPause}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>
      <div>
        <label htmlFor="volume">Volume: </label>
        <input
          id="volume"
          type="range"
          min="0"
          max="1"
          step="0.1"
          onChange={handleVolumeChange}
          defaultValue="0.5"
        />
      </div>
    </div>
  );
};

export default VideoPlayer;
