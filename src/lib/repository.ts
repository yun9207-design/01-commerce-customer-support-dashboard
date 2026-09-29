import { AppState } from '../domain/types';
import { parseBackup, parseState } from '../domain/validation';
import { makeSeed } from '../data/seed';
export const STORAGE_KEY = 'commerce-cs-lab:state:v1';
const PROBE_KEY = 'commerce-cs-lab:fit-probe';
export const SAVE_FAILED = '브라우저 저장 용량/권한 문제로 반영하지 못했습니다. 기존 자료는 유지됩니다. 백업 후 공간을 확보하세요.';
export const RESTORE_FAILED = '복원할 자료가 브라우저 저장 용량(또는 권한)을 넘어 저장하지 못했습니다. 현재 자료는 바뀌지 않았습니다. 더 작은 백업을 선택하거나, 현재 자료를 먼저 JSON 백업한 뒤 정리하세요.';
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type LoadResult = {
    state: AppState;
    mode: 'persistent' | 'session' | 'recovery';
    notice: string;
    raw: string | null;
};
export interface Repository {
    load: () => LoadResult;
    save: (state: AppState) => void;
    replace: (state: AppState) => void;
    fits: (state: AppState) => boolean;
    raw: () => string | null;
}
// Single-browser learning adapter. No credentials or network calls. Not a multi-user database.
export class LocalRepository implements Repository {
    private expected: string | null = null;
    private blocked = false;
    private session: AppState | null = null;
    constructor(private storage: StorageLike | null) { }
    raw() { try {
        return this.storage?.getItem(STORAGE_KEY) ?? null;
    }
    catch {
        return null;
    } }
    load(): LoadResult {
        if (!this.storage) {
            this.session ??= makeSeed();
            return { state: this.session, mode: 'session', notice: '브라우저 저장이 불가능합니다. 현재 탭에서만 사용되므로 반드시 JSON 백업하세요.', raw: null };
        }
        let raw: string | null;
        try {
            raw = this.storage.getItem(STORAGE_KEY);
        }
        catch {
            this.storage = null;
            return this.load();
        }
        this.expected = raw;
        this.blocked = false;
        if (!raw)
            return { state: makeSeed(), mode: 'persistent', notice: '', raw: null };
        try {
            return { state: parseBackup(raw), mode: 'persistent', notice: '', raw };
        }
        catch (e) {
            this.blocked = true;
            return { state: makeSeed(), mode: 'recovery', notice: `저장된 자료를 읽지 못했습니다. 원본을 덮어쓰지 않고 보존했습니다. 설정에서 원본 내려받기 후 복원/초기화하세요. ${(e as Error).message}`, raw };
        }
    }
    save(state: AppState) {
        if (this.blocked)
            throw Error('복구 모드: 손상된 원본을 먼저 백업하고 설정에서 복원 또는 초기화하세요.');
        if (!this.storage) {
            this.session = structuredClone(state);
            return;
        }
        const current = this.storage.getItem(STORAGE_KEY);
        if (current !== this.expected)
            throw Error('다른 탭에서 자료가 변경되었습니다. 새로고침 후 다시 작업하세요.');
        const raw = JSON.stringify(state);
        try {
            this.storage.setItem(STORAGE_KEY, raw);
        }
        catch {
            throw Error(SAVE_FAILED);
        }
        this.expected = raw;
    }
    // Explicit whole-state replacement (restore/reset). A failed write must leave the current data exactly as it was.
    replace(state: AppState) {
        const clean = parseState(state);
        if (!this.storage) {
            this.session = clean;
            this.blocked = false;
            return;
        }
        const raw = JSON.stringify(clean);
        let previous: string | null = null;
        try {
            previous = this.storage.getItem(STORAGE_KEY);
        }
        catch { /* unreadable storage: the write below decides */ }
        try {
            this.storage.setItem(STORAGE_KEY, raw);
        }
        catch {
            // A failed setItem should leave the old value in place; verify and restore it if some browser did not.
            try {
                if (this.storage.getItem(STORAGE_KEY) !== previous) {
                    if (previous === null)
                        this.storage.removeItem(STORAGE_KEY);
                    else
                        this.storage.setItem(STORAGE_KEY, previous);
                }
            }
            catch { /* nothing more can be done; the original error is reported below */ }
            throw Error(RESTORE_FAILED);
        }
        this.expected = raw;
        this.blocked = false;
    }
    // Pre-flight for restore: would this state fit in browser storage right now? Writes a throwaway probe key as large as the
    // net growth (new size minus current size) and removes it. The real state key is never touched.
    fits(state: AppState): boolean {
        if (!this.storage)
            return true;
        const raw = JSON.stringify(state);
        let growth = raw.length;
        try {
            growth -= (this.storage.getItem(STORAGE_KEY) ?? '').length;
        }
        catch {
            return false;
        }
        if (growth <= 0)
            return true;
        try {
            this.storage.setItem(PROBE_KEY, 'x'.repeat(growth));
            return true;
        }
        catch {
            return false;
        }
        finally {
            try {
                this.storage.removeItem(PROBE_KEY);
            }
            catch { /* best effort */ }
        }
    }
}
export function browserRepository(): LocalRepository { try {
    const storage = window.localStorage;
    const probe = 'commerce-cs-lab:probe';
    storage.setItem(probe, 'ok');
    storage.removeItem(probe);
    return new LocalRepository(storage);
}
catch {
    return new LocalRepository(null);
} }
