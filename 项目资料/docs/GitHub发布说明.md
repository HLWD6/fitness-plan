# 网站发布说明

项目维护目录：`/home/k405/Desktop/fitness-plan`。只有用户明确要求上传或发布时，才执行提交、推送或部署。

现有网站入口：<https://maotianyou123-tech.github.io/fitness-plan/>。本地修改不会自动更新线上网站；线上与本地文件的浏览器数据也不会自动同步。

用户要求发布时，先运行训练测试与 `python3 项目资料/scripts/build.py --check`，确认源码及生成的根目录HTML、ZIP一致，再提交并推送至 `main`。仓库的GitHub Actions先运行检查，再将单文件网页部署到GitHub Pages。最后核对 [Actions](https://github.com/maotianyou123-tech/fitness-plan/actions) 部署结果。
