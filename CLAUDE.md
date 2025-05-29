# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

ShapeConvは、SVGパスデータをCSS `clip-path` `shape()` 値に変換するReact/TypeScriptウェブアプリケーションです。ユーザーがSVGファイルをアップロードすると、対応するCSSシェイプ構文を自動生成します。

## 開発コマンド

- `npm run dev` - ホットリロード付きの開発サーバーを起動
- `npm run build` - 本番用ビルド（TypeScriptコンパイル後にViteビルドを実行）
- `npm run lint` - ESLintでコード品質をチェック
- `npm run preview` - 本番ビルドをローカルでプレビュー

## アーキテクチャ

### コア変換ロジック (src/App.tsx)

アプリケーションは宣言的な多段階変換プロセスを実装しています：

1. **SVG解析**: `extractPathsFromSVG()` がDOMParserを使用して `<path>` 要素と基本図形要素（rect, circle, ellipse, polygon, polyline）を抽出
2. **パスコマンド解析**: `parseSVGPath()` が正規表現を使ってSVGパスデータをパラメータ付きコマンドオブジェクトに分解
3. **シェイプ変換**: `convertToShape()` が座標状態を追跡しながらSVGパスコマンドをCSS shape()構文に変換
4. **宣言的処理**: `useMemo`を使用してSVGデータと設定変更時に自動的に結果を再計算

### サポートするSVGパスコマンド

変換ツールは以下のSVGパスコマンドを処理します：
- `M/m` (moveto) → 最初は `from`、以降は `line to`
- `L/l` (lineto) → `line to`
- `H/h` (水平lineto) → `line to` (計算されたY座標付き)
- `V/v` (垂直lineto) → `line to` (計算されたX座標付き)
- `C/c` (curveto) → `curve to ... with ... / ...` (3次ベジェ曲線、制御点付き)
- `Q/q` (quadratic Bézier curveto) → `curve to ... with ...` (2次ベジェ曲線)
- `Z/z` (closepath) → `close`

絶対座標（大文字）と相対座標（小文字）の両方のコマンドをサポートし、適切な座標追跡を行います。

### サポートするSVG基本図形

- **rect**: 長方形（角丸対応）
- **circle**: 円
- **ellipse**: 楕円
- **polygon**: 多角形
- **polyline**: 折れ線

### アスペクト比正規化オプション

- **正規化なし**: SVGの元のアスペクト比を維持（%単位）
- **1:1正規化**: アスペクト比を1:1に正規化し中央配置（%単位）

### UIコンポーネント

- SVG検証付きファイルアップロード
- アスペクト比正規化切り替えトグル
- `dangerouslySetInnerHTML` を使用したSVGプレビュー表示
- シンタックスハイライトとコピー機能付きコード出力
- 実際のclip-pathが適用されたビジュアルプレビュー
- CSS統合方法を示す使用例

### 状態管理とアーキテクチャの特徴

- **宣言的アプローチ**: `useMemo`によるリアクティブな処理結果計算
- **型安全性**: TypeScriptインターフェース(`SVGData`, `ProcessingResult`)による厳密な型定義
- **関数型プログラミング**: 純粋関数の外部定義による副作用の排除
- **エラーハンドリング**: ファイル選択とSVG処理の両段階でのエラー管理

## 技術スタック

- **React 19** with TypeScript
- **Vite** ビルドツールと開発サーバー
- **ESLint** コード品質管理
- 純粋CSS（外部UIライブラリなし）

