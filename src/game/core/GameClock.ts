export class GameClock {
  private lastTime: number = performance.now();
  private isRunning: boolean = false;
  private timeScale: number = 1.0;

  public start() {
    this.lastTime = performance.now();
    this.isRunning = true;
  }

  public stop() {
    this.isRunning = false;
  }

  public getDelta(): number {
    if (!this.isRunning) return 0;
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1) * this.timeScale;
    this.lastTime = now;
    return dt;
  }

  public setTimeScale(scale: number) {
    this.timeScale = Math.max(0.1, scale);
  }
}
