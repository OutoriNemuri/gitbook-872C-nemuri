#!/usr/bin/env node
/**
 * 把仓库内 book-plugins/ 下的本地插件「安装」进 node_modules。
 *
 * 为什么需要这一步：
 * HonKit 只从 node_modules 解析插件，不会扫描仓库里的任意目录。
 * 本地插件又没发布到 npm，所以构建前必须先复制过去。
 *
 * 同时供两处使用：
 *   - package.json 的 postinstall（Vercel / 本地装完依赖自动执行）
 *   - 构建前的 build:plugins（保证即使跳过了 postinstall 也已就位）
 *
 * 用「复制」而非「符号链接」：Vercel 构建环境与部分文件系统
 * （例如 iOS/iSH 的共享目录）不支持创建符号链接，复制更稳。
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, "book-plugins");
const DEST_DIR = path.join(ROOT, "node_modules");

function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else if (entry.isSymbolicLink()) {
      // 解引用：目标环境可能不支持符号链接
      fs.copyFileSync(fs.realpathSync(s), d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.log("[link-plugins] 未找到 book-plugins/，跳过");
    return;
  }
  if (!fs.existsSync(DEST_DIR)) {
    fs.mkdirSync(DEST_DIR, { recursive: true });
  }

  const plugins = fs
    .readdirSync(SRC_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  if (plugins.length === 0) {
    console.log("[link-plugins] book-plugins/ 下没有插件，跳过");
    return;
  }

  for (const name of plugins) {
    const src = path.join(SRC_DIR, name);
    const dest = path.join(DEST_DIR, name);
    if (!fs.existsSync(path.join(src, "package.json"))) {
      console.warn(`[link-plugins] 跳过 ${name}：缺少 package.json`);
      continue;
    }
    rmrf(dest);
    copyDir(src, dest);
    console.log(`[link-plugins] 已安装本地插件 ${name} -> node_modules/${name}`);
  }
}

main();
