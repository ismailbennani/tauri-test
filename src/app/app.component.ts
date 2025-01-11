import { CommonModule } from "@angular/common";
import { Component, signal, Signal, WritableSignal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { getVersion } from "@tauri-apps/api/app";
import { error } from "@tauri-apps/plugin-log";
import { exit, relaunch } from "@tauri-apps/plugin-process";
import { check, Update } from "@tauri-apps/plugin-updater";
import { from } from "rxjs";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent {
  greetingMessage = "";
  appVersion: Signal<string | undefined>;

  availableUpdate: WritableSignal<"loading" | Update | "error" | "none"> = signal("none");
  availableUpdateInstallationState: WritableSignal<"none" | DownloadState> = signal("none");

  constructor() {
    this.appVersion = toSignal(from((async () => await getVersion())()));
    this.checkForUpdates().then();
  }

  async checkForUpdates() {
    this.availableUpdate.set("loading");

    try {
      const update = await check({ timeout: 10000 });
      if (update != null && update.available) {
        this.availableUpdate.set(update);
      } else {
        this.availableUpdate.set("none");
      }
    } catch (e) {
      error(`Error while looking for updates: ${e}`);
      this.availableUpdate.set("error");
    }
  }

  async install() {
    if (this.availableUpdateInstallationState() != "none") {
      return;
    }

    var update = this.availableUpdate();
    if (update === "loading" || update === "error" || update === "none" || !update.available) {
      return;
    }

    let newVersion = update.version;
    let downloaded = 0;
    let totalLength = 0;

    this.availableUpdateInstallationState.set({ newVersion, state: "downloading", downloaded: 0, totalLength: 0 });

    await update.downloadAndInstall(evt => {
      switch (evt.event) {
        case "Started":
          totalLength = evt.data.contentLength ?? 0;
          this.availableUpdateInstallationState.set({ newVersion, state: "downloading", downloaded: 0, totalLength });
          break;
        case "Progress":
          downloaded += evt.data.chunkLength;
          this.availableUpdateInstallationState.set({ newVersion, state: "downloading", downloaded, totalLength });
          break;
        case "Finished":
          this.availableUpdateInstallationState.set({ newVersion, state: "installing", downloaded, totalLength });
          break;
      }
    });

    this.availableUpdateInstallationState.set({ newVersion, state: "done", downloaded, totalLength });
  }



  async relaunch() {
    await exit(0);
    await relaunch();
  }
}

interface DownloadState {
  readonly newVersion: string;
  readonly state: "downloading" | "installing" | "done";
  readonly downloaded: number;
  readonly totalLength: number;
}