<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 暖通设计管家（HVAC Design Assistant）

本项目为暖通设计过程记录与模板化管理工具，当前实现 V1 规划中的**文件分类模板、阶段管理、极简执行视图与完成度展示**等能力，强调“记录对、存完整、找得到”。

> V1 不做规范自动判断或文件内容解析，仅提供结构化记录与阶段推进支撑。

## 功能概览（V1）

- 项目/子项创建：选择子项类型与当前阶段，按模板启用分类清单。
- 阶段切换：显式操作、单向推进，历史阶段只读可见。
- 极简执行视图：每阶段 3–5 项关键执行条目。
- 分类完成度：按一级分类统计当前阶段完成比例。

## 需求说明书

- 基础版需求文档：`暖通设计管家｜需求说明书（基础版_v_0.md`

## 本地运行

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
