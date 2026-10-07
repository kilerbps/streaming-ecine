import { type ChildProcess, spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { buildProbeArgs, parseProbe, type ProbeResult } from './ffmpeg.js';

const STDERR_TAIL = 4000;

/** Binaire FFmpeg/ffprobe introuvable (ENOENT) : inutile de réessayer. */
export class BinaryMissingError extends Error {
  constructor(readonly binary: string) {
    super(`Binaire introuvable : ${binary}`);
    this.name = 'BinaryMissingError';
  }
}

export interface RunResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  /** Fin de la sortie d'erreur (journaux techniques uniquement, jamais montrée à l'éditeur). */
  stderrTail: string;
  stdout: string;
  /** Vrai si le processus a été arrêté faute d'activité. */
  idleKilled: boolean;
}

export interface RunOptions {
  onStdoutLine?: (line: string) => void;
  /** Conserver la sortie standard complète (ffprobe). */
  collectStdout?: boolean;
  /** Arrêt si aucune ligne n'arrive sur la sortie standard pendant ce délai. */
  idleTimeoutMs?: number;
  onSpawn?: (child: ChildProcess) => void;
}

/** Lance un binaire sans shell (arguments passés tels quels : aucune injection possible). */
export function runProcess(
  binary: string,
  args: string[],
  options: RunOptions = {},
): Promise<RunResult> {
  return new Promise<RunResult>((resolvePromise, reject) => {
    const child = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    options.onSpawn?.(child);
    let stderrTail = '';
    let stdout = '';
    let idleKilled = false;
    let idleTimer: NodeJS.Timeout | undefined;

    const armIdle = () => {
      if (!options.idleTimeoutMs) return;
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        idleKilled = true;
        child.kill('SIGKILL');
      }, options.idleTimeoutMs);
    };
    armIdle();

    createInterface({ input: child.stdout }).on('line', (line) => {
      armIdle();
      if (options.collectStdout) stdout += `${line}\n`;
      options.onStdoutLine?.(line);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderrTail = (stderrTail + chunk.toString('utf8')).slice(-STDERR_TAIL);
    });
    child.on('error', (err: NodeJS.ErrnoException) => {
      if (idleTimer) clearTimeout(idleTimer);
      reject(err.code === 'ENOENT' ? new BinaryMissingError(binary) : err);
    });
    child.on('close', (code, signal) => {
      if (idleTimer) clearTimeout(idleTimer);
      resolvePromise({ code, signal, stderrTail, stdout, idleKilled });
    });
  });
}

/** ffprobe a refusé le fichier (code de sortie non nul). */
export class ProbeFailedError extends Error {
  constructor(readonly stderrTail: string) {
    super('ffprobe a échoué');
    this.name = 'ProbeFailedError';
  }
}

/** Sonde ffprobe : durée, dimensions affichées, présence d'audio, cadence. */
export async function probe(ffprobe: string, input: string): Promise<ProbeResult> {
  const result = await runProcess(ffprobe, buildProbeArgs(input), {
    collectStdout: true,
    idleTimeoutMs: 60_000,
  });
  if (result.code !== 0) throw new ProbeFailedError(result.stderrTail);
  return parseProbe(result.stdout);
}
