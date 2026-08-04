export class GameLoop {
  private frameId: number | null = null;
  private running = false;

  constructor(private readonly frame: () => void) {}

  public start() {
    if (this.running) return;
    this.running = true;
    const run = () => {
      if (!this.running) return;
      this.frame();
      this.frameId = requestAnimationFrame(run);
    };
    this.frameId = requestAnimationFrame(run);
  }

  public stop() {
    this.running = false;
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
  }
}
