/**
 * 872C 阅读增强插件
 *
 * 纯前端、零依赖，向 HonKit 页面注入：
 * - 顶部阅读进度条
 * - 桌面端「本页目录」浮层
 * - 标题悬停复制锚点链接
 * - 回到顶部按钮
 * - 键盘快捷键（/ 搜索、g+h 首页、? 帮助、Esc 关闭）
 * - 外链安全属性与视觉标识
 */
module.exports = {
  website: {
    assets: "./assets",
    js: ["reading-tools.js"],
    css: ["reading-tools.css"]
  }
};
