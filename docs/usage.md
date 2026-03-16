# Usage Guide: Edit Count Plugin

## インストール

### BRAT 経由（推奨）

1. [BRAT](https://github.com/TfTHacker/obsidian42-brat) をインストール・有効化する
2. BRAT 設定画面 → **Add Beta plugin**
3. `DaisukeMiyazaki/obsidian-edit-count` を入力 → **Add Plugin**
4. Settings → Community plugins → **Edit Count** を有効化

### 手動インストール

1. [Releases](https://github.com/DaisukeMiyazaki/obsidian-edit-count/releases) から `main.js` と `manifest.json` をダウンロード
2. vault の `.obsidian/plugins/edit-count/` ディレクトリを作成
3. ダウンロードした2ファイルを配置
4. Obsidian を再起動 → Settings → Community plugins → **Edit Count** を有効化

## 基本的な動作

プラグインを有効化すると、ノートの編集量を自動で追跡する。

1. ノートを開いて編集する
2. 以下のいずれかのタイミングで編集セッションが評価される:
   - **別のノートに切り替えた**とき
   - **一定時間（デフォルト: 3分）入力がなかった**とき
3. 文字数の変化が閾値（デフォルト: 50文字）以上なら、frontmatter の `edit_count` が +1 される

```yaml
---
edit_count: 5
---
```

typo 修正のような軽微な変更ではカウントされない。

## 設定

Settings → Community plugins → Edit Count → 歯車アイコン

| 設定項目 | デフォルト | 説明 |
|---------|-----------|------|
| Character threshold | 50 | この文字数以上の変化があった場合に edit_count を +1 |
| Inactivity timeout | 180秒 | この時間入力がなければ編集セッションを確定 |

## Extended Graph でノードサイズに反映する

[Extended Graph](https://github.com/ElsaTam/obsidian-extended-graph) プラグインと組み合わせることで、よく編集するノートをグラフビュー上で大きく表示できる。

### セットアップ手順

1. **Extended Graph をインストール**
   - コミュニティプラグインから "Extended Graph" を検索してインストール
   - 有効化する

2. **Extended Graph の設定を開く**
   - Settings → Extended Graph

3. **ノードサイズに `edit_count` をマッピング**
   - Extended Graph の設定パネルで **Nodes** セクションを開く
   - **Size** の設定で、ノードサイズの計算に使うプロパティとして `edit_count` を指定する
   - 統計関数（例: linear, logarithmic）を選択してスケーリングを調整する

4. **グラフビューを開く**
   - コマンドパレット → "Extended Graph: Open" または左サイドバーのグラフアイコン
   - `edit_count` が高いノートほどノードが大きく表示される

### Bases で編集回数ランキングを表示する（プラグイン不要）

Obsidian 1.9.10+ のコア機能 [Bases](https://help.obsidian.md/bases) を使えば、追加プラグインなしで `edit_count` のデータベースビューを作成できる。

1. vault 内に `edit-ranking.base` ファイルを作成する
2. 以下の YAML を記述する:

```yaml
filters:
  - edit_count > 0

views:
  - type: table
    name: "Edit Count Ranking"
    order:
      - property: edit_count
        direction: desc
    fields:
      - edit_count
      - file.mtime
```

3. ファイルを開くと、`edit_count` が高い順にノートがテーブル表示される

Bases はコアプラグインのため軽量で、Dataview のようなサードパーティ依存がない。

### Dataview で編集回数ランキングを表示する（代替）

[Dataview](https://github.com/blacksmithgu/obsidian-dataview) プラグインでも同様のことができる。

任意のノートに以下のコードブロックを貼り付ける:

````markdown
```dataview
TABLE edit_count AS "編集回数"
FROM ""
WHERE edit_count > 0
SORT edit_count DESC
LIMIT 20
```
````

これにより「最も頻繁に編集しているノート TOP 20」がテーブルで表示される。
