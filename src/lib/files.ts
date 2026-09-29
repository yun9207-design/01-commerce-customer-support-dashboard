export function download(name: string, text: string, type = 'text/plain;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}
export async function copyText(text: string): Promise<boolean> { try {
    await navigator.clipboard.writeText(text);
    return true;
}
catch {
    return false;
} }
export async function readText(file: File, max = 2000000): Promise<string> { if (file.size > max)
    throw Error(`파일 크기는 ${(max / 1e6).toFixed(0)} MB 이하여야 합니다.`); const buffer = await file.arrayBuffer(); try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
}
catch {
    throw Error('UTF-8 파일만 지원합니다. 엑셀에서 CSV UTF-8로 저장해 주세요.');
} }
export const money = (v: number) => new Intl.NumberFormat('ko-KR').format(v) + '원';
export const time = (v: string) => new Intl.DateTimeFormat('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(v));
export const shortId = (v: string) => v.length > 18 ? v.slice(0, 13) + '…' : v;
