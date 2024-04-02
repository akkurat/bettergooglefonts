export class Timer {
    start!: number;

    constructor() {
        this.reset();
    }
    public reset() {
        this.start = Date.now();
    }

    measure() {
        return Date.now() - this.start;
    }


}