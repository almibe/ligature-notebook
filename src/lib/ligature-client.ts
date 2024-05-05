import { invoke } from '@tauri-apps/api/tauri'

export async function runBend(script: string, params: Map<string, string>): Promise<string> {
    let finalScript = script;
    for (const [key, value] of params) {
        finalScript = finalScript.replace(`@${key}`, value)
    }
    return await invoke("run_bend", {script: finalScript} )
}