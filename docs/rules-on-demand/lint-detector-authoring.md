# 自訂 Lint Detector 撰寫指南

**Purpose**: 寫 / 維護 / debug 專案專屬的架構 lint detector（反模式偵測器）。

**Category / Scope**: Tooling / on-demand rule
**Created**: 2026-08-07
**Last Modified**: 2026-08-07
**Status**: Active

**Trigger（什麼時候 Read）**: 寫新的反模式 detector / debug 誤判 / 擴充 detector 涵蓋範圍。

---

## 什麼時候該寫 detector

**門檻很高。** 一個 detector 是永久的維護負擔（誤判會消耗每個開發者的時間）。

| 條件 | 說明 |
|------|------|
| ✅ 這個反模式**已經真實發生 2 次以上** | 不接受「想像中可能會發生」 |
| ✅ 它**靜默失敗** —— 不會有測試爆掉 | 會被測試抓到的東西不需要 detector |
| ✅ 它可以用**語法層面**判定 | 需要語義理解的東西寫不出可靠的 detector |
| ✅ 修正方式**明確** | detector 的錯誤訊息要能告訴人怎麼修 |

**反例**：「程式碼應該要好讀」—— 無法機械判定，不要嘗試。

---

## 三種 detector 形態

| 形態 | 適用 | 可靠度 |
|------|------|-------|
| **Grep / regex** | 禁用的 import、禁用的字串、命名 pattern | 低-中（易誤判）|
| **AST 走訪** | 結構性規則（誰呼叫誰、繼承關係、裝飾器）| 高 |
| **檔案層面統計** | 大小預算、行數上限、檔案存在性 | 高 |

**優先用 AST**。regex 對程式碼的理解太淺，誤判率會拖垮採用率。

---

## ⚠️ Code-Aware Masking（regex detector 必做）

regex detector **必須先遮蔽掉不該被匹配的區域**，否則誤判會非常多：

| 要遮蔽的區域 | 為什麼 |
|-------------|-------|
| **註解** | 「不要用 `import openai`」這句話本身會被抓 |
| **Docstring / 字串常值** | 錯誤訊息、範例程式碼、測試 fixture |
| **匯入別名** | `import x as y` 之後的 `y` 不是 `x` |

**真實踩坑**：一個禁用 import 的 detector 抓到的「違規」是**規則文件裡的反例程式碼區塊**。

```python
# 遮蔽的最小骨架
def mask_non_code(source: str) -> str:
    """Replace comments and string literals with same-length blanks."""
    # 用該語言的 tokenizer，不要自己寫 regex 去配對引號
    # Python: tokenize module
    # 其他語言: 用該語言的 parser
    ...
```

**判準**：你的 detector 跑在**自己的規則文件**上會不會噴？會 → masking 沒做對。

---

## ⚠️ 先枚舉真實格式，不可以憑印象

寫 detector 之前，**先把 repo 裡該欄位 / 該 pattern 的所有實際寫法列出來**。

真實踩坑：一個檢查「狀態標記」的 detector，作者憑印象寫了兩種格式。
實際 repo 裡有**四種**互不相容的寫法（表格 / 中文表格 / 粗體 / 引用），
而漏掉的那批裡面就藏著 2 個真陽性。

**Detector 綠了，但它綠是因為它看不見。**

做法：先跑一次寬鬆的 grep 把所有候選行撈出來、肉眼掃過分類，再寫 pattern。
`5 分鐘的枚舉`換掉`一個假綠的 detector`。

---

## ⚠️ 慢到沒人跑的檢查等於沒有檢查

第一版某個檢查逐檔 spawn 子進程；在 Windows 上每次 spawn ~0.3 秒，
一個 100 個資料夾的 repo 就是**兩分鐘** —— 然後就沒有人跑它了。

| ❌ | ✅ |
|---|---|
| 迴圈裡逐檔 spawn `grep` / `sed` / `git` | 一次讀進來，用語言內建的字串 / regex 處理 |
| 每個項目都查一次 git | 只對**需要**的少數項目查（例如只有 `active` 狀態的才查 commit 時間）|

**判準：全 repo 跑一次要在幾秒內完成。** 超過十幾秒就要重新設計，
因為它會先被移出 pre-commit，然後被移出 CI，然後被忘記。

