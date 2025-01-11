import { CommonModule } from "@angular/common";
import { Component, Signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { getVersion } from "@tauri-apps/api/app";
import { error } from "@tauri-apps/plugin-log";
import { exit, relaunch } from "@tauri-apps/plugin-process";
import { check, Update } from "@tauri-apps/plugin-updater";
import { catchError, from, map, Observable, of } from "rxjs";

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
  availableUpdate: Signal<Update | "none" | "error" | undefined>;

  constructor() {
    this.appVersion = toSignal(from((async () => await getVersion())()));
    this.availableUpdate = toSignal(
      from((async () => await check({ timeout: 10000 }))()).pipe(
        map((u: Update | null): Update | "none" => (u === null ? "none" : u)),
        catchError((e: any): Observable<"error"> => {
          error(`Error while looking for updates: ${e}`);
          return of("error");
        })
      )
    );
  }

  async relaunch() {
    await exit(0);
    await relaunch();
  }
}
