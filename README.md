# にゃごろ！ — NEON ALLEY MIMIC BATTLE

夜のサイバーパンク路地裏で開かれる、猫たちの非公式ストリート大会。
**「にゃー」「ごろ」「ごろにゃー」** で相手の動きをまねし合う、友だち向けの部屋ID制オンライン対戦ゲームです。

- 宇宙に浮かぶ **ネオンの猫の目** → 瞳孔が開いて街が見え → 路地裏の会場までダイブするイントロ
- ドット絵の猫 8種類（プレイヤー）＋観客用 8種類。表情・ポーズ・アクセサリーはすべてパラメトリック生成
- 試合が白熱するほど **観客猫が増え、ネオン・提灯・サーチライト・ドローン・レーザーが点灯し、BGM のレイヤーが増える**
- 同梱の猫の鳴き声サンプルを使った「にゃー」、ゴロゴロ音の「ごろ」、カットイン付きの「ごろにゃー」

## あそびかた

| 手順 | 内容 |
| --- | --- |
| 1. 出題 | 出題側は受付マスの数まで、ヒミツで にゃー / ごろ を入力（相手の画面ではダンボールに隠れて見えない） |
| 2. おてほん | 出題ネコが BGM のビートに乗って、入れたシーケンスをひろう。よく見て覚える |
| 3. まね | まね側が同じ順番で入力。1つでも間違えるか時間切れで **魚** を1匹とられる |
| 4. 交代 | 成功でも失敗でも攻守交代。ラウンドごとに受付マスが +1（4 → 5 → … 最大 9） |
| 勝敗 | 魚は 2匹。**先に2回ミスして魚が0になった方の負け** |

### ごろにゃー（特殊入力）
- **にゃー＋ごろ の同時押し**（80ms 以内）で発動。1ターン1回まで。
- 使うと **受付マスが1つ壊れて短くなる**（残り2マス以上のときだけ使える）。
- 壊れた1マスは **相手の次の出題ターンに「おかえし」+1マス** として渡る（＝次に自分がまねする列が1マス長くなる）。
- そのかわり **ごろにゃーより後の にゃー / ごろ は、相手が「逆に」まねする** 必要がある。
  - 出題が にゃー → まね側は ごろ、出題が ごろ → まね側は にゃー。ごろにゃー自体はそのまま。
- わかりやすくする演出：
  - おてほん中にファイティングゲーム風の **カットイン**、ネオン看板の色が反転
  - トラック上で反転区間のマスに **⇄ マークとピンク枠**、下に「ここから ぎゃく！」ブラケット
  - まね中、ごろにゃーを正しく入れた瞬間に **画面ふちに REVERSE マーキー**、「ぎゃくモード」チップ、
    ボタン上に「(ごろ)を見たら」「(にゃー)を見たら」の案内、BGM のアルペジオが逆再生方向に

### 操作
| 入力 | キーボード | タッチ |
| --- | --- | --- |
| にゃー | `F` / `A` / `←` | 左の水色ボタン |
| ごろ | `J` / `L` / `→` | 右のオレンジボタン |
| ごろにゃー | 上2つを同時押し | 2つのボタンを同時タップ |
| キメ（出題を早めに確定、2つ以上で可） | `Space` / `Enter` | 中央の「キメ！」 |
| サウンド ON/OFF | `M` | タイトルの ♪ ボタン |

## 起動方法

```bash
npm install
npm start            # → http://localhost:8080
```

- **部屋をつくる** → 4文字の部屋ID（例 `K7RM`）が出るので友だちに伝えるか「招待リンクをコピー」
- 友だちは **部屋に入る** で部屋IDを入力（招待リンク `?room=K7RM` から開くと自動で参加）
- ふたりとも「じゅんびOK」→ ホストが「はじめる！」。試合後は「もう一回！」で即再戦
- ほかに **CPUと練習**（師匠ネコ）と **1台でふたり**（交代で入力）モードあり

### 友だちとネット越しに遊ぶには
| 方法 | 手順 |
| --- | --- |
| 自分のPCでサーバーを立てる | `npm start` して、`cloudflared tunnel --url http://localhost:8080` などのトンネルで URL を共有 |
| サーバーをデプロイ | Render / Fly.io / Railway 等に Node アプリとしてデプロイ（`PORT` 環境変数に対応） |
| 縦画面 | スマホを縦に持つと、上にHUD・中央に路地裏（1.25倍）・下に大きな2ボタンの縦専用レイアウトになる |
| 静的ホスティング（サーバー不要） | GitHub Pages 等にリポジトリをそのまま置くだけ。ルームサーバーが見つからないと自動で **PeerJS（WebRTC P2P）** に切り替わる（PeerJS の公開ブローカーを使用） |

### GitHub Pages で公開する（サーバー不要）
1. GitHub のリポジトリページ → **Settings** → 左メニュー **Pages**
2. **Build and deployment** の Source を **Deploy from a branch** にする
3. Branch で `claude/dazzling-hopper-tgzldo`、フォルダ `/ (root)` を選んで **Save**
4. 1〜2分後、`https://shindou12.github.io/nyaagoro/` で遊べる（同じページの上部にURLが表示される）

