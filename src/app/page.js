'use client';
import { useState, useRef, useEffect } from 'react';
import { MdDeleteOutline } from "react-icons/md";
import { MdOutlineCloudDownload } from "react-icons/md";
import { LuNetwork } from "react-icons/lu";
import { PiPlaylistLight } from "react-icons/pi";
import Wavify from 'react-wavify';  // Import react-wavify

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [audioData, setAudioData] = useState(null);
  const [amplitude, setAmplitude] = useState(40); 
  const [frequencyAmplitude, setFrequencyAmplitude] = useState(40); 
  const [waveformType, setWaveformType] = useState("Amplitude");
  const [rectangleHeight, setRectangleHeight] = useState(0);  

  const audioChunks = useRef([]);
  const mediaRecorderRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const dataArray = useRef(new Uint8Array(2048)); 
  const frequencyData = useRef(new Uint8Array(2048));

  useEffect(() => {
    if (isRecording && !isPaused && analyserRef.current) {
      updateWaveform();
    }
  }, [isRecording, isPaused]);

  const startRecordingCountdown = () => {
    setCountdown(3);
    setRectangleHeight(0); 
    let count = 3;
    const countdownInterval = setInterval(() => {
      count -= 1;
      setCountdown(count);
      setRectangleHeight((3 - count) * (window.innerHeight / 5)); 
      if (count === 0) {
        clearInterval(countdownInterval);
        setCountdown(null);
        setIsRecording(true);
        startRecorder();
      }
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsPaused(false);
  };

  const togglePauseResume = () => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  const startRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioData(audioUrl);
        audioChunks.current = [];
      };

      // start the recording
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  
  const updateWaveform = () => {
    const analyser = analyserRef.current;

    const update = () => {
      if (!isPaused && analyser) {
        analyser.getByteTimeDomainData(dataArray.current);
        const averageAmplitude = dataArray.current.reduce((sum, value) => sum + value, 0) / dataArray.current.length;
        setAmplitude(averageAmplitude); 

        analyser.getByteFrequencyData(frequencyData.current);
        const averageFrequencyAmplitude = frequencyData.current.reduce((sum, value) => sum + value, 0) / frequencyData.current.length;
        setFrequencyAmplitude((averageFrequencyAmplitude) * 10); 
      }
      requestAnimationFrame(update); 
    };
    update(); 
  };

  const deleteRecordingAndReset = () => {
    setAudioData(null);
    setIsRecording(false);
  };

  const downloadRecording = () => {
    if (audioData) {
      const a = document.createElement('a');
      a.href = audioData;
      a.download = 'audio.wav';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  console.log("isRec", isRecording);

  return (
    <>
      {/* Rectangle animation during countdown */}
      {countdown !== null && (
        <div 
          className="rectangle absolute bottom-0 left-0 w-full transition-all duration-1000 ease-in-out" 
          style={{ height: `${rectangleHeight}px` }}
        />
      )}

      {!isPaused && isRecording && (
        <div className="absolute left-0 top-80 w-full z-0">
          <Wavify
            fill="#ffb98a"
            paused={false}
            style={{ height: "600px" }}
            options={{
              height: 75,
              amplitude: waveformType === "Amplitude" ? amplitude : frequencyAmplitude,  
              speed: 0.25,
              bones: 5
            }}
          />
        </div>
      )}

      <div className="flex justify-center flex-col items-center w-screen h-screen">
        {!isRecording && !countdown && (
          <>
            <p className='babble-text'>Babble</p>
            <div className='container'>
            <button onClick={startRecordingCountdown} className='button'>
              Babble
            </button>
            </div>
            <div className='flex gap-6 mt-[-25px]'>
              <button onClick={startRecordingCountdown} className='button-sm'>
                <LuNetwork size={23} />
              </button>
              <button onClick={startRecordingCountdown} className='button-sm'>
                <PiPlaylistLight size={25} />
              </button>
            </div>
          </>
        )}

        {countdown && <div className="recording">{countdown}</div>}

        {isRecording && !countdown && (
          <div className='flex justify-center z-10 relative'>
            <div className='flex flex-col justify-center items-center'>
              <div className='flex justify-center items-center gap-20'>
                <div className='flex flex-col justify-center items-center gap-20'>
                  <button onClick={isPaused ? stopRecording : togglePauseResume} className='stop-btn'>
                    {isPaused ? 'Done' : 'Stop'}
                  </button>
                </div>
              </div>
              <div className='flex gap-5'>
                <div className='delete' onClick={deleteRecordingAndReset}><MdDeleteOutline size={25} /></div>
              </div>
            </div>
            {isPaused && <button onClick={togglePauseResume} className='resume'>
              Resume
            </button>}
          </div>
        )}

        {audioData && <div className='download z-2' onClick={downloadRecording}><MdOutlineCloudDownload size={25} /></div>}
        {<div className='dropdown inline-block text-left w-44'>
          <div>
            <select
              className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-opacity-50 focus:border-blue-500 bg-white text-gray-900"
              onChange={(e) => {
                const selectedType = e.target.value;
                setWaveformType(selectedType); 
                downloadRecording(selectedType);
              }}
              defaultValue="" 
            >
              <option value="" disabled hidden>Waveform type</option> 
              <option value="Amplitude">Amplitude-Based</option>
              <option value="Frequency">Frequency-Based</option>
            </select>
          </div>
        </div>}
      </div>
    </>
  );
}
