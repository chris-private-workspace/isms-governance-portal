# Code Quality Rules

**Purpose**: Lint / 型別檢查 / 格式化的執行慣例 + 跨平台常見問題。

**Category / Scope**: Quality / on-demand rule
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

**Trigger（什麼時候 Read）**: 修 lint / type check 報錯 / 跨平台工具行為不一致。

---

## 標準指令

```bash
# Format
<format 指令>

# Lint
<lint 指令>

# Type check
<type check 指令；無型別系統則填 echo 'n/a'>

# 專案架構 lint（規則 hygiene + 自訂 detector）
python scripts/lint/run_all.py
```

**執行順序**：format → lint → typecheck → test。
先格式化能消掉一半的 lint 噪音。

---

## ⚠️ 絕不要靜默 lint

```bash
❌  npm run lint --silent
❌  <lint> 2>/dev/null
❌  <lint> || true
```

`--silent` 之類的旗標會**連同錯誤輸出一起吞掉**。

**真實踩坑**：本機 `lint --silent` 顯示全綠 → push → CI 在 30 秒內爆出 28 個錯誤。
那個旗標本意是消掉套件管理器的雜訊，實際上把 lint 錯誤也消掉了。

**要乾淨輸出就這樣做**：

```bash
✅  <lint 指令> 2>&1 | tail -20
```

保留錯誤，只修掉雜訊。

---

## 跨平台問題

### 型別檢查器在不同平台行為不同

**症狀**：同一個 import 在 CI（Linux）與本機（Windows / macOS）的 type checker 結果不同。
抑制註解在一邊必要、在另一邊變成「無用抑制」錯誤。

**根因**：stub 套件在兩個環境的安裝狀態不同。

**Workaround**（以 mypy 為例）：雙 code 抑制

```python
import some_lib  # type: ignore[import-untyped, unused-ignore]
```

兩邊都不報錯。

**根治**：在依賴檔裡 **pin stub 套件版本**，讓兩邊行為一致。

### 換行符

```bash
# .gitattributes
* text=auto eol=lf
```

Windows 開發 + Linux CI 的組合下，沒設這個會讓 diff 充滿假變更。

### 路徑分隔符

程式碼裡**永遠不要**手拼路徑字串。用該語言的 path API
（Python `pathlib.Path` / Node `path.join`）。

---

## Type Hints / 型別註記原則

- **公開介面必須有完整型別** —— 參數 + 回傳值
- **私有 helper 可以省略**（但有比沒有好）
- ❌ **不要用 `Any` 逃避** —— `Any` 是「我還沒想清楚」的標記，不是解法
- ❌ **不要為了過 type check 加無意義的 cast** —— 先問「是不是設計有問題」

```python
# ❌ 逃避
def process(data: Any) -> Any: ...

# ✅ 誠實
def process(order: Order) -> PricedOrder: ...

# ✅ 真的是泛型的時候
def first[T](items: Sequence[T]) -> T | None: ...
```

---

## 行長度

上限 **100** 字元。

這個上限也適用於：
- 註解與 docstring
- **Modification History 條目**（見 `file-header-convention.md` —— 這是最常超標的地方）
- Markdown 表格的一行（在有 lint 的檔案裡）

---

## Lint 抑制的紀律

抑制某條 lint 規則時，**必須同一行或前一行寫原因**：

```python
# ❌ 沒有原因
x = eval(expr)  # noqa: S307

# ✅ 有原因
# S307: expr comes from the trusted admin-only rule editor, validated by
# RuleParser.validate() before reaching here. See FIX-021.
x = eval(expr)  # noqa: S307
```

**判準**：三個月後的你（或別人）看到這行抑制，能不能判斷它現在還成立？
不能 → 原因寫得不夠。

---

## 什麼時候該修 lint、什麼時候該改規則

| 情況 | 行動 |
|------|------|
| 這條規則抓到真問題 | 修 code |
| 這條規則在這個檔案類型不適用（如 migration / 生成檔）| 在設定檔加**目錄級**排除，不是逐行 noqa |
| 這條規則在整個專案都不適用 | 在設定檔關掉它，並在該處註明原因 |
| 這條規則偶爾誤判 | 逐行抑制 + 原因 |

**反模式**：整個檔案頂端一個 `# noqa`（等於關掉整個檔案的檢查，而且沒人會發現）。

---

## Pre-Push 自檢

push 之前跑完整組：

```bash
<format 指令> && <lint 指令> && <type check 指令；無型別系統則填 echo 'n/a'> && <test 指令> && python scripts/lint/run_all.py
```

**任何一項紅 → 不要 push。**

若你委派工作給 subagent，**這組指令你要自己再跑一次** ——
agent 回報的「全綠」在你親自重現之前都是未經驗證的宣稱。
