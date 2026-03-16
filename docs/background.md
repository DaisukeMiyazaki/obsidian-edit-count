# Background: Obsidian Edit Count Plugin

## 動機

Obsidian で markdown ノートの**編集量を重みづけとして可視化**したい。何度も加筆修正しているファイル＝思考が活発なノートであり、それをグラフビューやペインで重点的に確認できるようにしたかった。

Git の `git log --name-only` や `git blame` でファイル単位の変更頻度を把握することは可能だが、commit ログが汚れる問題があり、Obsidian 内で完結する軽量な仕組みが望ましいと判断した。

## 既存プラグイン調査 (2026-03)

「編集回数で重みづけして表示する」にドンピシャのプラグインは存在しなかった。関連するプラグイン:

| プラグイン | 概要 | 不足点 |
|-----------|------|--------|
| [Extended Graph](https://forum.obsidian.md/t/new-plugin-extended-graph/98850) | メタデータでノードサイズを変更可能 | 編集回数の自動計測機能がない |
| [Obsidian Git](https://github.com/Vinzent03/obsidian-git) | vault の Git 自動コミット | commit ログが汚れる |
| [Activity Heatmap](https://github.com/zakhij/obsidian-activity-heatmap) | ファイルサイズ・ワードカウントの変化を追跡 | 編集「回数」ではなく量の可視化 |
| [Sidebar Heatmap](https://forum.obsidian.md/t/new-plugin-sidebar-heatmap/98528) | サイドバーにファイル活動のヒートマップ | 日ごとの表示で、累積的な重みづけではない |

## 方針決定

以下の組み合わせを採用:

1. **Obsidian プラグインで `edit_count` を frontmatter に自動記録** ← 本プラグインのスコープ
2. Extended Graph で `edit_count` をノードサイズにマッピング（既存プラグインに委ねる）

Git ベースではなく、**文字数差分（letter count diff）の閾値判定**で「実質的な編集」を検出する方式を選択した。

### 選択理由

- commit ログを汚さない
- Obsidian 内で完結する（外部ツール不要）
- 軽量（メモリ上で保持するのは開いているファイルの初期文字数のみ）

## 要件サマリー

- ノート編集時に文字数差分を計測
- 差分が閾値以上（デフォルト: 50文字）のとき `edit_count` を +1
- 編集セッションの区切り: 一定時間無入力（デフォルト: 3分）OR ファイル切り替え/クローズ、どちらか早い方
- 閾値・タイムアウトは設定画面から変更可能
- 体感パフォーマンス劣化がないこと

## 実装概要

- `main.ts` 単一ファイルで完結（約230行）
- イベント: `active-leaf-change` + debounced `editor-change` の2つのみ
- 状態: `Map<string, SessionState>` でファイルパス → 初期文字数を保持
- frontmatter 更新: `app.fileManager.processFrontMatter()` API
- 設定: `PluginSettingTab` で `charThreshold` と `timeoutSeconds` を公開

## タイムライン

- 2026-03-16: 発案・調査・要件定義・計画・実装・初回コミット
