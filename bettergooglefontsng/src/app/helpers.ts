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


const lesNumbres = {
    0: "zero", 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine"
}

export const replaceNumbersByText = (s: string) => s.replaceAll(
    / \d/, m => ' ' + lesNumbres[m]
)