友だちにはこのURLを送り、片方が「部屋をつくる」、もう片方が部屋IDで「部屋に入る」。
この方式では PeerJS の公開サービスを使ってブラウザ同士を直接つなぎます。

接続方式は待機ルームに「ルームサーバー接続 / P2P接続」と表示されます。

## テスト

```bash
npm test             # ルールのユニットテスト（Node のみ）
npm start &          # 以下はサーバー起動中に
npm run e2e          # 2つのブラウザで 部屋作成→参加→試合→再戦→切断→再入室→エラー表示 を自動検証
```
e2e とスクリーンショット系ツール（`tools/*.mjs`）は `playwright-core` と Chromium を使います。
`tools/gallery.html` を開くと、全猫 × 全ポーズのスプライト一覧が見られます。

## 設計

### 画面階層（すべて GameRoot 配下）
```
GameRoot
└─ Stage（16:9、--p = 世界の1ピクセル）
   ├─ WorldWrap（カメラ：イントロ着地ズーム）
   │  ├─ BackgroundLayer   AlleyBackground / EyesInDark / NeonSigns
   │  └─ WorldLayer        AudienceCats / StageProps / PlayerCat / OpponentCat / AudienceFront / Weather / FrontRow
   ├─ HUDLayer             PlayerPlate×2 / RoundBadge / HypeMeter / SequenceTrack / TimerBar /
   │                       PhaseBanner / ReverseIndicator / RoleTags / InputPad
   ├─ OverlayLayer         FxCanvas / BeatPulse / ScreenFx / SpeechBubbles / SuccessEffect /
   │                       MissEffect / CrowdHypeEffect / SpecialActionEffect / Toast
   ├─ ModalLayer           TitleMenu / RoomCreatePanel / RoomJoinPanel / WaitingRoomPanel /
   │                       ResultPanel / HowToPanel / DisconnectPanel
   └─ TransitionLayer      IntroZoom / MatchStartTransition / ResultTransition
```

### 責務の分け方
| 層 | ファイル | 役割 |
| --- | --- | --- |
| Passive View | `js/views/**` | 見た目だけ（表示・座標・テキスト・アニメ状態）。判定や進行は持たない |
| Chain of Responsibility | `js/core/View.js` | View は「何が起きたか」を `emit` → 親へバブリング → GameRoot の sink（Mediator）へ。パネルは入力中の部屋IDなど文脈を付け足すだけ |
| Mediator | `js/mediator/AppMediator.js` | 画面遷移ステートマシン（intro → title → creating/joining → waiting → match → result → rematch/disconnected）。どの入力を受けるか・ロックするかを裁定 |
| Presenter（Mediator 層） | `js/mediator/MatchPresenter.js` | ゲーム上の「事実」を受けて、どの View・SE・BGM・観客をどう動かすかを決める |
| ゲームロジック | `js/logic/Rules.js`, `MatchLogic.js` | ルールと進行（純粋 JS、Node でテスト可能）。`MissOccurred` 相当の fact を出すだけで演出は知らない |
| 入力 | `js/input/Input.js` | Raw Input（キー／パッド）→ InputInterpreter（同時押し判定）→ ゲーム入力 |
| 通信 | `js/net/*` | ホスト権威型。ホストのブラウザが MatchLogic を動かし、ゲストは入力を送って fact を受け取る。WebSocket 中継 or PeerJS |
| 音 | `js/audio/*` | WebAudio。SE は合成＋猫の鳴き声サンプル、BGM は 5 レイヤーのシーケンサー |
| ドット絵 | `js/art/*` | ラベルグリッドにパーツを描き → 毛柄で着色 → 自動アウトライン＋ネオンのリムライト |

たとえばミスが起きたとき：`MatchLogic` が `judge {ok:false}` を出す → `MatchPresenter` が
魚HUDの減少・野良猫が魚を持ち去る寸劇・しょんぼりモーション・観客のどよめき・失敗SE・MISSスタンプ・BGM ダッキングを振り分けます。

### バランス（`js/logic/Rules.js`）
| 項目 | 値 |
| --- | --- |
| 魚（ライフ） | 2 |
| 受付マス | ラウンド1で4、ラウンドごとに+1、最大9（両者同じ長さで公平に） |
| 出題の制限時間 | 4.5秒 + 1.1秒×マス数（2つ未満で時間切れならノラ猫が勝手に足す） |
| まねの制限時間 | 最初の入力まで5秒、以降は1入力ごとに3.2秒 |
| ごろにゃー | 1ターン1回、受付 -1（その1マスは相手の次の出題に +1、最大11マス）、おてほんでは2拍ぶん使う |
| 熱狂度（0〜4） | ラウンド進行で上昇、どちらかが残り1匹で+1、両方残り1匹でさらに+1。BPM は 98 → 130 |

## クレジット
- 猫の鳴き声：制作依頼者提供のサンプル（`assets/audio/`）
- フォント：DotGothic16（SIL Open Font License 1.1、`assets/fonts/OFL-LICENSE.txt`）
- P2P 通信：PeerJS（MIT、`vendor/peerjs.min.js`）
- それ以外のドット絵・SE・BGM はすべてコードで生成
