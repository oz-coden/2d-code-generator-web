# 2D Code Generator

日本語の説明は[目次](#目次)から読めます。

## Table of Contents

1. [Summary](#summary)
2. [Background of Development](#background-of-development)
3. [Features](#features)
4. [Requirements, Dependencies](#requirements-dependencies)
5. [Installation](#installation)
6. [LICENSE](#license)
7. [CREDIT](#credit)

## Summary

A lightweight static tool that generates 2D codes from text or URLs in the browser. Save the result as PNG or SVG, or print a code-only page. The current implementation supports a single matrix format (Model 2).

[Playground Is Here!](https://tools.oz-coden.com/2d-code-generator/)

## Background of Development

The aim is to create 2D codes without uploading their contents to an external generation service, while keeping the interface usable on both phones and desktop computers.

## Features

- Client-side 2D code generation  
  Encode text, URLs, Japanese, emoji and line breaks locally as UTF-8 with an ECI designator. Leading and trailing whitespace is preserved; URLs are encoded as text without being opened.
- PNG and SVG downloads  
  Save an opaque black-and-white PNG at 256, 512 or 1024 pixels square, or a self-contained SVG. Every code includes a quiet zone of at least four modules; PNG modules align to integer pixels.
- Printing  
  Open the browser print dialog for a white, code-only layout. The code is 70 mm wide in the print stylesheet, subject to printer settings and page scaling.
- Error correction selection  
  Choose L, M, Q or H; M is the default. Higher correction levels reduce available capacity.
- Stale output prevention  
  Editing the input or either setting removes the old preview and disables saving and printing until regeneration.
- Responsive layout and shared themes  
  Use the common navigation, light and dark themes, and a single-column layout on smaller screens. The code remains black on white in either theme.

## Requirements, Dependencies

- A current web browser with JavaScript, TextEncoder, SVG, Canvas and Blob URL support.
- A browser and device that support file downloads and printing to use those features. Save and print destinations depend on the browser and operating system.

The user interface is in Japanese. Shared UI assets are included in this repository. Python 3 is only needed for the example local server command below; an equivalent static HTTP server can also be used.

## Installation

1. Clone or download this repository, keeping the directory structure intact.
2. Start a static HTTP server from the repository root. For example, with Python 3:

   ```sh
   python -m http.server 8000
   ```

3. Open `http://localhost:8000/` in your browser.

The application files are at the repository root. Running the application requires only static HTML, CSS and JavaScript; no Node.js runtime, API server or build step is required.

All generation and export code, including the encoding library, is included in this repository. There are no external fonts, analytics, CDN dependencies or code generation APIs. The application neither sends the input over the network nor saves it in browser storage. The shared UI stores only the selected theme. The page also sets a Content Security Policy with `connect-src 'none'`.

Opening the hosted page downloads its static assets. Following the navigation or GitHub links makes normal network requests. A generated 2D code contains the entered information, so anyone with the image can read it. Browser history, download handling and print services are controlled by the browser and operating system.

### Usage

1. Enter text or a URL in **テキストまたはURL**. Text is encoded exactly as entered, including whitespace and line breaks; the input is not fetched or checked as a URL.
2. Choose **PNGの画像サイズ** and **誤り訂正レベル**, then click **二次元コードを生成**.
3. Use **PNGを保存** or **SVGを保存** to download `2d-code.png` or `2d-code.svg`. Use **印刷** to open the browser print dialog; select a printer or PDF destination available on your device.
4. After editing the input or settings, generate again before saving or printing. **クリア** removes the input and result.

Input is limited to 2,900 UTF-8 bytes. Actual code capacity also depends on the error correction level, so shorter input may still exceed capacity. If generation fails, shorten the text or lower the correction level. Dense codes can be harder to scan at small sizes. Test the saved or printed code with the intended reader before distributing it. Readers without UTF-8 ECI support may interpret non-ASCII text differently.

### Development and publication

Application-specific behavior and layout are in `script.js` and `style.css`. Shared styles, navigation and themes are bundled in `vendor/ui/` from [oz-coden.com-ui-web](https://github.com/oz-coden/oz-coden.com-ui-web). The source commit and file hashes are recorded in `shared-ui.json`, so the application does not fetch the shared UI repository at runtime.

To update the bundled UI, clone the shared UI repository alongside this repository. From this application's root, run `node ../oz-coden.com-ui-web/scripts/sync-ui.mjs . COMMIT_SHA`, replacing `COMMIT_SHA` with the full 40-character commit SHA to use. Commit the updated `vendor/ui/` files and `shared-ui.json`. This maintenance command requires Node.js 22 or later and an internet connection.

This repository checks JavaScript syntax and browser behavior on push and pull requests. With Node.js 22 or later, start with the syntax checks:

```sh
node --check script.js
node --check vendor/ui/ui.js
node --check vendor/qrcodegen/qrcodegen.js
```

For browser checks, run `npm ci`, `npx playwright install chromium`, then `npm test` from the repository root. The checks decode PNG/SVG exports, cover Japanese and emoji, validate byte and capacity limits, exercise printing, inspect mobile layouts and verify that generation makes no network requests. Test artifacts are written to `test-results/`.

The hosted application is assembled and published through [tools.oz-coden.com](https://github.com/oz-coden/tools.oz-coden.com). Its publication workflow applies the shared UI to all tools and runs browser integration checks. See that repository for deployment instructions.

## LICENSE

This project is released under the [MIT License](LICENSE). Bundled third-party libraries retain their own copyright and license notices.

## CREDIT

Shared styles, navigation and themes: [oz-coden.com-ui-web](https://github.com/oz-coden/oz-coden.com-ui-web).

Encoding uses Project Nayuki's [encoding library](https://github.com/nayuki/QR-Code-generator) under the MIT License. The source revision, compiler and hashes are recorded in [UPSTREAM.json](vendor/qrcodegen/UPSTREAM.json); the original copyright and license notice are preserved in [THIRD-PARTY-NOTICES.txt](vendor/qrcodegen/THIRD-PARTY-NOTICES.txt) and the distributed JavaScript.

The vendored JavaScript was compiled from `typescript-javascript/qrcodegen.ts` at commit `3c6d0b3cefb4e049dc337e82237c9644399716a8` using esbuild 0.25.12 (`--target=es2020 --minify`). Recompiling this library is not required to run or edit the application.

Browser tests use jsQR as an independent decoder and pngjs to inspect PNG downloads. These npm packages are development dependencies only.

---

# 2D Code Generator

## 目次

1. [概要](#概要)
2. [開発背景](#開発背景)
3. [機能](#機能)
4. [前提・依存](#前提依存)
5. [導入方法](#導入方法)
6. [ライセンス](#ライセンス)
7. [クレジット](#クレジット)

## 概要

文字列やURLからブラウザ内で二次元コードを生成する、軽量な静的ツールです。PNG・SVG形式での保存と、二次元コードのみの印刷に対応しています。現在はModel 2形式の生成に対応しています。

[Playgroundはこちら！](https://tools.oz-coden.com/2d-code-generator/)

## 開発背景

外部の生成サービスに内容をアップロードせずに二次元コードを作成し、スマートフォンとPCのどちらでも使いやすくすることを目的としています。

## 機能

- ブラウザ内での二次元コード生成  
  文字列・URL・日本語・絵文字・改行を、ECIでUTF-8を指定してローカルで符号化します。前後の空白は保持し、URLも開かずに文字列として扱います。
- PNG・SVG形式の保存  
  白黒・不透明のPNGを256・512・1024ピクセル四方で保存するか、単体で利用できるSVGとして保存できます。周囲には4モジュール以上の余白を付け、PNGの各モジュールは整数ピクセルで描画します。
- 印刷  
  白地に二次元コードのみを配置した画面で、ブラウザの印刷ダイアログを開きます。印刷用CSSでは幅70 mmに設定していますが、実際の寸法はプリンターの設定や拡大縮小に依存します。
- 誤り訂正レベルの選択  
  L・M・Q・Hを選べます。初期値はMです。復元力を高くすると、格納できる内容の量は減ります。
- 古い結果の保存を防止  
  入力や設定を変更すると古いプレビューを消し、再生成するまで保存・印刷を無効にします。
- スマートフォン対応と共通テーマ  
  共通ナビゲーションとライト・ダークテーマを利用でき、小さい画面では1列に配置します。どちらのテーマでも、二次元コードは白地に黒で表示します。

## 前提・依存

- JavaScript・TextEncoder・SVG・Canvas・Blob URLに対応した最新のWebブラウザ。
- 保存・印刷を利用する場合は、それらに対応したブラウザと端末。保存先や印刷先は、ブラウザとOSの機能に依存します。

画面の言語は日本語です。共通UIのファイルはこのリポジトリに同梱しています。Python 3は下記のローカルサーバーのコマンドを使う場合に必要で、同等の静的HTTPサーバーでも実行できます。

## 導入方法

1. このリポジトリをクローンまたはダウンロードし、フォルダ構成を保ちます。
2. リポジトリのルートで静的HTTPサーバーを起動します。Python 3を利用する場合は、次のコマンドを実行します。

   ```sh
   python -m http.server 8000
   ```

3. ブラウザで`http://localhost:8000/`を開きます。

アプリ本体はリポジトリのルートにあります。実行には静的なHTML・CSS・JavaScriptだけを使い、Node.jsの実行環境・APIサーバー・ビルド工程は不要です。

符号化ライブラリを含め、生成と書き出しに必要なコードはこのリポジトリに同梱しています。外部フォント・解析ツール・CDN依存・コード生成APIは使用しません。アプリは入力内容をネットワーク送信せず、ブラウザの保存領域にも保存しません。共通UIは選択したテーマだけを保存します。ページには`connect-src 'none'`を含むContent Security Policyも設定しています。

公開ページを開く際は静的ファイルをダウンロードします。ナビゲーションやGitHubのリンクを開く場合も通常の通信が発生します。二次元コードには入力した情報が入るため、画像を受け取った人は内容を読み取れます。ブラウザの履歴、ダウンロードの扱い、印刷サービスはブラウザとOSが管理します。

### 使い方

1. **テキストまたはURL**に内容を入力します。空白や改行も含め、そのまま符号化します。URLとしてアクセスしたり、存在を確認したりする処理はありません。
2. **PNGの画像サイズ**と**誤り訂正レベル**を選び、**二次元コードを生成**を押します。
3. **PNGを保存**または**SVGを保存**で、`2d-code.png`または`2d-code.svg`をダウンロードします。**印刷**ではブラウザの印刷ダイアログが開くので、端末で利用できるプリンターやPDFの保存先を選びます。
4. 入力や設定を変更した後は、保存・印刷の前に再生成します。**クリア**で入力と結果を消去できます。

入力の上限はUTF-8で2900バイトです。実際の格納容量は誤り訂正レベルにも依存するため、上限以内でも収まらない場合があります。その場合は内容を短くするか、誤り訂正レベルを下げてください。情報量の多い二次元コードを小さく表示すると、読み取りにくくなる場合があります。配布前に、保存・印刷したコードを利用予定のリーダーで確認してください。UTF-8のECIに対応していないリーダーでは、日本語などの解釈が異なる場合があります。

### 開発と公開

アプリ固有の処理は`script.js`、レイアウトは`style.css`で管理します。共通のスタイル・ナビゲーション・テーマ切り替えは、[oz-coden.com-ui-web](https://github.com/oz-coden/oz-coden.com-ui-web)から`vendor/ui/`へ同梱しています。取得元のコミットとファイルハッシュは`shared-ui.json`に記録しており、実行時に共通UIリポジトリへアクセスする必要はありません。

同梱の共通UIを更新するには、このリポジトリと同じ親フォルダに共通UIリポジトリをクローンします。このアプリのルートで`node ../oz-coden.com-ui-web/scripts/sync-ui.mjs . COMMIT_SHA`を実行し、`COMMIT_SHA`を取り込む版の40桁のコミットSHAに置き換えてください。更新された`vendor/ui/`のファイルと`shared-ui.json`をコミットします。この保守用コマンドには、Node.js 22以降とインターネット接続が必要です。

このリポジトリでは、pushとプルリクエスト時にJavaScriptの構文とブラウザの動作を検査します。Node.js 22以降を利用すると、構文検査をローカルでも実行できます。

```sh
node --check script.js
node --check vendor/ui/ui.js
node --check vendor/qrcodegen/qrcodegen.js
```

ブラウザの検査には、リポジトリのルートで`npm ci`、`npx playwright install chromium`、`npm test`を順に実行します。PNG・SVGの読み取り、日本語・絵文字、バイト数・容量の上限、印刷、モバイル表示、生成時に通信しないことを検査します。確認用のファイルは`test-results/`に保存します。

公開用のアプリは、[tools.oz-coden.com](https://github.com/oz-coden/tools.oz-coden.com)で組み立てて配信します。公開処理では、全ツールに共通UIを適用し、ブラウザでの統合検査を行います。公開手順は同リポジトリを参照してください。

## ライセンス

This project is released under the [MIT License](LICENSE). Bundled third-party libraries retain their own copyright and license notices.

## クレジット

共通のスタイル・ナビゲーション・テーマ：[oz-coden.com-ui-web](https://github.com/oz-coden/oz-coden.com-ui-web)。

二次元コードの符号化には、MITライセンスのProject Nayuki [encoding library](https://github.com/nayuki/QR-Code-generator)を使用しています。取得元の版・コンパイラー・ハッシュは[UPSTREAM.json](vendor/qrcodegen/UPSTREAM.json)に記録し、元の著作権表示とライセンス通知を[THIRD-PARTY-NOTICES.txt](vendor/qrcodegen/THIRD-PARTY-NOTICES.txt)と配布用JavaScriptに保持しています。

同梱のJavaScriptは、コミット`3c6d0b3cefb4e049dc337e82237c9644399716a8`の`typescript-javascript/qrcodegen.ts`をesbuild 0.25.12（`--target=es2020 --minify`）で変換したものです。アプリの実行や編集のために、このライブラリを再コンパイルする必要はありません。

ブラウザの検査では、独立したデコーダーとしてjsQRを、PNGの検査にpngjsを使用します。これらのnpmパッケージは開発時のみの依存関係です。
