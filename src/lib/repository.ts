import { AppState } from '../domain/types';
import { parseBackup, parseState } from '../domain/validation';
import { makeSeed } from '../data/seed';
export const STORAGE_KEY = 'commerce-cs-lab:state:v1';
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
            throw Error('브라우저 저장 용량/권한 문제로 반영하지 못했습니다. 기존 자료는 유지됩니다. 백업 후 공간을 확보하세요.');
        }
        this.expected = raw;
    }
    replace(state: AppState) { const clean = parseState(state); if (!this.storage) {
        this.session = clean;
        this.blocked = false;
        return;
    } const raw = JSON.stringify(clean); this.storage.setItem(STORAGE_KEY, raw); this.expected = raw; this.blocked = false; }
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
