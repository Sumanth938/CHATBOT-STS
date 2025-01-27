import React, { useState, useRef } from "react";

const SpeechToSpeech = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [isLoading, setIsLoading] = useState(false); // New loading state
  const mediaRecorderRef = useRef(null);
  const audioChunks = useRef([]);
  const DEEPGRAM_API_KEY = process.env.REACT_APP_DEEPGRAM_API_KEY;

  // Start recording user speech
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("Media recording is not supported in this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      audioChunks.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        if (audioChunks.current.length === 0) {
          console.error("No audio data recorded.");
          return;
        }

        stream.getTracks().forEach((track) => track.stop()); // Release the stream
        processRecording();
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Upload and transcribe audio using Deepgram
  const transcribeWithDeepgram = async (audioBlob) => {
    try {
      const response = await fetch("https://api.deepgram.com/v1/listen", {
        method: "POST",
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
          "Content-Type": "audio/webm",
        },
        body: audioBlob,
      });

      const data = await response.json();

      if (data.results) {
        return data.results.channels[0].alternatives[0].transcript;
      } else {
        throw new Error("Transcription failed");
      }
    } catch (error) {
      console.error("Error transcribing audio:", error);
      return "Error processing transcription.";
    }
  };

  // Process recording: convert audio to text and text to speech
  const processRecording = async () => {
    setIsLoading(true); // Set loading state before processing

    const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });

    try {
      const transcription = await transcribeWithDeepgram(audioBlob);
      setTranscriptionText(transcription);
      speakText(transcription);
    } catch (error) {
      console.error("Error processing recording:", error);
      setTranscriptionText("Sorry, I couldn't process your speech.");
    } finally {
      setIsLoading(false); // Reset loading state after processing
    }
  };

  // Convert text to speech using SpeechSynthesis API
  const speakText = (text) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    synth.speak(utterance);
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Speech-to-Speech Converter</h1>
      <button
        onClick={isRecording ? stopRecording : startRecording}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          cursor: "pointer",
          backgroundColor: isRecording ? "red" : "green",
          color: "white",
        }}
      >
        {isRecording ? "Stop Recording" : "Start Recording"}
      </button>
      <div style={{ marginTop: "20px" }}>
        <strong>Transcription:</strong>
        <p>{isLoading ? "Converting..." : transcriptionText || "Press 'Start Recording' to speak."}</p>
      </div>
      {isLoading && <p>Processing your speech, please wait...</p>} {/* Loading text */}
    </div>
  );
};

export default SpeechToSpeech;
