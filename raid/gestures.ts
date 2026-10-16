import type { Point } from './engine';

/** Pointer-up is the only deployment trigger. A drag or any multi-touch cancels it. */
export class DeploymentGesture {
  private pointers = new Map<number, { start: Point; last: Point; canceled: boolean }>();
  begin(id: number, p: Point) {
    if (this.pointers.size) for (const pointer of this.pointers.values()) pointer.canceled = true;
    this.pointers.set(id, { start: p, last: p, canceled: this.pointers.size > 0 });
  }
  move(id: number, p: Point) {
    const pointer = this.pointers.get(id); if (!pointer) return null;
    if (Math.hypot(p.x - pointer.start.x, p.y - pointer.start.y) > 8) pointer.canceled = true;
    const delta = { x: p.x - pointer.last.x, y: p.y - pointer.last.y }; pointer.last = p;
    return pointer.canceled && this.pointers.size === 1 ? delta : null;
  }
  release(id: number, p: Point) {
    this.move(id, p); const pointer = this.pointers.get(id); this.pointers.delete(id);
    return !!pointer && !pointer.canceled;
  }
  cancel(id: number) { this.pointers.delete(id); for (const p of this.pointers.values()) p.canceled = true; }
  get count() { return this.pointers.size; }
}
