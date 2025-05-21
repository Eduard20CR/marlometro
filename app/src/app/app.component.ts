import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import JSConfetti from 'js-confetti';
import { FormsModule } from '@angular/forms';
import { SettingsIconComponent } from './settings-icon/settings-icon.component';

@Component({
  selector: 'app-root',
  imports: [FormsModule, SettingsIconComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  maxVolume = signal(0);
  currentVolume = signal(0);
  difficulty = signal(1.0);
  hasWon = signal(false);
  isCalibrating = signal(true);
  requestId = signal<number | null>(null);
  showOptions = signal(false);

  constructor() { }

  ngOnInit(): void {
    this.getMic();
  }

  ngOnDestroy(): void {
    const requestId = this.requestId();
    if (requestId) {
      cancelAnimationFrame(requestId);
    }
  }

  getMic(): void {
    const getVolume = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioCtx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
        const micSource = audioCtx.createMediaStreamSource(stream);

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        micSource.connect(analyser);

        const updateVolume = () => {
          analyser.getByteTimeDomainData(dataArray);

          let sumSquares = 0;
          for (let i = 0; i < bufferLength; i++) {
            let normalized = (dataArray[i] - 128) / 128;
            sumSquares += normalized * normalized;
          }

          const rms = Math.sqrt(sumSquares / bufferLength);
          this.currentVolume.set(rms);

          // During calibration
          if (this.isCalibrating() && rms > this.maxVolume()) {
            this.maxVolume.set(rms);
          }

          // Game
          if (!this.isCalibrating() && rms >= this.maxVolume() * this.difficulty()) {
            this.showConfetti();
            this.hasWon.set(true);
          }

          this.requestId.set(requestAnimationFrame(updateVolume));
        };

        updateVolume();
      } catch (err) {
        console.error("Error accediendo al micrófono", err);
      }
    };

    getVolume();
  }

  handleCalibrate(): void {
    this.maxVolume.set(0);
    this.hasWon.set(false);
    this.isCalibrating.set(true);

    setTimeout(() => {
      this.isCalibrating.set(false);
      console.log("✅ Calibración completada");
    }, 3000); // Calibrar por 3 segundos
  }

  showConfetti(): void {
    if (this.hasWon()) return;

    const jsConfetti = new JSConfetti();

    jsConfetti.addConfetti();
    jsConfetti.addConfetti({ emojis: ['🌈', '⚡️', ' 💥', '✨', '💫', '🌸'], })
    jsConfetti.addConfetti({ confettiColors: ['#ff0a54 ', '#ff477e', '#ff7096', '#ff85a1', '#fbb1bd', '#f9bec7',], })
  }

  toggleOptions(): void {
    this.showOptions.set(!this.showOptions());
  }

  public getBarHeight(): string {
    return Math.min((this.currentVolume() / (this.maxVolume() * this.difficulty())) * 100, 100) + '%';
  }

  public handleSetWonToFalse(): void {
    this.hasWon.set(false);
  }

  handleSetMaxVolume(value: number): void {
    this.maxVolume.set(value);
  }
}
