'use strict';
const form = document.getElementById('qr-form');
const input = document.getElementById('qr-input');
const sizeInput = document.getElementById('qr-size');
const eccInput = document.getElementById('qr-ecc');
const preview = document.getElementById('qr-preview');
const status = document.getElementById('qr-status');
const summary = document.getElementById('result-summary');
const counter = document.getElementById('input-count');
const pngButton = document.getElementById('save-png');
const svgButton = document.getElementById('save-svg');
const printButton = document.getElementById('print-btn');
const encoder = new TextEncoder();
const maxBytes = 2900;
const border = 4;
const svgNamespace = 'http://www.w3.org/2000/svg';
let result = null;

function message(text, error = false) {
    status.textContent = text;
    status.classList.toggle('ui-error', error);
}
function invalidate() {
    const hadResult = result !== null;
    result = null;
    pngButton.disabled = svgButton.disabled = printButton.disabled = true;
    preview.replaceChildren();
    const empty = document.createElement('p');
    empty.id = 'empty-preview';
    empty.textContent = '生成したQRコードがここに表示されます。';
    preview.append(empty);
    summary.textContent = '';
    const byteLength = input.value.length > maxBytes ? null : encoder.encode(input.value).length;
    counter.textContent = byteLength === null ? '2900バイトを超えています（UTF-8）' : `${byteLength} / 2900バイト（UTF-8）`;
    message(hadResult ? '内容または設定を変更しました。QRコードを再生成してください。' : '');
}
function createSvg(qr) {
    const extent = qr.size + border * 2;
    const svg = document.createElementNS(svgNamespace, 'svg');
    svg.setAttribute('viewBox', `0 0 ${extent} ${extent}`);
    svg.setAttribute('width', String(extent));
    svg.setAttribute('height', String(extent));
    svg.setAttribute('shape-rendering', 'crispEdges');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', '生成したQRコード');
    const background = document.createElementNS(svgNamespace, 'rect');
    background.setAttribute('width', String(extent));
    background.setAttribute('height', String(extent));
    background.setAttribute('fill', '#ffffff');
    const path = document.createElementNS(svgNamespace, 'path');
    const modules = [];
    for (let y = 0; y < qr.size; y++) {
        for (let x = 0; x < qr.size; x++) {
            if (qr.getModule(x, y)) modules.push(`M${x + border},${y + border}h1v1h-1z`);
        }
    }
    path.setAttribute('d', modules.join(''));
    path.setAttribute('fill', '#000000');
    svg.append(background, path);
    return svg;
}
function generate() {
    invalidate();
    const text = input.value;
    if (text.length === 0) { message('テキストまたはURLを入力してください。', true); input.focus(); return; }
    if (text.length > maxBytes) { message('入力はUTF-8で2900バイト以内にしてください。', true); return; }
    const bytes = encoder.encode(text);
    if (bytes.length > maxBytes) { message('入力はUTF-8で2900バイト以内にしてください。', true); return; }
    try {
        const ecc = qrcodegen.QrCode.Ecc[{ L: 'LOW', M: 'MEDIUM', Q: 'QUARTILE', H: 'HIGH' }[eccInput.value]];
        // ECI 26 declares UTF-8, including for non-ASCII text such as Japanese and emoji.
        const segments = [qrcodegen.QrSegment.makeEci(26), qrcodegen.QrSegment.makeBytes(Array.from(bytes))];
        const qr = qrcodegen.QrCode.encodeSegments(segments, ecc, 1, 40, -1, false);
        const svg = createSvg(qr);
        result = { qr, svg, pixels: Number(sizeInput.value) };
        preview.replaceChildren(svg);
        pngButton.disabled = svgButton.disabled = printButton.disabled = false;
        summary.textContent = `${bytes.length}バイト · PNG ${result.pixels} × ${result.pixels} px · 誤り訂正 ${eccInput.value}`;
        message('QRコードを生成しました。');
    } catch (error) {
        message(error instanceof RangeError ? 'この内容はQRコードに収まりません。短くするか、誤り訂正レベルを下げてください。' : 'QRコードを生成できませんでした。ページを再読み込みして試してください。', true);
    }
}
function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function savePng() {
    if (!result) return;
    const snapshot = result;
    try {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = snapshot.pixels;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas unavailable');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const scale = Math.floor(snapshot.pixels / (snapshot.qr.size + border * 2));
        const offset = Math.floor((snapshot.pixels - snapshot.qr.size * scale) / 2);
        ctx.fillStyle = '#000000';
        for (let y = 0; y < snapshot.qr.size; y++) {
            for (let x = 0; x < snapshot.qr.size; x++) {
                if (snapshot.qr.getModule(x, y)) ctx.fillRect(offset + x * scale, offset + y * scale, scale, scale);
            }
        }
        canvas.toBlob(blob => {
            if (!blob) { message('PNGを保存できませんでした。SVG形式で試してください。', true); return; }
            download(blob, 'qrcode.png');
        }, 'image/png');
    } catch (_) { message('PNGを保存できませんでした。SVG形式で試してください。', true); }
}
form.addEventListener('submit', event => { event.preventDefault(); generate(); });
input.addEventListener('input', invalidate);
sizeInput.addEventListener('change', invalidate);
eccInput.addEventListener('change', invalidate);
document.getElementById('clear-btn').addEventListener('click', () => { input.value = ''; invalidate(); input.focus(); });
pngButton.addEventListener('click', savePng);
svgButton.addEventListener('click', () => {
    if (result) download(new Blob([new XMLSerializer().serializeToString(result.svg)], { type: 'image/svg+xml;charset=utf-8' }), 'qrcode.svg');
});
printButton.addEventListener('click', () => { if (result) window.print(); });
invalidate();
