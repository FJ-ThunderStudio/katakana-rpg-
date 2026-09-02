# Katakana RPG Ver.1.3

小学1～3年生向けの、カタカナを並べ替えて遊ぶ静的ブラウザRPGです。Ver.1.3再Design Freeze版の企画書・実装仕様書・技術設計書を実装基準としています。

## 起動方法

ES ModulesとJSONの読み込みを使用するため、`index.html`を直接開かずHTTPサーバーから起動します。

```powershell
python -m http.server 8000
```

ブラウザで `http://localhost:8000/` を開きます。本番環境はGitHub Pages等のHTTPS静的配信を想定しています。

## テスト

Node.js 20以降で実行します。

```powershell
node --test
```

テストは実装仕様書のA01～A16に対応します。最終受入では、GitHub Pages相当のHTTPS環境と実機Chromebook + Google Chromeでも確認してください。

## 教材追加

1. `data/questions.json`へ、重複しない`id`、`word`、正しい順序の`characters`、`image`、`difficulty`、`category`を追加します。
2. `image`で指定した画像を配置します。画像は必須です。
3. 画像を読み込めない問題は候補から除外されます。有効問題がモードの規定数に満たない場合、ゲームは開始しません。

## 主な仕様

- 教材プール60語（Lv1／Lv2／Lv3 各20語）
- Normal 10問・HP 100・敵HP 100
- Challenge 20問・HP 160・敵HP 200
- Demon King 30問・HP 220・敵HP 300
- 正解攻撃10、同一問題の初回誤答ダメージ20
- 2回目以降の誤答はHPを減らさず、絵と正解を3秒表示
- 最終問題を本人が完成した時だけ勝利
- 敗北後はリザルト、閲覧型復習、再チャレンジ選択へ進行
- 今日のことばは実際に出題された全単語
- タッチパッドのクリックだけで操作可能

## 画像素材

- `asset-manifest.json` / `ASSET_GUIDE.md`: 正式画像アセットv1.0の対応表と利用ガイド
- `assets/images/branding/ege-logo.png`: タイトル画面のEGEロゴ
- `assets/images/characters/hero-main.png`: 全モード共通の主人公
- `assets/images/enemies/`: モード別の敵画像
- `assets/images/backgrounds/`: タイトル、モード別バトル、ステージ終了背景
- `ui-asset-manifest.json` / `CODEX_UI_FRAME_INSTRUCTION.md`: 正式UI枠v1.0の対応表と導入ガイド
- `assets/images/ui/ui-frame-*.png`: 主パネルの青枠、見出し・操作ボタンの青／緑ピル装飾
- `assets/images/words/*.png`: Lv1～Lv3各20語、合計60語の統一テイスト教材ヒントイラスト
- `hint-images-manifest.json`: 正式ヒント画像60点の寸法・透過情報・SHA-256一覧

## 既知の制限

- 初回の静的ファイル取得にはネットワーク接続が必要です。
- セッション保存・復帰、完全オフライン動作、外部API連携は対象外です。
- 公開前の実機Chromebook受入試験は別途必要です。
