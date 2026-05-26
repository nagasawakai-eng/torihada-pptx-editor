# pptx-editor サーバー再起動スクリプト
# 毎朝9時（JST）にWindowsタスクスケジューラから実行される

$serverDir = "C:\Users\長澤開\Downloads\pptx-editor"
$tunnelFile = "$serverDir\tunnel_url.txt"
$logFile = "$serverDir\restart-log.txt"

"[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] サーバー再起動開始" | Add-Content $logFile

# 既存のnode (server.js) プロセスを停止
$nodeProcs = Get-Process node -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*server.js*" -or $_.CommandLine -like "*pptx-editor*"
}
if ($nodeProcs) {
    $nodeProcs | Stop-Process -Force
    "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] nodeプロセス停止: $($nodeProcs.Count)件" | Add-Content $logFile
}

# 既存のcloudflaredプロセスを停止
$cloudflaredProcs = Get-Process cloudflared -ErrorAction SilentlyContinue
if ($cloudflaredProcs) {
    $cloudflaredProcs | Stop-Process -Force
    "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] cloudflaredプロセス停止" | Add-Content $logFile
}

Start-Sleep -Seconds 2

# tunnel_url.txt をクリア（新しいURLが書き込まれるまで待つため）
"" | Set-Content $tunnelFile

# サーバー起動（バックグラウンド）
$process = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $serverDir -WindowStyle Hidden -PassThru
"[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] nodeサーバー起動 PID: $($process.Id)" | Add-Content $logFile

# tunnel_url.txtに新しいURLが書き込まれるまで最大60秒待機
$maxWait = 60
$waited = 0
while ($waited -lt $maxWait) {
    Start-Sleep -Seconds 2
    $waited += 2
    $url = Get-Content $tunnelFile -ErrorAction SilentlyContinue
    if ($url -and $url.Trim().StartsWith("https://")) {
        "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] 新しいURL取得: $($url.Trim())" | Add-Content $logFile
        Write-Host "✅ エディターURL更新完了: $($url.Trim())"
        break
    }
}

if ($waited -ge $maxWait) {
    "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] タイムアウト: URLを取得できませんでした" | Add-Content $logFile
    Write-Host "⚠️ タイムアウト: URLを取得できませんでした"
}
