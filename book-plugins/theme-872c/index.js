/**
 * 872C 主题插件（本地插件，零外部依赖）
 *
 * 作用：注入自定义样式与深浅色切换脚本。
 *
 * 背景：HonKit 只会自动注入 styles/website.css 这一个文件，
 * 本项目需要的 override-plugin.css（与 fontsettings 插件解耦）
 * 与 theme-toggle.js 必须由插件显式注入。
 *
 * 重要：**不要移除 fontsettings**。深浅色切换正是复用它的
 *       color-theme-N 状态；移除后状态源就没了。它负责存储，
 *       本插件负责 UI 与外观，两者是协作关系。
 *
 * 资源必须放在 assets/ 目录下，HonKit 会按 website.js / website.css
 * 的声明复制到 _book/gitbook/<plugin>/ 并自动挂进页面。
 */

module.exports = {
  website: {
    assets: "./assets",
    js: ["theme-toggle.js"],
    css: ["override-plugin.css"]
  }
};
