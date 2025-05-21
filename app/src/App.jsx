import { useEffect, useRef, useState } from "react";
import SettingsIcon from "./icons/settings";
import JSConfetti from 'js-confetti'

function App() {
  const [maxVolume, setMaxVolume] = useState(0);
  const [currentVolume, setCurrentVolume] = useState(0);
  const [difficulty, setDifficulty] = useState(1.0);
  const [hasWon, setHasWon] = useState(false);
  const isCalibrating = useRef(true);
  const requestId = useRef(null);

  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    const getMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const micSource = audioCtx.createMediaStreamSource(stream);

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        micSource.connect(analyser);

        const getVolume = () => {
          analyser.getByteTimeDomainData(dataArray);

          let sumSquares = 0;
          for (let i = 0; i < bufferLength; i++) {
            let normalized = (dataArray[i] - 128) / 128;
            sumSquares += normalized * normalized;
          }

          const rms = Math.sqrt(sumSquares / bufferLength);
          setCurrentVolume(rms);

          // Durante calibración
          if (isCalibrating.current && rms > maxVolume) {
            setMaxVolume(rms);
          }

          // Juego
          if (!isCalibrating.current && rms >= maxVolume * difficulty) {
            setHasWon(true);
            showConffeti();
          }

          requestId.current = requestAnimationFrame(getVolume);
        };

        getVolume();
      } catch (err) {
        console.error("Error accediendo al micrófono", err);
      }
    };

    getMic();

    return () => {
      cancelAnimationFrame(requestId.current);
    };
  }, [difficulty, maxVolume]);

  const handleCalibrate = () => {
    setMaxVolume(0);
    setHasWon(false);
    isCalibrating.current = true;

    setTimeout(() => {
      isCalibrating.current = false;
      console.log("✅ Calibración completada");
    }, 3000); // Calibrar por 3 segundos
  };

  const showConffeti = () => {
    const jsConfetti = new JSConfetti()
    jsConfetti.addConfetti()
  }

  return (
    <div>
      <div className="absolute top-4 right-4 z-50" onClick={() => setShowOptions(!showOptions)}>
        <SettingsIcon></SettingsIcon>
      </div>
      {showOptions && (
        <div className="absolute right-4 top-4 bg-white p-4 rounded shadow-lg z-40 min-h-40 w-full max-w-2/3">
          <h2 className="text-xl font-bold  uppercase mb-3">Opciones</h2>

          <div className="mb-5 font-bold">
            <label className="block mb-2">Calibrar volumen máximo:</label>
            {
              isCalibrating.current ? (
                <p className="text-green-500">Calibrando...</p>
              ) : (
                <p className="text-red-500">Presiona el botón para calibrar</p>
              )
            }
            <button className="bg-blue-500 text-white p-2 rounded" onClick={handleCalibrate}>Calibrar</button>

          </div>
          <div className="mb-5 font-bold">
            <label className="block mb-2">Dificultad: {difficulty}x</label>
            <input
              className="w-full"
              type="range"
              min="1"
              max="2"
              step="0.1"
              value={difficulty}
              onChange={(e) => {
                setHasWon(false);
                setDifficulty(parseFloat(e.target.value));
              }}
            />
          </div>

          <div>
            <label className="mb-5 font-bold">Stats</label>
            <p>Volumen actual: {currentVolume.toFixed(3)}</p>
            <p>Volumen máximo calibrado: {maxVolume.toFixed(3)}</p>
            <p>Umbral para ganar: {(maxVolume * difficulty).toFixed(3)}</p>
          </div>
        </div>
      )}

      <h1 className="text-center text-4xl uppercase font-bold mt-10 mb-10">Marlomentro</h1>

      <div className="">
        <div className="flex flex-col items-center">

          <div
            className="max-w-10 w-full h-[50vh] bg-gray-300 rounded-2xl overflow-hidden relative"
          >
            <div
              className="w-full bg-red-600 transition duration-1000 bottom-0 absolute"
              style={{ height: `${Math.min((currentVolume / (maxVolume * difficulty)) * 100, 100)}%` }}
            />
          </div>
        </div>

        {hasWon && <h2 style={{ color: "green" }}>🎉 ¡Ganaste! 🎉</h2>}
      </div>
    </div>
  );
}

export default App;
