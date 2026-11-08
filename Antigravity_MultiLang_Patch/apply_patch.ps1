param(
    [ValidateSet("Menu", "Install", "Rollback")]
    [string]$Action = "Menu",
    [string]$Lang = "",
    [switch]$NoKill = $false,
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"

try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

function Detect-InstallerLocale {
    param([string]$OverrideLang)
    if (-not [string]::IsNullOrWhiteSpace($OverrideLang)) {
        $n = $OverrideLang.Trim()
        if ($n -match '^(?i)zh[-_](TW|HK|MO|Hant)') { return "zh-TW" }
        if ($n -match '^(?i)zh') { return "zh-CN" }
        if ($n -match '^(?i)ko') { return "ko" }
        if ($n -match '^(?i)ja') { return "ja" }
        if ($n -match '^(?i)es') { return "es" }
        if ($n -match '^(?i)fr') { return "fr" }
        if ($n -match '^(?i)de') { return "de" }
        if ($n -match '^(?i)ru') { return "ru" }
        if ($n -match '^(?i)en') { return "en" }
    }
    $cultureName = ""
    try {
        $cultureName = (Get-UICulture).Name
    } catch {
        try {
            $cultureName = [System.Globalization.CultureInfo]::CurrentUICulture.Name
        } catch {
            $cultureName = "en-US"
        }
    }
    if ($cultureName -match '^(?i)zh[-_](TW|HK|MO|Hant)') { return "zh-TW" }
    if ($cultureName -match '^(?i)zh') { return "zh-CN" }
    if ($cultureName -match '^(?i)ko') { return "ko" }
    if ($cultureName -match '^(?i)ja') { return "ja" }
    if ($cultureName -match '^(?i)es') { return "es" }
    if ($cultureName -match '^(?i)fr') { return "fr" }
    if ($cultureName -match '^(?i)de') { return "de" }
    if ($cultureName -match '^(?i)ru') { return "ru" }
    return "en"
}

$I18N = @{
    "ko" = @{
        WindowTitle     = "Antigravity 다국어 패치 마법사"
        BannerSubtitle  = "다국어 로컬라이제이션 & 상단 사용량 위젯 패치 (9개 언어)"
        MenuTitle       = "원하시는 작업을 선택해 주세요"
        MenuInstall     = "[1] 다국어 패치 설치 / 업데이트 적용"
        MenuRestore     = "[2] 원본 영문 상태로 복구 (롤백)"
        MenuQuit        = "[Q] 종료 (나가기)"
        MenuPrompt      = "번호 또는 키를 입력하세요 (1 / 2 / Q): "
        InvalidChoice   = "올바른 메뉴를 선택해 주세요 (1, 2, Q)."
        Step1Title      = "Antigravity 설치 경로 및 패치 아카이브 확인"
        Step1Ok         = "설치 경로 및 패치 파일 확인 완료"
        Step2Title      = "실행 중인 Antigravity 프로세스 안전 종료"
        Step2Skip       = "프로세스 종료 건너뜀 (-NoKill / -DryRun)"
        Step2Ok         = "프로세스 확인 및 종료 완료"
        Step3Title      = "원본 app.asar 안전 백업 (app.asar.original)"
        Step3New        = "원본 파일을 app.asar.original 로 안전하게 백업했습니다"
        Step3Keep       = "기존 원본 백업(app.asar.original)을 유지합니다"
        Step4Title      = "다국어 및 사용량 위젯 패치 아카이브 적용"
        Step4Ok         = "패치 파일이 성공적으로 적용되었습니다"
        Step5Title      = "화면 갱신을 위한 렌더링 캐시 정리 (Code Cache / GPUCache)"
        Step5Ok         = "렌더링 및 웹 캐시 정리 완료"
        InstallSuccess  = "성공! Antigravity 다국어 & 상단 사용량 패치가 완료되었습니다."
        FeatureHeader   = "주요 기능 안내"
        Feature1        = "앱 내 9개 언어 전환: 설정 > 일반 > Language 드롭다운 지원"
        Feature2        = "빠른 언어 전환: Alt + Shift + L 단축키 또는 상단 🌐 버튼"
        Feature3        = "상단 사용량 표시: 우측 상단 캡슐 위젯 및 모델별 상세 팝오버"
        RollbackTitle   = "원본 영문 상태 복구 (app.asar.original -> app.asar)"
        RollbackNoBak   = "백업된 원본 파일(app.asar.original)을 찾을 수 없습니다."
        RollbackSuccess = "성공! Antigravity가 원본 영문 상태로 깨끗하게 복원되었습니다."
        ExitMsg         = "설치 마법사를 종료합니다."
    }
    "en" = @{
        WindowTitle     = "Antigravity Multi-Language Patch Wizard"
        BannerSubtitle  = "Multi-Language Localization & Top Quota Widget Patch (9 Languages)"
        MenuTitle       = "Select an operation"
        MenuInstall     = "[1] Install / Update Multi-Language Patch"
        MenuRestore     = "[2] Restore / Rollback to Clean Original (app.asar.original)"
        MenuQuit        = "[Q] Quit (Exit)"
        MenuPrompt      = "Enter your choice (1 / 2 / Q): "
        InvalidChoice   = "Invalid selection. Please enter 1, 2, or Q."
        Step1Title      = "Verifying Antigravity installation & patch archive"
        Step1Ok         = "Installation directory and patch archive verified"
        Step2Title      = "Safely stopping running Antigravity processes"
        Step2Skip       = "Skipped stopping processes (-NoKill / -DryRun)"
        Step2Ok         = "Process check and termination complete"
        Step3Title      = "Backing up clean original app.asar (app.asar.original)"
        Step3New        = "Original app.asar backed up to app.asar.original"
        Step3Keep       = "Existing clean backup (app.asar.original) preserved"
        Step4Title      = "Deploying Multi-Language & Quota Widget patch archive"
        Step4Ok         = "Patch archive deployed successfully"
        Step5Title      = "Purging rendering caches (Code Cache / Cache / GPUCache)"
        Step5Ok         = "Rendering and web caches purged"
        InstallSuccess  = "Success! Antigravity Multi-Language & Quota Patch has been installed."
        FeatureHeader   = "Key Features"
        Feature1        = "In-App 9-Language Switch: Settings > General > Language dropdown"
        Feature2        = "Quick Language Toggle: Press Alt + Shift + L or click top-bar 🌐 button"
        Feature3        = "Top-Bar Real-Time Quota Display: Sleek capsule & model breakdown popover"
        RollbackTitle   = "Restoring Clean Original (app.asar.original -> app.asar)"
        RollbackNoBak   = "Backup file (app.asar.original) was not found."
        RollbackSuccess = "Success! Antigravity has been restored to its clean original state."
        ExitMsg         = "Exiting patch wizard."
    }
    "ja" = @{
        WindowTitle     = "Antigravity 多言語パッチインストーラー"
        BannerSubtitle  = "多言語ローカライズ＆上部使用量ウィジェットパッチ (9言語対応)"
        MenuTitle       = "実行する操作を選択してください"
        MenuInstall     = "[1] 多言語パッチのインストール / アップデート適用"
        MenuRestore     = "[2] オリジナルの英語状態に復元 (ロールバック)"
        MenuQuit        = "[Q] 終了 (Exit)"
        MenuPrompt      = "番号またはキーを入力してください (1 / 2 / Q): "
        InvalidChoice   = "無効な選択です。1、2、または Q を入力してください。"
        Step1Title      = "Antigravity インストール先とパッチファイルの確認"
        Step1Ok         = "インストールパスとパッチファイルの確認完了"
        Step2Title      = "実行中の Antigravity プロセスの安全な終了"
        Step2Skip       = "プロセス終了をスキップしました (-NoKill / -DryRun)"
        Step2Ok         = "プロセスの確認と終了が完了しました"
        Step3Title      = "オリジナル app.asar のバックアップ (app.asar.original)"
        Step3New        = "オリジナルファイルを app.asar.original にバックアップしました"
        Step3Keep       = "既存のバックアップ (app.asar.original) を保持します"
        Step4Title      = "多言語＆使用量ウィジェットパッチの適用"
        Step4Ok         = "パッチファイルが正常に適用されました"
        Step5Title      = "画面更新のためのキャッシュ整理 (Code Cache / GPUCache)"
        Step5Ok         = "キャッシュの整理が完了しました"
        InstallSuccess  = "成功！Antigravity 多言語＆上部使用量パッチの適用が完了しました。"
        FeatureHeader   = "主な機能のご案内"
        Feature1        = "アプリ内9言語切替: 設定 > 一般 > Language ドロップダウン"
        Feature2        = "クイック言語切替: Alt + Shift + L ショートカットまたは上部の🌐ボタン"
        Feature3        = "上部使用量表示: 右上のカプセルウィジェット＆モデル別詳細ポップオーバー"
        RollbackTitle   = "オリジナル状態の復元 (app.asar.original -> app.asar)"
        RollbackNoBak   = "バックアップファイル (app.asar.original) が見つかりません。"
        RollbackSuccess = "成功！Antigravity がオリジナルのクリーンな状態に復元されました。"
        ExitMsg         = "インストーラーを終了します。"
    }
    "zh-CN" = @{
        WindowTitle     = "Antigravity 多语言补丁安装向导"
        BannerSubtitle  = "多语言本地化与顶部配额小组件补丁 (支持 9 种语言)"
        MenuTitle       = "请选择要执行的操作"
        MenuInstall     = "[1] 安装 / 更新多语言补丁"
        MenuRestore     = "[2] 恢复为原始英文状态 (回滚)"
        MenuQuit        = "[Q] 退出 (Exit)"
        MenuPrompt      = "请输入选项 (1 / 2 / Q): "
        InvalidChoice   = "无效选项，请输入 1、2 或 Q。"
        Step1Title      = "正在检查 Antigravity 安装目录与补丁文件"
        Step1Ok         = "安装目录与补丁文件校验完成"
        Step2Title      = "正在安全关闭运行中的 Antigravity 进程"
        Step2Skip       = "已跳过关闭进程 (-NoKill / -DryRun)"
        Step2Ok         = "进程检查与关闭完成"
        Step3Title      = "正在备份原始 app.asar (app.asar.original)"
        Step3New        = "已将原始文件备份至 app.asar.original"
        Step3Keep       = "保留现有的原始备份 (app.asar.original)"
        Step4Title      = "正在应用多语言与配额小组件补丁"
        Step4Ok         = "补丁文件应用成功"
        Step5Title      = "正在清理渲染缓存 (Code Cache / Cache / GPUCache)"
        Step5Ok         = "渲染与网页缓存清理完成"
        InstallSuccess  = "成功！Antigravity 多语言与顶部配额补丁已安装完成。"
        FeatureHeader   = "主要功能说明"
        Feature1        = "应用内 9 语言切换：设置 > 常规 > Language 下拉菜单"
        Feature2        = "快速语言切换：按 Alt + Shift + L 快捷键或点击顶部 🌐 按钮"
        Feature3        = "顶部实时配额显示：右上角磨砂胶囊小组件与模型详情弹窗"
        RollbackTitle   = "正在恢复原始状态 (app.asar.original -> app.asar)"
        RollbackNoBak   = "未找到备份文件 (app.asar.original)。"
        RollbackSuccess = "成功！Antigravity 已恢复为原始纯净状态。"
        ExitMsg         = "正在退出安装向导。"
    }
    "zh-TW" = @{
        WindowTitle     = "Antigravity 多語言修補程式安裝精靈"
        BannerSubtitle  = "多語言在地化與頂部配額小工具修補程式 (支援 9 種語言)"
        MenuTitle       = "請選擇要執行的操作"
        MenuInstall     = "[1] 安裝 / 更新多語言修補程式"
        MenuRestore     = "[2] 還原為原始英文狀態 (回滾)"
        MenuQuit        = "[Q] 結束 (Exit)"
        MenuPrompt      = "請輸入選項 (1 / 2 / Q): "
        InvalidChoice   = "無效的選項，請輸入 1、2 或 Q。"
        Step1Title      = "正在檢查 Antigravity 安裝目錄與修補檔案"
        Step1Ok         = "安裝目錄與修補檔案確認完成"
        Step2Title      = "正在安全關閉執行中的 Antigravity 程序"
        Step2Skip       = "已略過關閉程序 (-NoKill / -DryRun)"
        Step2Ok         = "程序檢查與關閉完成"
        Step3Title      = "正在備份原始 app.asar (app.asar.original)"
        Step3New        = "已將原始檔案安全備份至 app.asar.original"
        Step3Keep       = "保留現有的原始備份 (app.asar.original)"
        Step4Title      = "正在套用多語言與配額小工具修補檔案"
        Step4Ok         = "修補檔案套用成功"
        Step5Title      = "正在清除渲染快取 (Code Cache / Cache / GPUCache)"
        Step5Ok         = "渲染與網頁快取清除完成"
        InstallSuccess  = "成功！Antigravity 多語言與頂部配額修補程式已安裝完成。"
        FeatureHeader   = "主要功能說明"
        Feature1        = "應用程式內 9 語言切換：設定 > 一般 > Language 下拉選單"
        Feature2        = "快速語言切換：按 Alt + Shift + L 快捷鍵或點擊頂部 🌐 按鈕"
        Feature3        = "頂部即時配額顯示：右上角霧面膠囊小工具與模型詳情彈出視窗"
        RollbackTitle   = "正在還原原始狀態 (app.asar.original -> app.asar)"
        RollbackNoBak   = "找不到備份檔案 (app.asar.original)。"
        RollbackSuccess = "成功！Antigravity 已還原為原始乾淨狀態。"
        ExitMsg         = "正在結束安裝精靈。"
    }
    "es" = @{
        WindowTitle     = "Asistente de Parche Multilingüe de Antigravity"
        BannerSubtitle  = "Localización Multilingüe y Widget Superior de Cuota (9 Idiomas)"
        MenuTitle       = "Seleccione una operación"
        MenuInstall     = "[1] Instalar / Actualizar el parche multilingüe"
        MenuRestore     = "[2] Restaurar al estado original limpio (Rollback)"
        MenuQuit        = "[Q] Salir (Exit)"
        MenuPrompt      = "Introduzca su opción (1 / 2 / Q): "
        InvalidChoice   = "Opción no válida. Introduzca 1, 2 o Q."
        Step1Title      = "Verificando ruta de Antigravity y archivo del parche"
        Step1Ok         = "Ruta de instalación y archivo verificados"
        Step2Title      = "Cerrando procesos activos de Antigravity de forma segura"
        Step2Skip       = "Cierre de procesos omitido (-NoKill / -DryRun)"
        Step2Ok         = "Procesos verificados y cerrados"
        Step3Title      = "Creando copia de seguridad original (app.asar.original)"
        Step3New        = "Copia de seguridad guardada en app.asar.original"
        Step3Keep       = "Se conserva la copia de seguridad existente (app.asar.original)"
        Step4Title      = "Aplicando paquete de localización y widget de cuota"
        Step4Ok         = "Parche aplicado correctamente"
        Step5Title      = "Limpiando cachés de renderizado (Code Cache / GPUCache)"
        Step5Ok         = "Cachés eliminadas correctamente"
        InstallSuccess  = "¡Éxito! El parche multilingüe y de cuota de Antigravity se ha instalado."
        FeatureHeader   = "Características Principales"
        Feature1        = "Cambio entre 9 idiomas: Ajustes > General > menú Language"
        Feature2        = "Cambio rápido: Atajo Alt + Shift + L o botón superior 🌐"
        Feature3        = "Cuota en la barra superior: Cápsula en tiempo real y desglose por modelo"
        RollbackTitle   = "Restaurando archivo original limpio (app.asar.original -> app.asar)"
        RollbackNoBak   = "No se encontró el archivo de respaldo (app.asar.original)."
        RollbackSuccess = "¡Éxito! Antigravity ha sido restaurado a su estado original."
        ExitMsg         = "Saliendo del asistente."
    }
    "fr" = @{
        WindowTitle     = "Assistant du Patch Multilingue Antigravity"
        BannerSubtitle  = "Localisation Multilingue & Widget de Quota Supérieur (9 Langues)"
        MenuTitle       = "Veuillez choisir une opération"
        MenuInstall     = "[1] Installer / Mettre à jour le patch multilingue"
        MenuRestore     = "[2] Restaurer l'état d'origine propre (Rollback)"
        MenuQuit        = "[Q] Quitter (Exit)"
        MenuPrompt      = "Entrez votre choix (1 / 2 / Q) : "
        InvalidChoice   = "Choix invalide. Veuillez entrer 1, 2 ou Q."
        Step1Title      = "Vérification du dossier Antigravity et de l'archive du patch"
        Step1Ok         = "Dossier d'installation et archive vérifiés"
        Step2Title      = "Fermeture sécurisée des processus Antigravity en cours"
        Step2Skip       = "Fermeture des processus ignorée (-NoKill / -DryRun)"
        Step2Ok         = "Processus vérifiés et arrêtés"
        Step3Title      = "Sauvegarde du fichier original (app.asar.original)"
        Step3New        = "Fichier original sauvegardé sous app.asar.original"
        Step3Keep       = "Sauvegarde originale existante (app.asar.original) conservée"
        Step4Title      = "Déploiement du patch multilingue et du widget de quota"
        Step4Ok         = "Archive du patch appliquée avec succès"
        Step5Title      = "Nettoyage des caches de rendu (Code Cache / GPUCache)"
        Step5Ok         = "Caches nettoyés avec succès"
        InstallSuccess  = "Succès ! Le patch multilingue et quota d'Antigravity est installé."
        FeatureHeader   = "Fonctionnalités Clés"
        Feature1        = "9 langues intégrées : Paramètres > Général > menu Language"
        Feature2        = "Changement rapide : Raccourci Alt + Shift + L ou bouton 🌐 en haut"
        Feature3        = "Affichage du quota en haut : Capsule temps réel et détails par modèle"
        RollbackTitle   = "Restauration de l'état d'origine (app.asar.original -> app.asar)"
        RollbackNoBak   = "Fichier de sauvegarde (app.asar.original) introuvable."
        RollbackSuccess = "Succès ! Antigravity a été restauré à son état d'origine."
        ExitMsg         = "Fermeture de l'assistant."
    }
    "de" = @{
        WindowTitle     = "Antigravity Mehrsprachiger Patch-Assistent"
        BannerSubtitle  = "Mehrsprachige Lokalisierung & Oberes Kontingent-Widget (9 Sprachen)"
        MenuTitle       = "Bitte wählen Sie eine Aktion"
        MenuInstall     = "[1] Mehrsprachigen Patch installieren / aktualisieren"
        MenuRestore     = "[2] Originalzustand wiederherstellen (Rollback)"
        MenuQuit        = "[Q] Beenden (Exit)"
        MenuPrompt      = "Auswahl eingeben (1 / 2 / Q): "
        InvalidChoice   = "Ungültige Auswahl. Bitte 1, 2 oder Q eingeben."
        Step1Title      = "Überprüfe Antigravity-Installationspfad und Patch-Archiv"
        Step1Ok         = "Installationspfad und Patch-Archiv bestätigt"
        Step2Title      = "Beende laufende Antigravity-Prozesse sicher"
        Step2Skip       = "Prozessbeendigung übersprungen (-NoKill / -DryRun)"
        Step2Ok         = "Prozesse überprüft und beendet"
        Step3Title      = "Sichere originale app.asar (app.asar.original)"
        Step3New        = "Originaldatei als app.asar.original gesichert"
        Step3Keep       = "Vorhandene Sicherung (app.asar.original) wird beibehalten"
        Step4Title      = "Wende Mehrsprachen- und Kontingent-Widget-Patch an"
        Step4Ok         = "Patch-Archiv erfolgreich angewendet"
        Step5Title      = "Bereinige Rendering-Caches (Code Cache / GPUCache)"
        Step5Ok         = "Rendering- und Web-Caches bereinigt"
        InstallSuccess  = "Erfolg! Der Antigravity Mehrsprachen- & Kontingent-Patch wurde installiert."
        FeatureHeader   = "Hauptfunktionen"
        Feature1        = "9 Sprachen in der App: Einstellungen > Allgemein > Language-Menü"
        Feature2        = "Schneller Sprachwechsel: Alt + Shift + L oder 🌐-Schaltfläche oben"
        Feature3        = "Kontingentanzeige oben: Echtzeit-Kapsel & Modell-Aufschlüsselung"
        RollbackTitle   = "Stelle Originalzustand wieder her (app.asar.original -> app.asar)"
        RollbackNoBak   = "Sicherungsdatei (app.asar.original) wurde nicht gefunden."
        RollbackSuccess = "Erfolg! Antigravity wurde in den sauberen Originalzustand zurückversetzt."
        ExitMsg         = "Assistent wird beendet."
    }
    "ru" = @{
        WindowTitle     = "Мастер мультиязычного патча Antigravity"
        BannerSubtitle  = "Мультиязычная локализация и верхний виджет квот (9 языков)"
        MenuTitle       = "Выберите действие"
        MenuInstall     = "[1] Установить / обновить мультиязычный патч"
        MenuRestore     = "[2] Восстановить исходное состояние (Откат / Rollback)"
        MenuQuit        = "[Q] Выход (Exit)"
        MenuPrompt      = "Введите ваш выбор (1 / 2 / Q): "
        InvalidChoice   = "Неверный выбор. Введите 1, 2 или Q."
        Step1Title      = "Проверка пути установки Antigravity и архива патча"
        Step1Ok         = "Путь установки и архив патча проверены"
        Step2Title      = "Безопасное завершение запущенных процессов Antigravity"
        Step2Skip       = "Завершение процессов пропущено (-NoKill / -DryRun)"
        Step2Ok         = "Проверка и завершение процессов выполнены"
        Step3Title      = "Резервное копирование исходного app.asar (app.asar.original)"
        Step3New        = "Исходный файл сохранен как app.asar.original"
        Step3Keep       = "Существующая резервная копия (app.asar.original) сохранена"
        Step4Title      = "Применение мультиязычного патча и виджета квот"
        Step4Ok         = "Архив патча успешно применен"
        Step5Title      = "Очистка кэша рендеринга (Code Cache / Cache / GPUCache)"
        Step5Ok         = "Кэш рендеринга успешно очищен"
        InstallSuccess  = "Успешно! Мультиязычный патч и виджет квот Antigravity установлены."
        FeatureHeader   = "Основные возможности"
        Feature1        = "9 языков в приложении: Настройки > Общие > меню Language"
        Feature2        = "Быстрое переключение: Alt + Shift + L или кнопка 🌐 в верхней панели"
        Feature3        = "Отображение квот сверху: капсула в реальном времени и детали по моделям"
        RollbackTitle   = "Восстановление исходного состояния (app.asar.original -> app.asar)"
        RollbackNoBak   = "Резервный файл (app.asar.original) не найден."
        RollbackSuccess = "Успешно! Antigravity восстановлен до чистого исходного состояния."
        ExitMsg         = "Выход из мастера установки."
    }
}

$CurrentLocale = Detect-InstallerLocale -OverrideLang $Lang
$L = $I18N[$CurrentLocale]
if (-not $L) { $L = $I18N["en"] }
$BannerSubtitle = $L.BannerSubtitle

try {
    $Host.UI.RawUI.WindowTitle = $L.WindowTitle
} catch {}

function Draw-Header {
    param([string]$Subtitle = $BannerSubtitle)
    try { Clear-Host } catch {}
    Write-Host ""
    $banner = @'
   ___        __  _                    _ __      
  / _ | ___  / /_(_)__ ________ __  __(_) /___ __
 / __ |/ _ \/ __/ / _ `/ __/ _ `/ |/ / / __/ // /
/_/ |_/_//_/\__/_/\_, /_/  \_,_/|___/_/\__/\_, / 
                 /___/                    /___/  
'@
    Write-Host $banner -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  ================================================================" -ForegroundColor DarkCyan
    Write-Host ("   " + $Subtitle) -ForegroundColor White
    Write-Host ("   Locale: " + $CurrentLocale + $(if ($DryRun) { " [DRY-RUN]" } else { "" })) -ForegroundColor DarkGray
    Write-Host "  ================================================================" -ForegroundColor DarkCyan
    Write-Host ""
}

function Write-Step {
    param([string]$Step, [string]$Message)
    Write-Host ("  [{0}] {1}..." -f $Step, $Message) -ForegroundColor Yellow
}

function Write-Ok {
    param([string]$Message)
    Write-Host ("        [OK] {0}" -f $Message) -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host ("        [i]  {0}" -f $Message) -ForegroundColor Gray
}

function Write-Err {
    param([string]$Message)
    Write-Host ""
    Write-Host ("  [ERROR] {0}" -f $Message) -ForegroundColor Red
}

function Resolve-TargetPaths {
    $targetDir = "$env:LOCALAPPDATA\Programs\Antigravity\resources"
    if (-not (Test-Path $targetDir)) {
        $altDir = "$env:LOCALAPPDATA\Programs\antigravity\resources"
        if (Test-Path $altDir) {
            $targetDir = $altDir
        }
    }
    $patchFile = Join-Path $PSScriptRoot "app.asar.patch"
    if (-not (Test-Path $patchFile)) {
        $altPatch = Join-Path $PSScriptRoot "app.asar.korean"
        if (Test-Path $altPatch) {
            $patchFile = $altPatch
        }
    }
    return @{
        TargetDir  = $targetDir
        TargetFile = Join-Path $targetDir "app.asar"
        BackupFile = Join-Path $targetDir "app.asar.original"
        PatchFile  = $patchFile
        CacheDirs  = @(
            "$env:APPDATA\Antigravity\Code Cache",
            "$env:APPDATA\Antigravity\Cache",
            "$env:APPDATA\Antigravity\GPUCache",
            "$env:APPDATA\antigravity\Code Cache",
            "$env:APPDATA\antigravity\Cache",
            "$env:APPDATA\antigravity\GPUCache"
        )
    }
}

function Invoke-PatchInstall {
    Draw-Header -Subtitle $L.BannerSubtitle
    $paths = Resolve-TargetPaths

    Write-Step "1/5" $L.Step1Title
    if (-not $DryRun) {
        if (-not (Test-Path $paths.TargetFile)) {
            Write-Err ("Target not found: " + $paths.TargetFile)
            exit 1
        }
        if (-not (Test-Path $paths.PatchFile)) {
            Write-Err ("Patch archive not found: " + $paths.PatchFile)
            exit 1
        }
    }
    Write-Ok $L.Step1Ok

    Write-Step "2/5" $L.Step2Title
    if (-not $NoKill -and -not $DryRun) {
        Get-Process -Name "Antigravity", "language_server" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Write-Ok $L.Step2Ok
    } else {
        Write-Info $L.Step2Skip
    }

    Write-Step "3/5" $L.Step3Title
    $backupFile = "$($paths.TargetDir)\app.asar.original"
    $targetFile = "$($paths.TargetDir)\app.asar"
    if (-not (Test-Path $backupFile)) {
        if (-not $DryRun) {
            Copy-Item $targetFile $backupFile -Force
        }
        Write-Ok $L.Step3New
    } else {
        Write-Info $L.Step3Keep
    }

    Write-Step "4/5" $L.Step4Title
    if (-not $DryRun) {
        Copy-Item -Path $paths.PatchFile -Destination $targetFile -Force
    }
    Write-Ok $L.Step4Ok

    Write-Step "5/5" $L.Step5Title
    if (-not $DryRun) {
        foreach ($dir in $paths.CacheDirs) {
            if (Test-Path $dir) {
                Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
    }
    Write-Ok $L.Step5Ok

    Write-Host ""
    Write-Host "  ================================================================" -ForegroundColor Green
    Write-Host ("   " + $L.InstallSuccess) -ForegroundColor Green
    Write-Host "  ================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host ("   [" + $L.FeatureHeader + "]") -ForegroundColor Cyan
    Write-Host ("    * " + $L.Feature1) -ForegroundColor White
    Write-Host ("    * " + $L.Feature2) -ForegroundColor White
    Write-Host ("    * " + $L.Feature3) -ForegroundColor White
    Write-Host ""
}

function Invoke-PatchRollback {
    Draw-Header -Subtitle $L.BannerSubtitle
    $paths = Resolve-TargetPaths
    $backupFile = "$($paths.TargetDir)\app.asar.original"
    $targetFile = "$($paths.TargetDir)\app.asar"

    Write-Step "1/3" $L.Step2Title
    if (-not $NoKill -and -not $DryRun) {
        Get-Process -Name "Antigravity", "language_server" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Write-Ok $L.Step2Ok
    } else {
        Write-Info $L.Step2Skip
    }

    Write-Step "2/3" $L.RollbackTitle
    if (-not (Test-Path "$($paths.TargetDir)\app.asar.original")) {
        if (-not (Test-Path $backupFile)) {
            if (-not $DryRun) {
                Write-Err ($L.RollbackNoBak + " (" + $backupFile + ")")
                exit 1
            } else {
                Write-Info ($L.RollbackNoBak + " [DryRun]")
            }
        }
    } else {
        if (-not $DryRun) {
            Copy-Item $backupFile $targetFile -Force
        }
        Write-Ok $L.RollbackSuccess
    }

    Write-Step "3/3" $L.Step5Title
    if (-not $DryRun) {
        foreach ($dir in $paths.CacheDirs) {
            if (Test-Path $dir) {
                Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
    }
    Write-Ok $L.Step5Ok

    Write-Host ""
    Write-Host "  ================================================================" -ForegroundColor Green
    Write-Host ("   " + $L.RollbackSuccess) -ForegroundColor Green
    Write-Host "  ================================================================" -ForegroundColor Green
    Write-Host ""
}

if ($Action -eq "Install") {
    Invoke-PatchInstall
    exit 0
}
elseif ($Action -eq "Rollback") {
    Invoke-PatchRollback
    exit 0
}
else {
    while ($true) {
        Draw-Header -Subtitle $L.BannerSubtitle
        Write-Host ("   " + $L.MenuTitle) -ForegroundColor Cyan
        Write-Host ""
        Write-Host ("    " + $L.MenuInstall) -ForegroundColor Green
        Write-Host ("    " + $L.MenuRestore) -ForegroundColor Yellow
        Write-Host ("    " + $L.MenuQuit) -ForegroundColor Gray
        Write-Host ""
        $choice = Read-Host ("   " + $L.MenuPrompt)
        if ($null -eq $choice) {
            Write-Host ("   " + $L.ExitMsg) -ForegroundColor Gray
            exit 0
        }
        $trimmed = $choice.Trim().ToUpperInvariant()
        if ($trimmed -eq "1") {
            Invoke-PatchInstall
            break
        }
        elseif ($trimmed -eq "2") {
            Invoke-PatchRollback
            break
        }
        elseif ($trimmed -eq "Q") {
            Write-Host ("   " + $L.ExitMsg) -ForegroundColor Gray
            exit 0
        }
        else {
            Write-Host ""
            Write-Host ("   [!] " + $L.InvalidChoice) -ForegroundColor Red
            Start-Sleep -Seconds 1
        }
    }
}