---

## Detector 骨架

```python
"""
File: scripts/lint/check_<pattern_name>.py
Purpose: Detect <反模式名稱> — <一句話症狀>.
Category: Tooling / lint
Scope: <引入它的 phase>

Description:
    <為什麼需要這個 detector：實際發生了幾次、造成什麼後果>

Usage:
    python scripts/lint/check_<pattern_name>.py [--root <repo_root>]
"""

import argparse
import sys
from pathlib import Path
from typing import NamedTuple


class Violation(NamedTuple):
    """NamedTuple, NOT dataclass — 測試常用 importlib 以檔案路徑載入本腳本，
    dataclass + future annotations 在 importlib 載入下會壞掉。"""
    file: str
    line: int
    detail: str


def find_violations(repo_root: Path) -> list[Violation]:
    """Pure function — 可用 tmp_path 單元測試。"""
    violations: list[Violation] = []
    # ... 掃描邏輯
    return violations


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(Path(__file__).resolve().parents[2]))
    cli = parser.parse_args(argv)

    violations = find_violations(Path(cli.root))
    if not violations:
        print("<detector-name>: OK")
        return 0

    print(f"<detector-name>: {len(violations)} violation(s):")
    for v in violations:
        print(f"  {v.file}:{v.line}: {v.detail}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
```

**關鍵設計**：

1. **`find_violations()` 是純函式** —— 收 root path、回 list。可以用 `tmp_path` 單元測試
2. **`main()` 只做 CLI 包裝** —— exit 0 = 乾淨，1 = 有違規
3. **錯誤訊息要能指導修正** —— 不只說「違規」，要說「怎麼修」
4. **NamedTuple 而非 dataclass** —— importlib 載入相容性

---

## 錯誤訊息的品質

```
❌  check_foo: 3 violations
    src/a.py:12: violation

✅  check_foo: 3 violations:
    src/a.py:12: direct `openai` import in domain layer — route through
                 `_contracts.LLMClient` instead (see scope-boundaries.md §import matrix)
```

**判準**：一個沒讀過這條規則的人，看到訊息能不能直接修好？

---

## 註冊到 run_all

新 detector 寫好後加進 `scripts/lint/run_all.py` 的清單：

```python
DETECTORS = [
    ("rules-hygiene", "check_rules_hygiene.py", []),
    ("your-detector", "check_your_pattern.py", ["--root", "src"]),  # ← 注意 args
]
```

⚠️ **注意 `--root` 參數** —— 每個 detector 期望的 root 可能不同
（有的要 repo root、有的要 src root）。**參數給錯會靜默通過**（掃到空目錄 = 0 違規 = exit 0）。

這正是 `run_all.py` 存在的理由：把正確的參數集中在一個地方，
避免「各自呼叫時參數搞錯而假通過」。

---

## 為 detector 寫測試

detector 自己也是 code，也要有測試：

```python
def test_detects_direct_import(tmp_path):
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "bad.py").write_text("import forbidden_lib\n")
    assert len(find_violations(tmp_path)) == 1

def test_ignores_import_inside_comment(tmp_path):
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "ok.py").write_text("# don't: import forbidden_lib\n")
    assert find_violations(tmp_path) == []   # ← masking 的回歸測試

def test_ignores_import_inside_docstring(tmp_path):
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "ok.py").write_text('"""Example: import forbidden_lib"""\n')
    assert find_violations(tmp_path) == []
```

**必備的兩個測試**：註解裡的假陽性、docstring 裡的假陽性。

---

## Detector 的生命週期

| 階段 | 行動 |
|------|------|
| **提案** | 記為 AD，附 2+ 次真實發生的證據 |
| **實作** | 先跑在既有 codebase 上 → 若噴出大量違規，先評估是真違規還是誤判 |
| **導入** | 先設成 warning（不 fail CI）跑 1-2 個 phase，觀察誤判率 |
| **強制** | 誤判率可接受 → 改成 fail |
| **淘汰** | 該反模式的成因已消失（如整個模組重寫了）→ 刪掉 detector，不要留著 |

**不要留著沒人在乎的 detector** —— 一個長期被 `# noqa` 繞過的 detector 比沒有還糟，
它訓練人忽略 lint 輸出。
