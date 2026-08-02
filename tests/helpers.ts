import { expect, type Page } from "@playwright/test";

const silentWav = (() => {
  const sampleRate = 8_000;
  const samples = sampleRate;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(samples * 2, 40);
  return wav;
})();

/**
 * Keep browser tests deterministic and offline: the player sees realistic
 * media events without downloading 1,330 MP3 files from production storage.
 */
export async function installMediaMock(page: Page) {
  await page.addInitScript(() => {
    const currentTimes = new WeakMap<HTMLMediaElement, number>();
    const playing = new WeakSet<HTMLMediaElement>();

    class MockSpeechSynthesisUtterance {
      text: string;
      lang = "";
      rate = 1;
      onend: ((event: SpeechSynthesisEvent) => unknown) | null = null;
      onerror: ((event: SpeechSynthesisErrorEvent) => unknown) | null = null;

      constructor(text: string) {
        this.text = text;
      }
    }

    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: MockSpeechSynthesisUtterance,
    });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        cancel() {},
        speak(utterance: MockSpeechSynthesisUtterance) {
          queueMicrotask(() => utterance.onend?.(new Event("end") as SpeechSynthesisEvent));
        },
      },
    });

    Object.defineProperties(HTMLMediaElement.prototype, {
      paused: {
        configurable: true,
        get() {
          return !playing.has(this);
        },
      },
      duration: {
        configurable: true,
        get() {
          return 60;
        },
      },
      currentTime: {
        configurable: true,
        get() {
          return currentTimes.get(this) ?? 0;
        },
        set(value: number) {
          currentTimes.set(this, Number(value) || 0);
        },
      },
    });

    HTMLMediaElement.prototype.load = function load() {
      currentTimes.set(this, 0);
      queueMicrotask(() => this.dispatchEvent(new Event("loadedmetadata")));
    };

    HTMLMediaElement.prototype.play = function play() {
      playing.add(this);
      queueMicrotask(() => {
        this.dispatchEvent(new Event("loadedmetadata"));
        this.dispatchEvent(new Event("playing"));
      });
      return Promise.resolve();
    };

    HTMLMediaElement.prototype.pause = function pause() {
      playing.delete(this);
      queueMicrotask(() => this.dispatchEvent(new Event("pause")));
    };
  });

  await page.route(/\.mp3(?:\?.*)?$/, (route) =>
    route.fulfill({ status: 200, contentType: "audio/wav", body: silentWav }),
  );
}

export async function waitForKural(page: Page, number: number) {
  await expect(page.locator('#player > span[role="status"]')).toContainText(
    `Kural ${number} of 1330`,
  );
}
