# 网站发布说明

项目维护目录：`/home/k405/Desktop/fitness-plan`。每次完成项目修改后默认提交并推送到 `main`；用户明确要求不推送时按其要求处理。

现有网站入口：<https://maotianyou123-tech.github.io/fitness-plan/>。本地修改不会自动更新线上网站；线上与本地文件的浏览器数据也不会自动同步。

先更新根目录单文件网页与ZIP，再运行 `python3 项目资料/scripts/build.py --check` 确认发布文件一致。提交并推送后，GitHub Actions会运行规则检查并将单文件网页部署到GitHub Pages；推送后核对 [Actions](https://github.com/maotianyou123-tech/fitness-plan/actions) 结果。
