---
name: version-naming
description: Version numbering scheme for Termai project — patch-level bump per phase, not semver major
type: reference
---

Termai 的版本号遵循**功能阶段递增 patch** 的规则，不是语义化版本（semver）：

- 第一阶段 (MVP + multi-tab) → **v0.1.0**
- 第二阶段 (session templates) → **v0.1.2**
- 第三阶段 (system settings) → **v0.1.3**

即每个阶段完成 bump 一次 patch 号，major/minor 固定为 0.1。

创建新文件或提交时，package.json 中的 `version` 字段和文档中的 `对应版本` 都要统一使用这个编号。

**How to apply:** 完成一个阶段开发后，同步更新 server/package.json、web/package.json、相关文档的版本号。
