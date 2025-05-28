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

アプリケーションは多段階の変換プロセスを実装しています：

1. **SVG解析**: `extractPathFromSVG()` がDOMParserを使用して `<path>` 要素の `d` 属性を抽出
2. **パスコマンド解析**: `parseSVGPath()` が正規表現を使ってSVGパスデータをパラメータ付きコマンドオブジェクトに分解
3. **シェイプ変換**: `convertToShape()` が座標状態を追跡しながらSVGパスコマンドをCSS shape()構文に変換

### サポートするSVGパスコマンド

変換ツールは以下のSVGパスコマンドを処理します：
- `M/m` (moveto) → `move to`
- `L/l` (lineto) → `line to`
- `H/h` (水平lineto) → `line to` (計算されたY座標付き)
- `V/v` (垂直lineto) → `line to` (計算されたX座標付き)
- `C/c` (curveto) → `curve to ... via` (制御点付き)
- `Z/z` (closepath) → `close`

絶対座標（大文字）と相対座標（小文字）の両方のコマンドをサポートし、適切な座標追跡を行います。

### UIコンポーネント

- SVG検証付きファイルアップロード
- `dangerouslySetInnerHTML` を使用したSVGプレビュー表示
- シンタックスハイライトとコピー機能付きコード出力
- CSS統合方法を示す使用例

## 技術スタック

- **React 19** with TypeScript
- **Vite** ビルドツールと開発サーバー
- **ESLint** コード品質管理
- 純粋CSS（外部UIライブラリなし）