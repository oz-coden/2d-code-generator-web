const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { readFile, mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const jsQR = require('jsqr');
const { PNG } = require('pngjs');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.txt': 'text/plain' };
const server = createServer(async (req, res) => {
    let file = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (file.endsWith('/')) file += 'index.html';
    file = path.resolve(root, '.' + file);
    if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
    try { const data = await readFile(file); res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); res.end(data); }
    catch (_) { res.writeHead(404).end(); }
});
async function bytes(download) {
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}
function decode(image) {
    const qr = jsQR(new Uint8ClampedArray(image.data), image.width, image.height);
    assert.ok(qr, 'an independent decoder must read the exported 2D code image');
    return qr.data;
}
(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const output = path.join(root, 'test-results');
    await mkdir(output, { recursive: true });
    let browser;
    let count = 0;
    const check = async (name, run) => { await run(); console.log('PASS ' + name); count++; };
    try {
        browser = await chromium.launch(process.env.BROWSER_EXECUTABLE_PATH ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {});
        const context = await browser.newContext({ acceptDownloads: true });
        const external = [];
        const network = [];
        await context.route('**/*', route => {
            const url = route.request().url();
            network.push({ url, method: route.request().method() });
            if (url.startsWith(base + '/')) return route.continue();
            external.push(url);
            return route.abort();
        });
        await context.addInitScript(() => { window.printCalls = 0; window.print = () => { window.printCalls++; }; });
        const page = await context.newPage();
        const errors = [];
        const violations = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', event => { if (/violates.*Content Security Policy|Refused to/i.test(event.text())) violations.push(event.text()); });
        const generate = async (text, ecc = 'M', size = '512') => {
            await page.locator('#qr-input').fill(text);
            await page.locator('#qr-ecc').selectOption(ecc);
            await page.locator('#qr-size').selectOption(size);
            await page.getByRole('button', { name: '二次元コードを生成', exact: true }).click();
        };
        const downloadPng = async () => {
            const promise = page.waitForEvent('download');
            await page.getByRole('button', { name: 'PNGを保存' }).click();
            const download = await promise;
            assert.equal(download.suggestedFilename(), '2d-code.png');
            return PNG.sync.read(await bytes(download));
        };
        await check('empty input cannot be exported or printed', async () => {
            await page.goto(base);
            for (const id of ['save-png', 'save-svg', 'print-btn']) assert.equal(await page.locator('#' + id).isDisabled(), true);
            await generate('');
            assert.match(await page.locator('#qr-status').innerText(), /入力してください/);
        });
        await check('PNG exports preserve exact text, URLs, Japanese, emoji and all correction levels', async () => {
            const samples = [
                ['https://example.com/path?a=1&b=%E6%97%A5#part', 'L', '256'],
                ['日本語の二次元コード 😀\n2行目', 'M', '512'],
                ['  leading and trailing spaces  ', 'Q', '1024'],
                ['<script>alert("test")</script>\njavascript:alert(1)', 'H', '512'],
            ];
            for (const [text, ecc, size] of samples) {
                await generate(text, ecc, size);
                const png = await downloadPng();
                assert.equal(png.width, Number(size));
                assert.equal(png.height, Number(size));
                assert.equal(decode(png), text);
                for (let i = 0; i < png.data.length; i += 4) {
                    assert.ok(png.data[i] === 0 || png.data[i] === 255);
                    assert.equal(png.data[i], png.data[i + 1]);
                    assert.equal(png.data[i], png.data[i + 2]);
                    assert.equal(png.data[i + 3], 255);
                }
                assert.equal(png.data[0], 255, 'quiet zone remains white');
                assert.equal(await page.locator('#qr-preview script').count(), 0);
            }
        });
        await check('SVG export is self-contained and independently decodable', async () => {
            const text = 'SVG 日本語 / https://example.com/?x=1&y=2';
            await generate(text);
            const promise = page.waitForEvent('download');
            await page.getByRole('button', { name: 'SVGを保存' }).click();
            const download = await promise;
            assert.equal(download.suggestedFilename(), '2d-code.svg');
            const svg = (await bytes(download)).toString('utf8');
            assert.match(svg, /xmlns="http:\/\/www.w3.org\/2000\/svg"/);
            assert.doesNotMatch(svg, /<script|<image|href=|https:\/\/example/);
            const raster = await page.evaluate(async xml => {
                const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
                try {
                    const img = new Image();
                    img.src = url;
                    await img.decode();
                    const canvas = document.createElement('canvas');
                    canvas.width = canvas.height = 512;
                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(img, 0, 0, 512, 512);
                    return Array.from(ctx.getImageData(0, 0, 512, 512).data);
                } finally { URL.revokeObjectURL(url); }
            }, svg);
            assert.equal(decode({ data: raster, width: 512, height: 512 }), text);
        });
        await check('edits and settings invalidate stale results; clear resets the form content', async () => {
            await page.locator('#qr-input').fill('new content');
            assert.equal(await page.locator('#save-png').isDisabled(), true);
            assert.equal(await page.locator('#qr-preview svg').count(), 0);
            await generate('settings');
            await page.locator('#qr-size').selectOption('1024');
            assert.equal(await page.locator('#print-btn').isDisabled(), true);
            await generate('clear me');
            await page.getByRole('button', { name: 'クリア', exact: true }).click();
            assert.equal(await page.locator('#qr-input').inputValue(), '');
            assert.equal(await page.locator('#save-svg').isDisabled(), true);
        });
        await check('byte and capacity limits reject input without stale exports', async () => {
            for (const text of ['a'.repeat(2901), 'あ'.repeat(1000)]) {
                await generate(text);
                assert.match(await page.locator('#qr-status').innerText(), /2900バイト/);
                assert.equal(await page.locator('#save-png').isDisabled(), true);
            }
            await generate('a'.repeat(2900), 'M');
            assert.match(await page.locator('#qr-status').innerText(), /収まりません/);
            await generate('a'.repeat(2900), 'L', '1024');
            assert.equal(decode(await downloadPng()), 'a'.repeat(2900));
        });
        await check('print uses a white code-only layout and invokes browser printing', async () => {
            await generate('印刷テスト');
            await page.getByRole('button', { name: 'ダークテーマに切り替え' }).click();
            assert.equal(await page.locator('#qr-preview').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
            await page.getByRole('button', { name: '印刷', exact: true }).click();
            assert.equal(await page.evaluate(() => window.printCalls), 1);
            await page.emulateMedia({ media: 'print' });
            for (const selector of ['.ui-header', '.input-panel', '.export-actions', '#privacy-note', '#result-heading']) {
                assert.equal(await page.locator(selector).isVisible(), false, selector);
            }
            assert.equal(await page.locator('#qr-preview svg').isVisible(), true);
            const pdf = await page.pdf({ format: 'A4', printBackground: true });
            assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
            await writeFile(path.join(output, 'qr-print.pdf'), pdf);
            await page.emulateMedia({ media: 'screen' });
        });
        await check('desktop and mobile layouts fit and retain accessible controls', async () => {
            for (const width of [360, 390, 1280]) {
                await page.setViewportSize({ width, height: 900 });
                assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'overflow at ' + width);
                assert.ok(await page.locator('#qr-preview svg').isVisible());
                for (const id of ['save-png', 'save-svg', 'print-btn']) {
                    const box = await page.locator('#' + id).boundingBox();
                    assert.ok(box.width >= 44 && box.height >= 44);
                }
            }
            await page.setViewportSize({ width: 390, height: 900 });
            await page.screenshot({ path: path.join(output, 'qr-mobile.png'), fullPage: true });
        });
        await check('generation and export make no network requests or persistent copies of input', async () => {
            assert.deepEqual(external, []);
            assert.ok(network.every(req => req.method === 'GET'));
            assert.deepEqual(network.map(req => new URL(req.url).pathname).filter(url => !['/', '/index.html', '/style.css', '/script.js', '/vendor/ui/ui.css', '/vendor/ui/ui.js', '/vendor/qrcodegen/qrcodegen.js'].includes(url)), []);
            const stored = await page.evaluate(() => Object.entries(localStorage));
            assert.ok(stored.every(([key]) => key === 'oz_tools_theme'));
            await page.reload();
            assert.equal(await page.locator('#qr-input').inputValue(), '');
            assert.equal(await page.locator('#save-png').isDisabled(), true);
        });
        assert.deepEqual(errors, []);
        assert.deepEqual(violations, []);
        await context.close();
        console.log(`${count} 2D code browser checks passed`);
    } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
